"""Deterministic platform services and an explicitly simulated ReplayLab adapter."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from .agents import RUNBOOKS, run_workflow
from .db import (
    AlertRow,
    AuditRow,
    EntityRow,
    EvaluationRow,
    IncidentRow,
    KnowledgeRow,
    RelationshipRow,
    ReplayRow,
    TelemetryRow,
)
from .schemas import (
    Evidence,
    IncidentRequest,
    IncidentResponse,
    MetricInput,
    RecoveryAction,
    Severity,
)

GRAPH_NODES = [
    ("orders-producer", "APPLICATION", "Orders producer", 2),
    ("broker-02", "KAFKA_BROKER", "broker-02", 3),
    ("orders.events", "KAFKA_TOPIC", "orders.events", 3),
    ("orders-consumer", "CONSUMER_GROUP", "orders-consumer", 3),
    ("order_stream_job", "SPARK_JOB", "order_stream_job", 3),
    ("fact_orders", "DATASET", "fact_orders", 3),
    ("revenue-dashboard", "DASHBOARD", "Revenue dashboard", 3),
]
GRAPH_EDGES = [
    ("orders-producer", "orders.events", "PRODUCES_TO"),
    ("broker-02", "orders.events", "HOSTED_ON"),
    ("orders.events", "orders-consumer", "FEEDS"),
    ("orders-consumer", "order_stream_job", "FEEDS"),
    ("order_stream_job", "fact_orders", "WRITES_TO"),
    ("fact_orders", "revenue-dashboard", "FEEDS"),
]

SCENARIOS = [
    {"id": "kafka_disk_pressure", "name": "Kafka broker disk pressure", "systems": ["Kafka", "Spark", "Data health"],
     "difficulty": "Intermediate", "expected_root_cause": "broker-02 storage pressure", "mode": "simulated"},
    {"id": "spark_executor_oom", "name": "Spark executor memory pressure", "systems": ["Spark", "Data health"],
     "difficulty": "Intermediate", "expected_root_cause": "executor memory pressure", "mode": "simulated"},
    {"id": "data_freshness_failure", "name": "Data freshness failure", "systems": ["Data health"],
     "difficulty": "Introductory", "expected_root_cause": "orders dataset stopped receiving records", "mode": "simulated"},
]

BASELINE_METRICS = [
    ("broker-02", "kafka_disk_percent", 47, "%"),
    ("orders.events", "kafka_isr_percent", 100, "%"),
    ("orders-consumer", "kafka_consumer_lag", 220, "records"),
    ("order_stream_job", "spark_input_delay_seconds", 2, "s"),
    ("fact_orders", "dataset_freshness_minutes", 2, "min"),
    ("order_stream_job", "spark_executor_memory_percent", 48, "%"),
    ("order_stream_job", "spark_gc_percent", 4, "%"),
]

RULES = {
    "kafka_disk_percent": (90, "above", Severity.p1, "Kafka broker disk pressure"),
    "kafka_isr_percent": (95, "below", Severity.p2, "Kafka in-sync replicas degraded"),
    "kafka_consumer_lag": (100_000, "above", Severity.p2, "Kafka consumer lag high"),
    "spark_input_delay_seconds": (60, "above", Severity.p2, "Spark input processing delayed"),
    "dataset_freshness_minutes": (15, "above", Severity.p2, "Dataset freshness SLA breached"),
    "spark_executor_memory_percent": (90, "above", Severity.p2, "Spark executor memory pressure"),
    "spark_gc_percent": (35, "above", Severity.p2, "Spark GC pressure"),
}


def audit(db: Session, tenant: str, event: str, *, actor: str = "system", incident_id: str | None = None,
          details: dict | None = None) -> None:
    db.add(AuditRow(tenant_id=tenant, incident_id=incident_id, actor=actor, event=event, payload=details or {}))


def seed_demo(db: Session, tenant: str) -> None:
    if db.scalar(select(EntityRow.id).where(EntityRow.tenant_id == tenant).limit(1)):
        return
    for entity_id, kind, name, criticality in GRAPH_NODES:
        db.add(EntityRow(id=f"{tenant}:{entity_id}", tenant_id=tenant, kind=kind, name=name,
                         criticality=criticality, payload={"demo": True, "status": "healthy"}))
    for source, target, kind in GRAPH_EDGES:
        db.add(RelationshipRow(tenant_id=tenant, source_id=f"{tenant}:{source}",
                               target_id=f"{tenant}:{target}", kind=kind))
    for technology, source, content, _ in RUNBOOKS:
        db.add(KnowledgeRow(tenant_id=tenant, title=source.rsplit("/", 1)[-1].removesuffix(".md").replace("_", " ").title(),
                            technology=technology.value, source=source, content=content))
    for entity, name, value, unit in BASELINE_METRICS:
        db.add(TelemetryRow(tenant_id=tenant, entity_id=f"{tenant}:{entity}", signal_type="metric",
                            name=name, numeric_value=value, payload={"unit": unit, "mode": "simulated", "value": value}))
    db.commit()


def latest_metrics(db: Session, tenant: str) -> list[dict]:
    rows = db.scalars(select(TelemetryRow).where(TelemetryRow.tenant_id == tenant,
                                                TelemetryRow.signal_type == "metric")
                      .order_by(TelemetryRow.observed_at.desc()).limit(500)).all()
    seen: set[tuple[str, str]] = set()
    out = []
    for row in rows:
        key = (row.entity_id, row.name)
        if key in seen:
            continue
        seen.add(key)
        out.append({"id": row.id, "entity_id": row.entity_id.removeprefix(f"{tenant}:"),
                    "name": row.name, "value": row.numeric_value, "unit": row.payload.get("unit", ""),
                    "observed_at": row.observed_at.isoformat(), "mode": row.payload.get("mode", "external")})
    return out


def _connected(db: Session, tenant: str, first: str, second: str) -> bool:
    if first == second:
        return True
    rows = db.scalars(select(RelationshipRow).where(RelationshipRow.tenant_id == tenant)).all()
    neighbors: dict[str, set[str]] = {}
    for row in rows:
        neighbors.setdefault(row.source_id, set()).add(row.target_id)
        neighbors.setdefault(row.target_id, set()).add(row.source_id)
    frontier, visited = [first], {first}
    while frontier:
        node = frontier.pop()
        for next_node in neighbors.get(node, ()):
            if next_node == second:
                return True
            if next_node not in visited:
                visited.add(next_node)
                frontier.append(next_node)
    return False


def get_incident(db: Session, tenant: str, incident_id: str) -> IncidentResponse | None:
    row = db.scalar(select(IncidentRow).where(IncidentRow.id == incident_id, IncidentRow.tenant_id == tenant))
    return IncidentResponse.model_validate(row.payload) if row else None


def save_incident(db: Session, incident: IncidentResponse) -> None:
    row = db.scalar(select(IncidentRow).where(IncidentRow.id == incident.incident_id,
                                              IncidentRow.tenant_id == incident.tenant_id))
    if row is None:
        row = IncidentRow(id=incident.incident_id, tenant_id=incident.tenant_id,
                          environment=incident.environment, status=incident.status,
                          severity=incident.severity.value, technology=incident.technology.value,
                          payload=incident.model_dump(mode="json"))
        db.add(row)
    else:
        row.payload = incident.model_dump(mode="json")
        row.status = incident.status
        row.severity = incident.severity.value
    db.flush()


def list_incidents(db: Session, tenant: str, *, limit: int = 50) -> list[IncidentResponse]:
    rows = db.scalars(select(IncidentRow).where(IncidentRow.tenant_id == tenant)
                      .order_by(IncidentRow.created_at.desc()).limit(min(limit, 100))).all()
    return [IncidentResponse.model_validate(row.payload) for row in rows]


def _new_incident_for_metric(metric: MetricInput, tenant: str, severity: Severity) -> IncidentResponse:
    if metric.name.startswith("kafka_"):
        description = "Kafka broker disk pressure with consumer lag and order pipeline delay"
        logs = "DiskErrorException broker-02" if "disk" in metric.name else ""
    elif metric.name.startswith("spark_"):
        description = "Spark executor memory pressure and order stream job delay"
        logs = "OutOfMemoryError order_stream_job" if "memory" in metric.name else ""
    else:
        description = "fact_orders dataset freshness SLA violation while infrastructure is healthy"
        logs = ""
    incident = run_workflow(IncidentRequest(description=description, logs=logs,
                                            metrics={metric.name: metric.value}, tenant_id=tenant))
    incident.incident_id = f"INC-{uuid4().hex[:8].upper()}"
    incident.severity = severity
    incident.affected_entities = [metric.entity_id]
    incident.recovery_actions.append(RecoveryAction(
        id="ACT-DEMO", action="Apply allowlisted ReplayLab recovery to simulated telemetry",
        rationale="Restore the simulated signal to its known healthy baseline and verify every symptom",
        risk="medium", dangerous=True, requires_approval=True))
    incident.approval_required = True
    return incident


def ingest_metric(db: Session, tenant: str, metric: MetricInput, *, mode: str = "external") -> dict:
    observed = datetime.fromisoformat(metric.observed_at.replace("Z", "+00:00")) if metric.observed_at else datetime.now(timezone.utc)
    row = TelemetryRow(tenant_id=tenant, entity_id=f"{tenant}:{metric.entity_id}", signal_type="metric",
                       name=metric.name, numeric_value=metric.value, observed_at=observed,
                       payload={"unit": metric.unit, "mode": mode, "value": metric.value,
                                "labels": metric.labels})
    db.add(row)
    db.flush()
    rule = RULES.get(metric.name)
    if not rule:
        return {"metric_id": row.id, "alert": None, "incident_id": None}
    threshold, direction, severity, message = rule
    breached = metric.value > threshold if direction == "above" else metric.value < threshold
    if not breached:
        return {"metric_id": row.id, "alert": None, "incident_id": None}
    recent = db.scalars(select(IncidentRow).where(IncidentRow.tenant_id == tenant,
                                                  IncidentRow.status == "investigating",
                                                  IncidentRow.created_at >= observed - timedelta(minutes=30))
                        .order_by(IncidentRow.created_at.desc()).limit(25)).all()
    attached = None
    for candidate in recent:
        related_alerts = db.scalars(select(AlertRow).where(AlertRow.tenant_id == tenant,
                                                           AlertRow.incident_id == candidate.id)).all()
        if any(_connected(db, tenant, item.entity_id, f"{tenant}:{metric.entity_id}") for item in related_alerts):
            attached = candidate
            break
    if attached:
        incident = IncidentResponse.model_validate(attached.payload)
        if metric.entity_id not in incident.affected_entities:
            incident.affected_entities.append(metric.entity_id)
        if int(severity.value[1:]) < int(incident.severity.value[1:]):
            incident.severity = severity
        incident.timeline.append({"at": observed.isoformat(), "event": message, "kind": "alert"})
    else:
        incident = _new_incident_for_metric(metric, tenant, severity)
        incident.timeline.append({"at": observed.isoformat(), "event": message, "kind": "alert"})
    save_incident(db, incident)
    alert = AlertRow(id=str(uuid4()), tenant_id=tenant, incident_id=incident.incident_id, rule_id=metric.name,
                     entity_id=f"{tenant}:{metric.entity_id}", severity=severity.value,
                     observed_at=observed, payload={"message": message, "observed_value": metric.value,
                                                    "threshold": threshold, "signal_id": row.id})
    db.add(alert)
    db.flush()
    incident.evidence.append(Evidence(id=f"METRIC-{row.id[:8]}", source=f"telemetry/{row.id}",
                                      kind="metric", snippet=f"{metric.name} = {metric.value} {metric.unit}",
                                      score=1.0, observed_at=observed.isoformat()))
    for affected in blast_radius(db, tenant, metric.entity_id):
        if affected["id"] not in incident.affected_entities:
            incident.affected_entities.append(affected["id"])
    incident.engineering_report = (f"Technology={incident.technology.value}; "
                                   f"evidence_count={len(incident.evidence)}; "
                                   f"affected_entities={len(incident.affected_entities)}; "
                                   f"approval_required={incident.approval_required}.")
    save_incident(db, incident)
    audit(db, tenant, "alert_detected", incident_id=incident.incident_id,
          details={"rule_id": metric.name, "entity_id": metric.entity_id, "alert_id": alert.id})
    return {"metric_id": row.id, "alert": {"id": alert.id, "rule_id": metric.name,
                                               "severity": severity.value, "message": message},
            "incident_id": incident.incident_id}


def blast_radius(db: Session, tenant: str, root: str) -> list[dict]:
    rows = db.scalars(select(RelationshipRow).where(RelationshipRow.tenant_id == tenant)).all()
    children: dict[str, list[str]] = {}
    for row in rows:
        children.setdefault(row.source_id, []).append(row.target_id)
    start = f"{tenant}:{root}"
    frontier, seen = [start], {start}
    while frontier:
        for child in children.get(frontier.pop(), []):
            if child not in seen:
                seen.add(child)
                frontier.append(child)
    entities = db.scalars(select(EntityRow).where(EntityRow.tenant_id == tenant,
                                                  EntityRow.id.in_(seen))).all()
    return [{"id": item.id.removeprefix(f"{tenant}:"), "name": item.name,
             "kind": item.kind, "criticality": item.criticality} for item in entities]


def start_replay(db: Session, tenant: str, scenario: str) -> dict:
    if scenario not in {item["id"] for item in SCENARIOS}:
        raise ValueError("Unknown ReplayLab scenario")
    active = db.scalar(select(ReplayRow.id).where(ReplayRow.tenant_id == tenant,
                                                 ReplayRow.status == "awaiting_approval").limit(1))
    if active:
        raise ValueError("Resolve or reject the active ReplayLab run before starting another")
    sequences = {
        "kafka_disk_pressure": [
            MetricInput(entity_id="broker-02", name="kafka_disk_percent", value=97.8, unit="%"),
            MetricInput(entity_id="orders.events", name="kafka_isr_percent", value=78, unit="%"),
            MetricInput(entity_id="orders-consumer", name="kafka_consumer_lag", value=2_400_000, unit="records"),
            MetricInput(entity_id="order_stream_job", name="spark_input_delay_seconds", value=141, unit="s"),
            MetricInput(entity_id="fact_orders", name="dataset_freshness_minutes", value=37, unit="min"),
        ],
        "spark_executor_oom": [
            MetricInput(entity_id="order_stream_job", name="spark_executor_memory_percent", value=98, unit="%"),
            MetricInput(entity_id="order_stream_job", name="spark_gc_percent", value=44, unit="%"),
            MetricInput(entity_id="order_stream_job", name="spark_input_delay_seconds", value=192, unit="s"),
        ],
        "data_freshness_failure": [
            MetricInput(entity_id="fact_orders", name="dataset_freshness_minutes", value=49, unit="min"),
        ],
    }
    run = ReplayRow(tenant_id=tenant, scenario=scenario, status="awaiting_approval",
                    payload={"mode": "simulated", "steps": []})
    db.add(run)
    db.flush()
    incident_id = None
    steps = []
    for metric in sequences[scenario]:
        detected = ingest_metric(db, tenant, metric, mode="simulated")
        incident_id = detected["incident_id"] or incident_id
        steps.append({"metric": metric.name, "value": metric.value, "alert": detected["alert"]})
    log_message = {"kafka_disk_pressure": "DiskErrorException broker-02: log directory unavailable",
                   "spark_executor_oom": "OutOfMemoryError order_stream_job executor lost",
                   "data_freshness_failure": "fact_orders did not receive expected records"}[scenario]
    db.add(TelemetryRow(tenant_id=tenant, entity_id=f"{tenant}:{sequences[scenario][0].entity_id}",
                        signal_type="log", name="fault_log", payload={"message": log_message,
                                                                         "mode": "simulated"}))
    db.add(TelemetryRow(tenant_id=tenant, entity_id=f"{tenant}:{sequences[scenario][0].entity_id}",
                        signal_type="event", name="fault_injected", payload={"message": f"ReplayLab started {scenario}",
                                                                               "mode": "simulated"}))
    run.incident_id = incident_id
    run.payload = {"mode": "simulated", "steps": steps,
                   "ground_truth": next(item["expected_root_cause"] for item in SCENARIOS if item["id"] == scenario)}
    audit(db, tenant, "replay_started", incident_id=incident_id, details={"scenario": scenario, "run_id": run.id})
    db.commit()
    return {"id": run.id, "scenario": scenario, "status": run.status, "incident_id": incident_id,
            "mode": "simulated", "steps": steps}


def verify_recovery(db: Session, tenant: str, incident: IncidentResponse,
                    *, scenario: str | None = None) -> dict:
    values = {item["name"]: item["value"] for item in latest_metrics(db, tenant)}
    required = {
        "kafka_disk_pressure": {"kafka_disk_percent": lambda v: v < 80,
                                "kafka_isr_percent": lambda v: v >= 100,
                                "kafka_consumer_lag": lambda v: v < 100_000,
                                "spark_input_delay_seconds": lambda v: v < 30,
                                "dataset_freshness_minutes": lambda v: v <= 5},
        "spark_executor_oom": {"spark_executor_memory_percent": lambda v: v < 80,
                               "spark_gc_percent": lambda v: v < 15,
                               "spark_input_delay_seconds": lambda v: v < 30},
        "data_freshness_failure": {"dataset_freshness_minutes": lambda v: v <= 5},
    }
    checks = {name: {"observed": values.get(name), "passed": name in values and predicate(values[name])}
              for name, predicate in required.get(scenario or "kafka_disk_pressure", {}).items()}
    passed = bool(checks) and all(item["passed"] for item in checks.values())
    incident.status = "resolved" if passed else "investigating"
    incident.timeline.append({"at": datetime.now(timezone.utc).isoformat(),
                              "event": "Recovery verified" if passed else "Recovery verification failed", "kind": "verification"})
    save_incident(db, incident)
    audit(db, tenant, "verification", incident_id=incident.incident_id, details={"checks": checks, "passed": passed})
    db.commit()
    return {"incident_id": incident.incident_id, "passed": passed, "checks": checks, "status": incident.status}


def execute_demo_recovery(db: Session, tenant: str, incident: IncidentResponse) -> dict:
    replay = db.scalar(select(ReplayRow).where(ReplayRow.tenant_id == tenant,
                                               ReplayRow.incident_id == incident.incident_id)
                       .order_by(ReplayRow.created_at.desc()))
    if replay is None:
        raise ValueError("Only ReplayLab incidents can use demo recovery")
    scenario = replay.scenario
    recovery = {
        "kafka_disk_pressure": [
            MetricInput(entity_id="broker-02", name="kafka_disk_percent", value=63, unit="%"),
            MetricInput(entity_id="orders.events", name="kafka_isr_percent", value=100, unit="%"),
            MetricInput(entity_id="orders-consumer", name="kafka_consumer_lag", value=8300, unit="records"),
            MetricInput(entity_id="order_stream_job", name="spark_input_delay_seconds", value=4, unit="s"),
            MetricInput(entity_id="fact_orders", name="dataset_freshness_minutes", value=3, unit="min"),
        ],
        "spark_executor_oom": [
            MetricInput(entity_id="order_stream_job", name="spark_executor_memory_percent", value=58, unit="%"),
            MetricInput(entity_id="order_stream_job", name="spark_gc_percent", value=7, unit="%"),
            MetricInput(entity_id="order_stream_job", name="spark_input_delay_seconds", value=4, unit="s"),
        ],
        "data_freshness_failure": [
            MetricInput(entity_id="fact_orders", name="dataset_freshness_minutes", value=3, unit="min"),
        ],
    }
    for metric in recovery[scenario]:
        ingest_metric(db, tenant, metric, mode="simulated")
    db.add(TelemetryRow(tenant_id=tenant, entity_id=f"{tenant}:{recovery[scenario][0].entity_id}",
                        signal_type="event", name="demo_recovery", payload={"message": f"Allowlisted simulated recovery executed for {scenario}",
                                                                              "mode": "simulated"}))
    result = verify_recovery(db, tenant, incident, scenario=scenario)
    replay.status = "completed" if result["passed"] else "failed_verification"
    replay.payload = {**replay.payload, "recovery": result}
    score = 1.0 if result["passed"] else 0.5
    db.add(EvaluationRow(tenant_id=tenant, replay_id=replay.id, score=score,
                         payload={"detection": True, "correlation": True,
                                  "approval_required": True, "verification": result["passed"],
                                  "mode": "simulated"}))
    audit(db, tenant, "demo_recovery_executed", incident_id=incident.incident_id,
          details={"scenario": scenario, "verification_passed": result["passed"]})
    db.commit()
    return {"run_id": replay.id, "action": "demo_recovery", "mode": "simulated", "verification": result}
