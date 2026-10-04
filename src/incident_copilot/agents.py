import hashlib
import re
from datetime import datetime, timezone

from .safety import redact_sensitive, requires_approval
from .schemas import (
    Evidence,
    IncidentRequest,
    IncidentResponse,
    RecoveryAction,
    Severity,
    Technology,
)

RUNBOOKS = [
    (Technology.kafka, "runbooks/kafka_disk_pressure.md", "Kafka DiskErrorException commonly indicates broker volume pressure or failed log directory.", 0.92),
    (Technology.hdfs, "runbooks/hdfs_safe_mode.md", "HDFS safe mode after NameNode restart blocks writes until under-replicated blocks recover.", 0.88),
    (Technology.spark, "runbooks/spark_executor_loss.md", "Spark executor loss with container killed messages often maps to memory overhead pressure.", 0.86),
    (Technology.nifi, "runbooks/nifi_backpressure.md", "NiFi queues applying backpressure can stop upstream processors and increase flow-file age.", 0.83),
    (Technology.kudu, "runbooks/kudu_tablet_unavailable.md", "Kudu tablet unavailable errors require checking tablet-server health and consensus state.", 0.82),
    (Technology.api, "runbooks/api_5xx.md", "API 5xx spikes should be correlated with dependency latency and recent deployments.", 0.80),
    (Technology.data, "runbooks/data_freshness.md", "Dataset freshness failure can occur while infrastructure is healthy; inspect record arrival, upstream lag and ingestion checkpoints.", 0.87),
]

KEYWORDS = {
    Technology.kafka: ("kafka", "broker", "consumer lag", "offset", "diskerrorexception", "orders.events"),
    Technology.hdfs: ("hdfs", "namenode", "datanode", "safe mode", "under-replicated"),
    Technology.spark: ("spark", "executor", "driver", "yarn", "outofmemory", "order_stream_job"),
    Technology.nifi: ("nifi", "processor", "flowfile", "backpressure"),
    Technology.kudu: ("kudu", "tablet", "tserver", "consensus"),
    Technology.api: ("api", "http", "5xx", "gateway", "timeout"),
    Technology.data: ("dataset", "freshness", "schema drift", "missing partition", "null rate"),
}


def triage(text: str) -> tuple[Technology, float]:
    lowered = text.lower()
    scores = {tech: sum(1 for word in words if word in lowered) for tech, words in KEYWORDS.items()}
    tech, score = max(scores.items(), key=lambda item: item[1])
    return (tech, min(0.99, 0.55 + score * 0.12)) if score else (Technology.unknown, 0.2)


def analyze_logs(logs: str) -> list[str]:
    patterns = re.findall(r"(?i)([A-Z][A-Za-z0-9]*(?:Exception|Error)|safe mode|backpressure|timeout|outofmemory)", logs)
    return sorted(set(patterns))[:10]


def retrieve(technology: Technology, text: str) -> list[Evidence]:
    terms = {term for term in re.findall(r"[a-z0-9_]+", text.lower()) if len(term) >= 4}
    ranked: list[Evidence] = []
    for index, (tech, source, snippet, base_score) in enumerate(RUNBOOKS, start=1):
        candidate_terms = set(re.findall(r"[a-z0-9_]+", f"{snippet} {source}".lower()))
        overlap = len(terms & candidate_terms)
        if tech is technology or (technology is Technology.unknown and overlap >= 2):
            ranked.append(Evidence(id=f"KB-{index:03d}", source=source, snippet=snippet,
                                   score=min(0.99, base_score + overlap * 0.01)))
    return sorted(ranked, key=lambda evidence: evidence.score, reverse=True)[:5]


def _action(action_id: str, text: str, rationale: str, *, risk: str = "low") -> RecoveryAction:
    approval = requires_approval(text) or risk in {"medium", "high", "critical"}
    return RecoveryAction(id=action_id, action=text, rationale=rationale, risk=risk,
                          dangerous=approval, requires_approval=approval)


def remediate(technology: Technology, findings: list[str]) -> list[RecoveryAction]:
    actions = [_action("ACT-001", "Collect current health status using read-only checks",
                       "Establish current blast radius before changing state")]
    if technology is Technology.kafka:
        actions += [
            _action("ACT-002", "Check broker disk usage and offline log directories", "Validate the storage hypothesis"),
            _action("ACT-003", "Review consumer lag, ISR, and affected topic health", "Measure downstream impact"),
            _action("ACT-004", "Restart affected Kafka broker after human approval", "Restart may rebalance partitions and affect clients", risk="high"),
        ]
    elif technology is Technology.spark:
        actions += [_action("ACT-002", "Inspect failed stages, executor memory, and GC metrics", "Confirm executor pressure before changing job settings")]
    elif technology is Technology.hdfs:
        actions += [_action("ACT-002", "Verify NameNode safe mode and under-replicated block counts", "Write failures often follow safe mode or replication issues")]
    elif technology is not Technology.unknown:
        actions += [_action("ACT-002", f"Follow {technology.value} runbook validation steps", "Use technology-specific read-only checks")]
    return actions


def _severity(technology: Technology, text: str, metrics: dict) -> Severity:
    lowered = text.lower()
    if any(word in lowered for word in ("outage", "unavailable", "production down", "critical")):
        return Severity.p1
    if technology is Technology.kafka and any("disk" in k.lower() and float(v) >= 90 for k, v in metrics.items() if isinstance(v, (int, float))):
        return Severity.p1
    if any(word in lowered for word in ("lag", "delay", "stale", "backpressure", "error")):
        return Severity.p2
    return Severity.p3 if technology is not Technology.unknown else Severity.p4


def run_workflow(request: IncidentRequest) -> IncidentResponse:
    safe_description = redact_sensitive(request.description)
    safe_logs = redact_sensitive(request.logs)
    safe_metrics = {key: redact_sensitive(str(value)) for key, value in request.metrics.items()}
    text = f"{safe_description}\n{safe_logs}\n{safe_metrics}"
    technology, confidence = triage(text)
    findings = analyze_logs(safe_logs)
    evidence = retrieve(technology, text)
    observed_at = datetime.now(timezone.utc).isoformat()
    for index, (name, value) in enumerate(safe_metrics.items(), start=1):
        evidence.append(Evidence(id=f"METRIC-{index:03d}", source=f"request.metrics.{name}", kind="metric",
                                snippet=f"Observed {name} = {value}", score=1.0, observed_at=observed_at))
    for index, finding in enumerate(findings, start=1):
        evidence.append(Evidence(id=f"LOG-{index:03d}", source="request.logs", kind="log",
                                snippet=f"Log signature observed: {finding}", score=0.95, observed_at=observed_at))
    actions = remediate(technology, findings)
    root_causes = [evidence[0].snippet] if confidence >= 0.5 and evidence else ["insufficient_evidence"]
    approval_required = any(action.requires_approval for action in actions)
    now = datetime.now(timezone.utc).isoformat()
    incident_id = "INC-" + hashlib.sha256(f"{request.tenant_id}:{text}".encode()).hexdigest()[:8].upper()
    severity = _severity(technology, text, request.metrics)
    entities: list[str] = []
    for entity in re.findall(r"\b(?:broker[-_ ]?\d+|[a-z][a-z0-9_.-]*(?:topic|job|table|dataset))\b", text, re.I):
        if entity.lower() not in {e.lower() for e in entities}:
            entities.append(entity)
    timeline = [{"at": now, "event": "Investigation started", "kind": "system"}]
    timeline += [{"at": now, "event": f"Evidence gathered: {item.id}", "kind": "evidence", "evidence_id": item.id} for item in evidence]
    timeline.append({"at": now, "event": "Root cause hypothesis generated", "kind": "hypothesis"})
    summary = (f"{severity.value} {technology.value} incident; evidence-backed investigation is "
               f"{'ready for review' if evidence else 'inconclusive'}. "
               f"{'A high-risk action requires approval.' if approval_required else 'Only read-only next steps are proposed.'}")
    return IncidentResponse(
        incident_id=incident_id, technology=technology, severity=severity, confidence=confidence,
        environment=request.environment, tenant_id=request.tenant_id, likely_root_causes=root_causes,
        evidence=evidence, recovery_actions=actions, approval_required=approval_required,
        affected_entities=entities, timeline=timeline,
        engineering_report=f"Technology={technology.value}; findings={findings or ['none']}; evidence_count={len(evidence)}; approval_required={approval_required}.",
        executive_summary=summary,
    )
