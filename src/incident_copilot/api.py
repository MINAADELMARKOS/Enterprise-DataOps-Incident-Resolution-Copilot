"""InvestiNator API. Demo identity is fixed server-side; production needs OIDC."""

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from opentelemetry import trace
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .agents import run_workflow
from .ai_gateway import investigate
from .config import get_settings
from .db import (
    AIUsageRow,
    AlertRow,
    ApprovalRow,
    AuditRow,
    ConversationRow,
    EntityRow,
    EvaluationRow,
    IncidentRow,
    KnowledgeRow,
    MessageRow,
    RelationshipRow,
    ReplayRow,
    TelemetryRow,
    init_demo_db,
    session,
)
from .kafka_adapter import kafka_health
from .observability import instrument_api
from .safety import redact_sensitive
from .schemas import (
    ApprovalDecision,
    ChatMessage,
    IncidentRequest,
    IncidentResponse,
    MetricInput,
    ReplayStart,
    VerificationRequest,
)
from .services import (
    SCENARIOS,
    audit,
    blast_radius,
    execute_demo_recovery,
    get_incident,
    ingest_metric,
    latest_metrics,
    list_incidents,
    save_incident,
    seed_demo,
    start_replay,
    verify_recovery,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if get_settings().demo_mode:
        init_demo_db()
        with session() as db:
            seed_demo(db, get_settings().demo_tenant)
    yield


app = FastAPI(title="InvestiNator API", version="0.3.0", lifespan=lifespan,
              summary="See the signal. Find the cause. Fix with confidence.")
app.add_middleware(CORSMiddleware, allow_origins=list(get_settings().cors_origins),
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type", "X-Request-ID"])
instrument_api(app)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    span = trace.get_current_span()
    if span.get_span_context().is_valid:
        response.headers["X-Trace-ID"] = format(span.get_span_context().trace_id, "032x")
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


def db_session():
    with session() as db:
        yield db


def demo_identity() -> tuple[str, str]:
    settings = get_settings()
    if not settings.demo_mode:
        raise HTTPException(status_code=503, detail="OIDC identity provider is required when demo mode is disabled")
    return settings.demo_tenant, "demo.senior_sre"


def require_incident(db: Session, tenant: str, incident_id: str) -> IncidentResponse:
    incident = get_incident(db, tenant, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get("/health")
@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok", "product": "InvestiNator",
            "mode": "simulated-demo" if get_settings().demo_mode else "not_configured"}


@app.get("/api/v1/about")
def about() -> dict:
    settings = get_settings()
    return {"product": "InvestiNator", "tagline": "See the signal. Find the cause. Fix with confidence.",
            "statement": "AI-powered DataOps Observability, Investigation & Controlled Remediation Platform",
            "creator": {"name": settings.creator_name, "title": settings.creator_title,
                        "github_url": settings.github_url, "linkedin_url": settings.linkedin_url,
                        "portfolio_url": settings.portfolio_url or None}}


@app.get("/api/v1/platform/health")
@app.get("/command-center")
def platform_health(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    metrics = latest_metrics(db, tenant)
    values = {item["name"]: item["value"] for item in metrics}
    active = [item for item in list_incidents(db, tenant) if item.status != "resolved"]
    kafka_bad = values.get("kafka_disk_percent", 0) >= 90 or values.get("kafka_isr_percent", 100) < 95
    spark_bad = values.get("spark_executor_memory_percent", 0) >= 90 or values.get("spark_input_delay_seconds", 0) > 60
    data_bad = values.get("dataset_freshness_minutes", 0) > 15
    services = [{"name": "Kafka", "status": "degraded" if kafka_bad else "healthy", "score": 48 if kafka_bad else 99},
                {"name": "Spark", "status": "degraded" if spark_bad else "healthy", "score": 62 if spark_bad else 98},
                {"name": "Data health", "status": "degraded" if data_bad else "healthy", "score": 39 if data_bad else 98}]
    return {"product": "InvestiNator", "mode": "simulated-demo", "overall_health":
            {"score": round(sum(int(item["score"]) for item in services) / len(services))},
            "services": services, "active_incidents": [item.model_dump(mode="json") for item in active],
            "active_p1": len([item for item in active if item.severity.value == "P1"]),
            "active_p2": len([item for item in active if item.severity.value == "P2"]),
            "systems_degraded": len([item for item in services if item["status"] == "degraded"]),
            "datasets_delayed": 1 if data_bad else 0,
            "business_impact": {"affected_dashboards": 1 if data_bad else 0,
                                "slo_at_risk": bool(data_bad), "mode": "simulated"},
            "operations": {"mttd_seconds": None, "mtti_seconds": None, "mttr_seconds": None,
                           "alert_compression_ratio": None}}


@app.get("/api/v1/telemetry/metrics")
@app.get("/pulse")
def metrics(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    return {"items": latest_metrics(db, identity[0]), "mode": "simulated-demo"}


@app.post("/api/v1/telemetry/metrics")
def post_metric(metric: MetricInput, identity: tuple[str, str] = Depends(demo_identity),
                db: Session = Depends(db_session)) -> dict:
    result = ingest_metric(db, identity[0], metric, mode="demo-api")
    db.commit()
    return result


@app.get("/api/v1/telemetry/{signal_type}")
def telemetry(signal_type: str, limit: int = Query(50, ge=1, le=200),
              identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    if signal_type not in {"logs", "events", "traces"}:
        raise HTTPException(status_code=404, detail="Unknown telemetry signal")
    kind = signal_type[:-1] if signal_type != "traces" else "trace"
    rows = db.scalars(select(TelemetryRow).where(TelemetryRow.tenant_id == identity[0],
                                                TelemetryRow.signal_type == kind)
                      .order_by(TelemetryRow.observed_at.desc()).limit(limit)).all()
    return {"items": [{"id": row.id, "entity_id": row.entity_id.removeprefix(f"{identity[0]}:"),
                       "observed_at": row.observed_at.isoformat(), **row.payload} for row in rows],
            "mode": "simulated-demo"}


@app.get("/api/v1/topology")
@app.get("/nerve-map")
def topology(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    nodes = db.scalars(select(EntityRow).where(EntityRow.tenant_id == tenant)).all()
    edges = db.scalars(select(RelationshipRow).where(RelationshipRow.tenant_id == tenant)).all()
    return {"nodes": [{"id": row.id.removeprefix(f"{tenant}:"), "name": row.name,
                       "type": row.kind, "criticality": row.criticality} for row in nodes],
            "edges": [{"from": row.source_id.removeprefix(f"{tenant}:"),
                       "to": row.target_id.removeprefix(f"{tenant}:"), "relationship": row.kind} for row in edges],
            "mode": "simulated-demo"}


@app.get("/api/v1/topology/{entity_id}/blast-radius")
def impact(entity_id: str, identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    return {"root": entity_id, "downstream": blast_radius(db, identity[0], entity_id), "mode": "simulated-demo"}


@app.get("/api/v1/alerts")
def alerts(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(AlertRow).where(AlertRow.tenant_id == identity[0])
                      .order_by(AlertRow.observed_at.desc()).limit(100)).all()
    return [{"id": row.id, "incident_id": row.incident_id, "rule_id": row.rule_id,
             "entity_id": row.entity_id.removeprefix(f"{identity[0]}:"), "severity": row.severity,
             "observed_at": row.observed_at.isoformat(), **row.payload} for row in rows]


@app.get("/api/v1/incidents")
@app.get("/incidents", response_model=list[IncidentResponse])
def incidents(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[IncidentResponse]:
    return list_incidents(db, identity[0])


@app.post("/api/v1/incidents/analyze", response_model=IncidentResponse)
@app.post("/incidents/analyze", response_model=IncidentResponse)
def analyze_incident(request: IncidentRequest, identity: tuple[str, str] = Depends(demo_identity),
                     db: Session = Depends(db_session)) -> IncidentResponse:
    tenant, actor = identity
    incident = run_workflow(request.model_copy(update={"tenant_id": tenant}))
    save_incident(db, incident)
    audit(db, tenant, "investigation_created", actor=actor, incident_id=incident.incident_id)
    db.commit()
    return incident


@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentResponse)
@app.get("/incidents/{incident_id}", response_model=IncidentResponse)
def incident(incident_id: str, identity: tuple[str, str] = Depends(demo_identity),
             db: Session = Depends(db_session)) -> IncidentResponse:
    return require_incident(db, identity[0], incident_id)


@app.get("/api/v1/incidents/{incident_id}/timeline")
def incident_timeline(incident_id: str, identity: tuple[str, str] = Depends(demo_identity),
                      db: Session = Depends(db_session)) -> list[dict]:
    return require_incident(db, identity[0], incident_id).timeline


@app.get("/api/v1/incidents/{incident_id}/evidence")
def incident_evidence(incident_id: str, identity: tuple[str, str] = Depends(demo_identity),
                      db: Session = Depends(db_session)) -> list[dict]:
    return [item.model_dump(mode="json") for item in require_incident(db, identity[0], incident_id).evidence]


@app.post("/api/v1/incidents/{incident_id}/investigate")
def investigate_incident(incident_id: str, identity: tuple[str, str] = Depends(demo_identity),
                         db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    return investigate(db, tenant, require_incident(db, tenant, incident_id))


@app.post("/api/v1/investigator/messages")
def chat_message(request: ChatMessage, identity: tuple[str, str] = Depends(demo_identity),
                 db: Session = Depends(db_session)) -> dict:
    tenant, actor = identity
    conversation = None
    if request.conversation_id:
        conversation = db.scalar(select(ConversationRow).where(ConversationRow.id == request.conversation_id,
                                                               ConversationRow.tenant_id == tenant))
        if conversation is None:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = ConversationRow(tenant_id=tenant, incident_id=request.incident_id)
        db.add(conversation)
        db.flush()
    incident_id = request.incident_id or conversation.incident_id
    relevant = require_incident(db, tenant, incident_id) if incident_id else None
    db.add(MessageRow(conversation_id=conversation.id, tenant_id=tenant,
                      role="user", content=redact_sensitive(request.message), payload={"mode": request.mode}))
    if relevant:
        analysis = investigate(db, tenant, relevant) if request.mode == "investigate" else None
        if request.mode == "fix":
            response = "Proposed actions are shown in the Incident Room. Human approval is required for risky steps."
        elif analysis and analysis.get("available"):
            response = analysis["analysis"]["summary"]
        else:
            response = relevant.executive_summary
        evidence_ids = [item.id for item in relevant.evidence[:5]]
    else:
        response = "Select an incident to investigate evidence, impact, and safe next steps."
        evidence_ids = []
    db.add(MessageRow(conversation_id=conversation.id, tenant_id=tenant,
                      role="assistant", content=response,
                      payload={"evidence_ids": evidence_ids, "mode": "deterministic-fallback"}))
    audit(db, tenant, "chat_message", actor=actor, incident_id=incident_id,
          details={"conversation_id": conversation.id, "mode": request.mode})
    db.commit()
    return {"conversation_id": conversation.id, "incident_id": incident_id,
            "answer": response, "evidence_ids": evidence_ids}


@app.get("/api/v1/investigator/conversations/{conversation_id}")
def conversation_messages(conversation_id: str, identity: tuple[str, str] = Depends(demo_identity),
                          db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    row = db.scalar(select(ConversationRow).where(ConversationRow.id == conversation_id,
                                                  ConversationRow.tenant_id == tenant))
    if row is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.scalars(select(MessageRow).where(MessageRow.conversation_id == row.id,
                                                    MessageRow.tenant_id == tenant)
                          .order_by(MessageRow.created_at)).all()
    return {"id": row.id, "incident_id": row.incident_id,
            "messages": [{"role": item.role, "content": item.content,
                          "created_at": item.created_at.isoformat(), **item.payload} for item in messages]}


@app.get("/api/v1/replay/scenarios")
def replay_scenarios() -> list[dict]:
    return SCENARIOS


@app.post("/api/v1/replay/runs")
def replay_start(request: ReplayStart, identity: tuple[str, str] = Depends(demo_identity),
                 db: Session = Depends(db_session)) -> dict:
    try:
        return start_replay(db, identity[0], request.scenario)
    except ValueError as exc:
        status_code = 404 if str(exc) == "Unknown ReplayLab scenario" else 409
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc


@app.get("/api/v1/replay/runs")
def replay_runs(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(ReplayRow).where(ReplayRow.tenant_id == identity[0])
                      .order_by(ReplayRow.created_at.desc()).limit(50)).all()
    return [{"id": row.id, "scenario": row.scenario, "status": row.status,
             "incident_id": row.incident_id, "created_at": row.created_at.isoformat(), **row.payload} for row in rows]


@app.post("/api/v1/incidents/{incident_id}/actions/{action_id}/approval")
@app.post("/incidents/{incident_id}/actions/{action_id}/approval")
def decide_approval(incident_id: str, action_id: str, decision: ApprovalDecision,
                    identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    tenant, actor = identity
    item = require_incident(db, tenant, incident_id)
    action = next((part for part in item.recovery_actions if part.id == action_id), None)
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found")
    if not action.requires_approval or action.status != "proposed":
        raise HTTPException(status_code=409, detail="Action is not awaiting approval")
    action.status = "approved" if decision.decision == "approve" else "rejected"
    if decision.decision == "reject" and action_id == "ACT-DEMO":
        replay = db.scalar(select(ReplayRow).where(ReplayRow.tenant_id == tenant,
                                                   ReplayRow.incident_id == incident_id))
        if replay:
            replay.status = "rejected"
        item.status = "closed_unresolved"
    db.add(ApprovalRow(tenant_id=tenant, incident_id=incident_id, action_id=action_id,
                       decision=decision.decision, actor=actor, reason=redact_sensitive(decision.reason)))
    item.timeline.append({"at": datetime.now(timezone.utc).isoformat(),
                          "event": f"Action {'approved' if decision.decision == 'approve' else 'rejected'} by {actor}",
                          "kind": "approval"})
    save_incident(db, item)
    audit(db, tenant, "approval_decision", actor=actor, incident_id=incident_id,
          details={"action_id": action_id, "decision": decision.decision})
    db.commit()
    return {"incident_id": incident_id, "action_id": action_id, "status": action.status,
            "execution": "requires_separate_request", "mode": "simulated-demo"}


@app.get("/api/v1/approvals")
def approvals(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(ApprovalRow).where(ApprovalRow.tenant_id == identity[0])
                      .order_by(ApprovalRow.created_at.desc()).limit(50)).all()
    return [{"incident_id": row.incident_id, "action_id": row.action_id,
             "decision": row.decision, "actor": row.actor, "reason": row.reason,
             "created_at": row.created_at.isoformat()} for row in rows]


@app.post("/api/v1/incidents/{incident_id}/actions/{action_id}/execute")
def execute_action(incident_id: str, action_id: str, identity: tuple[str, str] = Depends(demo_identity),
                   db: Session = Depends(db_session)) -> dict:
    tenant, actor = identity
    item = require_incident(db, tenant, incident_id)
    if action_id != "ACT-DEMO":
        raise HTTPException(status_code=403, detail="Only the allowlisted ReplayLab recovery can execute")
    action = next((part for part in item.recovery_actions if part.id == action_id), None)
    approval = db.scalar(select(ApprovalRow).where(ApprovalRow.tenant_id == tenant,
                                                   ApprovalRow.incident_id == incident_id,
                                                   ApprovalRow.action_id == action_id,
                                                   ApprovalRow.decision == "approve"))
    if action is None or action.status != "approved" or approval is None:
        raise HTTPException(status_code=403, detail="Approved action is required")
    item.timeline.append({"at": datetime.now(timezone.utc).isoformat(),
                          "event": "Allowlisted demo recovery executed", "kind": "action"})
    try:
        result = execute_demo_recovery(db, tenant, item)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    action.status = "executed"
    save_incident(db, item)
    audit(db, tenant, "action_executed", actor=actor, incident_id=incident_id,
          details={"action_id": action_id, "mode": "simulated"})
    db.commit()
    return result


@app.post("/api/v1/incidents/{incident_id}/verify")
@app.post("/incidents/{incident_id}/verify")
def verify_incident(incident_id: str, _request: VerificationRequest | None = None,
                    identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    item = require_incident(db, tenant, incident_id)
    replay = db.scalar(select(ReplayRow).where(ReplayRow.tenant_id == tenant,
                                               ReplayRow.incident_id == incident_id))
    if replay is None:
        raise HTTPException(status_code=409, detail="No verification adapter is configured for this incident")
    return verify_recovery(db, tenant, item, scenario=replay.scenario)


@app.get("/api/v1/incidents/{incident_id}/postmortem")
def postmortem(incident_id: str, identity: tuple[str, str] = Depends(demo_identity),
               db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    item = require_incident(db, tenant, incident_id)
    if item.status != "resolved":
        raise HTTPException(status_code=409, detail="Postmortem is available after verified resolution")
    preventive_actions = {
        "Kafka": ["Alert on early broker storage pressure", "Review Kafka capacity and pipeline freshness SLOs"],
        "Spark": ["Review executor memory and GC baselines", "Alert on input delay before the freshness SLO is breached"],
        "Data": ["Add dataset freshness checks at ingestion", "Trace missing records through the upstream pipeline"],
    }.get(item.technology.value, ["Review monitoring coverage and escalation paths"])
    return {"incident_id": incident_id, "mode": "generated-draft", "editable": False,
            "summary": item.executive_summary, "impact": item.affected_entities,
            "timeline": item.timeline, "probable_root_cause": item.likely_root_causes,
            "evidence_ids": [part.id for part in item.evidence],
            "verification": "Recovery criteria passed", "preventive_actions": preventive_actions}


@app.get("/api/v1/knowledge")
@app.get("/api/v1/runbooks")
def knowledge(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(KnowledgeRow).where(KnowledgeRow.tenant_id == identity[0])).all()
    return [{"id": row.id, "title": row.title, "technology": row.technology,
             "source": row.source, "content": row.content} for row in rows]


@app.get("/api/v1/evaluations")
def evaluations(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(EvaluationRow).where(EvaluationRow.tenant_id == identity[0])
                      .order_by(EvaluationRow.created_at.desc()).limit(50)).all()
    return [{"id": row.id, "replay_id": row.replay_id, "score": row.score,
             "created_at": row.created_at.isoformat(), **row.payload} for row in rows]


@app.get("/api/v1/ai/usage")
@app.get("/ai/health")
def ai_usage(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> dict:
    tenant, _ = identity
    rows = db.scalars(select(AIUsageRow).where(AIUsageRow.tenant_id == tenant)
                      .order_by(AIUsageRow.created_at.desc()).limit(100)).all()
    return {"model_calls": len(rows), "input_tokens": sum(row.input_tokens for row in rows),
            "output_tokens": sum(row.output_tokens for row in rows),
            "failures": sum(row.status != "ok" for row in rows),
            "recent": [{"model": row.model, "task": row.task, "latency_ms": row.latency_ms,
                        "input_tokens": row.input_tokens, "output_tokens": row.output_tokens,
                        "status": row.status} for row in rows],
            "mode": "openai-optional" if get_settings().openai_model else "deterministic-fallback"}


@app.get("/api/v1/integrations")
def integrations() -> list[dict]:
    kafka = kafka_health()
    return [{"name": name, "status": status, "capabilities": capabilities,
             "last_sync": None} for name, status, capabilities in [
                ("ReplayLab telemetry", "connected-demo", ["metrics", "alerts", "recovery"]),
                ("OpenAI", "configured" if get_settings().openai_model else "not-configured", ["investigation"]),
                ("Kafka", kafka["status"], ["read-only health", "demo workload"] if kafka["status"] == "connected" else []),
                ("Spark", "planned", []),
                ("Prometheus", "compose-available", ["API scrape"]),
                ("OpenTelemetry", "configured" if os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT") else "not-configured", ["HTTP traces"]),
            ]]


@app.get("/api/v1/integrations/kafka/health")
def integration_kafka_health() -> dict:
    return kafka_health()


@app.get("/api/v1/audit")
@app.get("/audit")
def audit_events(identity: tuple[str, str] = Depends(demo_identity), db: Session = Depends(db_session)) -> list[dict]:
    rows = db.scalars(select(AuditRow).where(AuditRow.tenant_id == identity[0])
                      .order_by(AuditRow.created_at.desc()).limit(100)).all()
    return [{"id": row.id, "event": row.event, "actor": row.actor,
             "incident_id": row.incident_id, "created_at": row.created_at.isoformat(),
             "details": row.payload} for row in rows]


@app.get("/metrics", response_class=PlainTextResponse)
def prometheus_metrics(identity: tuple[str, str] = Depends(demo_identity),
                       db: Session = Depends(db_session)) -> str:
    tenant, _ = identity
    incident_count = db.scalar(select(func.count()).select_from(IncidentRow).where(IncidentRow.tenant_id == tenant)) or 0
    alert_count = db.scalar(select(func.count()).select_from(AlertRow).where(AlertRow.tenant_id == tenant)) or 0
    return ("# TYPE investinator_incidents_total gauge\n"
            f"investinator_incidents_total {incident_count}\n"
            "# TYPE investinator_alerts_total gauge\n"
            f"investinator_alerts_total {alert_count}\n")
