# InvestiNator

**InvestiNator is an AI-native observability, investigation, and controlled remediation platform for enterprise data operations.** It follows the operational loop from detection and evidence gathering through approval and recovery verification. The first vertical slice focuses on the Kafka + Spark order pipeline.

The repository is the V0.2 reference backend: deterministic incident triage and evidence retrieval, typed incident contracts, policy-gated action proposals, and API surfaces for a command center, topology, alert grouping, approvals, and verification. No live telemetry provider or action executor is configured by default. The APIs label illustrative seed data and do not imply that a real cluster is healthy.

## Operating principles

- GPT reasons; telemetry proves. The current implementation uses deterministic fallback reasoning and makes no model calls.
- Topology explains impact. The NerveMap endpoint contains an explicitly illustrative order-pipeline seed graph.
- Policy controls actions. Recovery steps are proposals; risky steps require an auditable human decision.
- Verification closes incidents. An incident is marked resolved only when supported recovery checks pass.
- Authorization must precede retrieval. Tenant identifiers are carried and filtered in this demo, but authentication and production-grade isolation are not yet configured.

## Current capabilities

| Product area | Included now |
| --- | --- |
| Investigator | Structured incident analysis, technology classification, log finding extraction, runbook evidence, and recommendations |
| Incident Room | Incident details, severity, evidence references, affected entities, and timeline |
| Pulse / Command Center | API endpoints with clear sample/unconfigured labels |
| NerveMap | Seed Kafka → Spark → dataset → dashboard lineage graph |
| Alert correlation | Groups submitted signals that share an entity; no auto-created incidents |
| Fix / Approvals | Approval decisions are recorded; action execution is not configured |
| Verification | Checks Kafka disk, consumer lag, and ISR recovery before resolving |
| AI Observability | Reports local deterministic-mode counters; model calls are zero |

See [docs/architecture.md](docs/architecture.md) for system boundaries and the staged roadmap.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn incident_copilot.api:app --app-dir src --reload
```

Open the interactive API reference at `http://127.0.0.1:8000/docs`.

Analyze an incident:

```bash
curl -X POST http://127.0.0.1:8000/incidents/analyze \
  -H 'Content-Type: application/json' \
  -d '{"description":"Kafka consumer lag rising after broker disk alert","logs":"ERROR DiskErrorException broker-2 /data1","metrics":{"disk_percent":97.8,"consumer_lag":2400000,"isr_percent":78},"environment":"production-demo","tenant_id":"demo"}'
```

The response includes an incident ID, severity, evidence IDs, suggested recovery actions, and an approval requirement. A proposed action is never executed by this service. Approval and verification endpoints are demo workflow records only.

## API map

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Service status and operating mode |
| `GET /command-center` | Platform summary and active incidents |
| `GET /pulse` | Telemetry connector status |
| `GET /nerve-map` | Pipeline topology and lineage seed graph |
| `GET /explore` | Unified telemetry explorer capability/status |
| `GET /ai/health` | Model and tool-operation counters |
| `POST /incidents/analyze` | Analyze a report and propose evidence-linked actions |
| `GET /incidents` / `GET /incidents/{id}` | Tenant-filtered incident retrieval |
| `POST /signals/correlate` | Group alerts sharing an entity |
| `POST /incidents/{id}/actions/{action_id}/approval` | Record approval or rejection |
| `POST /incidents/{id}/verify` | Verify recovery symptoms and update incident status |
| `GET /audit` | Tenant-filtered in-memory audit trail |

## Safety and deployment limits

- Secrets and email addresses are redacted before analysis.
- Remediation proposals are typed and high-risk actions require explicit approval.
- Retrieved runbook text is treated as evidence, not executable instructions.
- Incident, approval, and audit state currently lives in process memory and resets on restart.
- The `tenant_id` query field is not authentication. Do not expose this demo as a multi-tenant service.
- The seed topology and command-center health values are illustrative. No Kafka, Spark, Prometheus, OpenTelemetry, or other production connector is active.
- No shell, infrastructure write, notification, or model tool is exposed by the API.

## Roadmap

Build one verifiable vertical slice before expanding integrations: real Kafka + Spark telemetry, detection and topology-aware alert correlation, read-only investigation tools, durable retrieval and incident memory, replay/evaluation, then policy-approved execution with rollback and symptom verification. HDFS/Kudu/NiFi connectors, data-quality observability, OIDC/RBAC, durable tenant isolation, and SaaS integrations follow that slice. This staged sequence preserves the current code as V0 while keeping the long-term product direction visible.
