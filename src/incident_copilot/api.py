from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException

from .agents import run_workflow
from .schemas import ApprovalDecision, IncidentRequest, IncidentResponse, Signal, VerificationRequest

app = FastAPI(
    title="InvestiNator API",
    summary="Evidence-first observability, investigation, and controlled remediation for DataOps.",
    version="0.2.0",
)

# Demo storage only. Replace with a tenant-scoped durable repository before deployment.
INCIDENTS: dict[str, IncidentResponse] = {}
AUDIT_LOG: list[dict[str, Any]] = []


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "product": "InvestiNator", "mode": "reference-demo"}


@app.get("/command-center")
async def command_center(tenant_id: str = "demo") -> dict[str, Any]:
    return {
        "product": "InvestiNator",
        "overall_health": {"score": 91, "mode": "sample"},
        "services": [
            {"name": "Kafka", "status": "healthy"}, {"name": "Spark", "status": "warning"},
            {"name": "HDFS", "status": "healthy"}, {"name": "NiFi", "status": "healthy"},
            {"name": "Kudu", "status": "healthy"},
        ],
        "active_incidents": [item.model_dump(mode="json") for item in INCIDENTS.values() if item.tenant_id == tenant_id],
        "business_impact": {"delayed_datasets": 1 if any(item.tenant_id == tenant_id for item in INCIDENTS.values()) else 0, "affected_dashboards": 0,
                            "customer_sla_at_risk": False, "mode": "sample"},
        "operations": {"mttd": None, "mtti": None, "mttr": None},
        "notice": "Service health and business-impact figures are illustrative until integrations are configured.",
    }


@app.get("/pulse")
async def pulse() -> dict[str, Any]:
    return {"signals": [], "sources": [], "mode": "unconfigured",
            "message": "Connect OpenTelemetry, Prometheus, or a log backend to ingest live telemetry."}


@app.get("/nerve-map")
async def nerve_map() -> dict[str, Any]:
    nodes = [
        {"id": "orders-producer", "type": "application", "name": "Orders Producer"},
        {"id": "orders-events", "type": "kafka_topic", "name": "orders.events"},
        {"id": "order-stream", "type": "spark_job", "name": "order_stream_job"},
        {"id": "fact-orders", "type": "dataset", "name": "fact_orders"},
        {"id": "revenue-dashboard", "type": "dashboard", "name": "Revenue Dashboard"},
    ]
    edges = [{"from": a, "to": b, "relationship": "FEEDS"} for a, b in zip(
        ["orders-producer", "orders-events", "order-stream", "fact-orders"],
        ["orders-events", "order-stream", "fact-orders", "revenue-dashboard"],
    )]
    return {"nodes": nodes, "edges": edges, "mode": "illustrative-seed-graph",
            "message": "Replace seed topology with discovered infrastructure and lineage."}


@app.get("/explore")
async def explore() -> dict[str, Any]:
    return {"tabs": ["logs", "metrics", "traces", "events", "data"], "queries": [],
            "mode": "unconfigured", "message": "No telemetry backend is connected."}


@app.get("/ai/health")
async def ai_health() -> dict[str, Any]:
    return {"investigations": len(INCIDENTS), "model_calls": 0, "tool_calls": 0,
            "tool_success_rate": None, "grounded_answer_rate": None,
            "blocked_unsafe_actions": sum(1 for row in AUDIT_LOG if row.get("event") == "approval_required"),
            "mode": "deterministic-fallback", "message": "Configure an AI gateway before enabling model calls."}


@app.post("/incidents/analyze", response_model=IncidentResponse)
async def analyze_incident(request: IncidentRequest) -> IncidentResponse:
    incident = run_workflow(request)
    INCIDENTS[incident.incident_id] = incident
    AUDIT_LOG.append({"at": datetime.now(timezone.utc).isoformat(), "event": "investigation_created",
                      "incident_id": incident.incident_id, "tenant_id": incident.tenant_id})
    if incident.approval_required:
        AUDIT_LOG.append({"at": datetime.now(timezone.utc).isoformat(), "event": "approval_required",
                          "incident_id": incident.incident_id, "tenant_id": incident.tenant_id})
    return incident


@app.get("/incidents", response_model=list[IncidentResponse])
async def list_incidents(tenant_id: str = "demo") -> list[IncidentResponse]:
    return [item for item in INCIDENTS.values() if item.tenant_id == tenant_id]


@app.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: str, tenant_id: str = "demo") -> IncidentResponse:
    incident = INCIDENTS.get(incident_id)
    if incident is None or incident.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/incidents/{incident_id}/actions/{action_id}/approval")
async def decide_approval(incident_id: str, action_id: str, decision: ApprovalDecision,
                          tenant_id: str = "demo") -> dict[str, Any]:
    incident = INCIDENTS.get(incident_id)
    if incident is None or incident.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    action = next((item for item in incident.recovery_actions if item.id == action_id), None)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found")
    if not action.requires_approval:
        raise HTTPException(status_code=409, detail="This action does not require approval")
    if action.status != "proposed":
        raise HTTPException(status_code=409, detail="This action already has a decision")
    action.status = "approved" if decision.decision == "approve" else "rejected"
    AUDIT_LOG.append({"at": datetime.now(timezone.utc).isoformat(), "event": "approval_decision",
                      "incident_id": incident_id, "action_id": action_id, "tenant_id": tenant_id,
                      "decision": decision.decision, "decided_by": decision.decided_by,
                      "reason": decision.reason})
    return {"incident_id": incident_id, "action_id": action_id, "status": action.status,
            "execution": "not_configured"}


@app.post("/incidents/{incident_id}/verify")
async def verify_incident(incident_id: str, request: VerificationRequest,
                          tenant_id: str = "demo") -> dict[str, Any]:
    incident = INCIDENTS.get(incident_id)
    if incident is None or incident.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Incident not found")
    normalized = {key.lower(): value for key, value in request.checks.items()}
    checks: dict[str, bool] = {}
    if "disk_percent" in normalized:
        checks["disk_percent"] = isinstance(normalized["disk_percent"], (int, float)) and normalized["disk_percent"] < 80
    if "consumer_lag" in normalized:
        checks["consumer_lag"] = isinstance(normalized["consumer_lag"], (int, float)) and normalized["consumer_lag"] < 100_000
    if "isr_percent" in normalized:
        checks["isr_percent"] = isinstance(normalized["isr_percent"], (int, float)) and normalized["isr_percent"] >= 100
    if not checks:
        raise HTTPException(status_code=422, detail="Provide disk_percent, consumer_lag, or isr_percent checks")
    resolved = all(checks.values())
    if resolved:
        incident.status = "resolved"
    else:
        incident.status = "investigating"
    AUDIT_LOG.append({"at": datetime.now(timezone.utc).isoformat(), "event": "verification",
                      "incident_id": incident_id, "tenant_id": tenant_id, "verified_by": request.verified_by,
                      "checks": checks, "status": incident.status})
    return {"incident_id": incident_id, "status": incident.status, "checks": checks,
            "verified_by": request.verified_by,
            "message": "Symptoms verified recovered." if resolved else "Recovery not verified; continue investigation."}


@app.post("/signals/correlate")
async def correlate_signals(signals: list[Signal]) -> dict[str, Any]:
    if not signals:
        return {"groups": [], "incidents_created": 0}
    by_entity: dict[str, list[Signal]] = defaultdict(list)
    for signal in signals:
        by_entity[signal.entity.lower()].append(signal)
    # Signals sharing an entity are grouped into one alert cluster. Cross-entity dependency
    # correlation is intentionally left to the topology-aware correlation service.
    groups = []
    for entity, members in by_entity.items():
        groups.append({"group_id": f"GRP-{len(groups) + 1:03d}", "entities": [entity],
                       "signal_ids": [item.id for item in members],
                       "technology": members[0].source, "count": len(members),
                       "severity": min((item.severity for item in members), key=lambda s: int(s.value[1:]))})
    return {"groups": groups, "incidents_created": 0,
            "message": "Alert groups are suggestions; no incident is auto-created from untrusted signals."}


@app.get("/audit")
async def audit(tenant_id: str = "demo") -> list[dict[str, Any]]:
    return [row for row in AUDIT_LOG if row.get("tenant_id") == tenant_id]
