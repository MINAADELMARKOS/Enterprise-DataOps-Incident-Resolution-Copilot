import re
from .schemas import Evidence, IncidentRequest, IncidentResponse, RecoveryAction, Technology
from .safety import redact_sensitive, requires_approval

RUNBOOKS = [
    Evidence(source="runbooks/kafka_disk_pressure.md", snippet="Kafka DiskErrorException commonly indicates broker volume pressure or failed log directory.", score=0.92),
    Evidence(source="runbooks/hdfs_safe_mode.md", snippet="HDFS safe mode after NameNode restart blocks writes until under-replicated blocks recover.", score=0.88),
    Evidence(source="runbooks/spark_executor_loss.md", snippet="Spark executor loss with container killed messages often maps to memory overhead pressure.", score=0.86),
    Evidence(source="runbooks/nifi_backpressure.md", snippet="NiFi queues applying backpressure can stop upstream processors and increase flow-file age.", score=0.83),
    Evidence(source="runbooks/kudu_tablet_unavailable.md", snippet="Kudu tablet unavailable errors require checking tablet-server health and consensus state.", score=0.82),
    Evidence(source="runbooks/api_5xx.md", snippet="API 5xx spikes should be correlated with dependency latency and recent deployments.", score=0.80),
]

KEYWORDS = {
    Technology.kafka: ("kafka", "broker", "consumer lag", "offset", "diskerrorexception"),
    Technology.hdfs: ("hdfs", "namenode", "datanode", "safe mode", "under-replicated"),
    Technology.spark: ("spark", "executor", "driver", "yarn", "outofmemory"),
    Technology.nifi: ("nifi", "processor", "flowfile", "backpressure"),
    Technology.kudu: ("kudu", "tablet", "tserver", "consensus"),
    Technology.api: ("api", "http", "5xx", "gateway", "timeout"),
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
    terms = set(text.lower().split()) | {technology.value.lower()}
    ranked = []
    for doc in RUNBOOKS:
        overlap = sum(1 for term in terms if term and term in doc.snippet.lower())
        if technology.value.lower() in doc.source or overlap:
            ranked.append(doc.model_copy(update={"score": min(0.99, doc.score + overlap * 0.01)}))
    return sorted(ranked, key=lambda evidence: evidence.score, reverse=True)[:5]

def remediate(technology: Technology, findings: list[str]) -> list[RecoveryAction]:
    actions = [RecoveryAction(action="Collect current health status using read-only checks", rationale="Establish current blast radius before changing state")]
    if technology is Technology.kafka:
        actions += [
            RecoveryAction(action="Check broker disk usage and offline log directories", rationale="Disk pressure matches Kafka broker failure patterns"),
            RecoveryAction(action="Restart affected Kafka broker after human approval", dangerous=True, requires_approval=True, rationale="Restart may rebalance partitions and affect clients"),
        ]
    elif technology is Technology.hdfs:
        actions.append(RecoveryAction(action="Verify NameNode safe mode and under-replicated block counts", rationale="Write failures often follow safe mode or replication issues"))
    else:
        actions.append(RecoveryAction(action=f"Follow {technology.value} runbook validation steps", rationale="Technology-specific evidence was found"))
    return [action.model_copy(update={"requires_approval": action.requires_approval or requires_approval(action.action)}) for action in actions]

def run_workflow(request: IncidentRequest) -> IncidentResponse:
    safe_description = redact_sensitive(request.description)
    safe_logs = redact_sensitive(request.logs)
    text = f"{safe_description}\n{safe_logs}"
    technology, confidence = triage(text)
    findings = analyze_logs(safe_logs)
    evidence = retrieve(technology, text)
    actions = remediate(technology, findings)
    root_causes = ["insufficient_evidence"] if confidence < 0.5 or not evidence else [evidence[0].snippet]
    approval_required = any(action.requires_approval for action in actions)
    return IncidentResponse(
        technology=technology,
        confidence=confidence,
        likely_root_causes=root_causes,
        evidence=evidence,
        recovery_actions=actions,
        approval_required=approval_required,
        engineering_report=f"Technology={technology.value}; findings={findings or ['none']}; evidence_count={len(evidence)}; approval_required={approval_required}.",
        executive_summary=f"The incident appears related to {technology.value} with confidence {confidence:.0%}. Risk controls {'require approval' if approval_required else 'allow read-only next steps'}.",
    )
