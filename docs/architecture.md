# InvestiNator architecture and delivery plan

## Product shape

InvestiNator covers the operational loop:

```text
Observe → Detect → Correlate → Investigate → Explain → Recommend
       → Approve / Execute → Verify → Learn
```

The target product has eight capabilities: Pulse (observability), Investigator (Ask / Investigate / Fix), NerveMap (infrastructure and data lineage), Incident Room, EvidenceGraph, Fix (controlled remediation), Memory (runbooks and incident knowledge), and ReplayLab (simulation and evaluation). The current repository establishes backend contracts and an order-pipeline seed, not a complete production implementation of all eight.

## Architecture boundary

```text
Telemetry sources → OpenTelemetry / provider adapters → Detection
                                                     ↓
                              Correlation ← Topology / lineage
                                    ↓
                             Incident API
                                    ↓
                       Investigator / AI gateway
                         ↓ typed read-only tools
             Evidence + retrieval + incident memory
                                    ↓
                    Policy → approval → executor
                                    ↓
                         verification / audit
```

FastAPI is the current API boundary. `agents.py` is the deterministic V0 investigation orchestrator; it classifies known DataOps technologies, extracts log signatures, retrieves runbook evidence, and proposes typed next steps. The API currently keeps incidents and audit events in process memory. The seed NerveMap graph is illustrative. Connectors, a durable database, identity, and the AI gateway are future integrations.

## Evidence and safety contracts

- Observations (logs and metrics) and runbook guidance have separate `kind` and source fields.
- Each evidence item has a stable response-local ID so a hypothesis can point back to its supporting material.
- Unknown or weakly classified reports return `insufficient_evidence`.
- GPT/model output cannot authorize an operation. Risk is determined by application policy and typed action metadata.
- Approval records a human decision; it does not execute an action. Execution remains disabled until an allowlisted runner, preconditions, rollback, and authorization exist.
- Verification checks symptom values; successful command completion alone is not incident resolution.
- Tenant IDs are carried and filtered in the demo. Production must authenticate the caller and enforce tenant/resource scope before fetching telemetry, retrieval content, or model context.

## First vertical slice

Target Kafka + Spark order flow:

```text
Orders Producer → Kafka topic → Spark streaming job → fact_orders → dashboard
```

The first live scenario is broker disk pressure. It should connect real telemetry, detect and correlate disk/log/ISR/lag/freshness signals, gather evidence through read-only tools, produce a reviewable RCA and blast radius, request human approval for a named runbook, execute only approved steps, verify recovery metrics, and retain the postmortem. The current seed graph, incident analysis endpoint, approval records, and verification contract are scaffolding toward that demo.

## Delivery sequence

| Stage | Outcome | Status in this repository |
| --- | --- | --- |
| V0.2 | Structured incident contracts and InvestiNator identity | Implemented with deterministic fallback |
| V0.3 | OpenTelemetry, Prometheus, real Kafka/Spark telemetry | Planned; connectors are not configured |
| V0.4 | Pulse dashboard and incident engine | API surface seeded; live health/dashboard pending |
| V0.5 | Investigator with read-only tools | Investigation API exists; provider tools pending |
| V0.6 | RAG and historical incident memory | Static runbook evidence remains; durable RAG pending |
| V0.7 | NerveMap topology and blast radius | Illustrative graph only |
| V0.8 | ReplayLab and automated evaluation | Existing JSONL cases remain the initial dataset |
| V0.9 | Policy, approvals, controlled remediation | Policy proposals and approval records exist; executor pending |
| V1.0 | Verified Kafka/Spark end-to-end demo | Pending real telemetry, execution, persistence, and integration |
| V1.1–V1.3 | Additional platforms, data quality, enterprise tenancy | Planned |

## Suggested next implementation milestones

1. Add a real OpenTelemetry/Prometheus ingestion adapter and Kafka/Spark telemetry fixtures for repeatable local development.
2. Move incident and audit state into PostgreSQL with tenant-scoped repository methods and migrations.
3. Add authenticated OIDC identity and RBAC before enabling any retrieval or tools outside the demo.
4. Build the tool registry and OpenAI Responses API gateway behind a provider interface; emit validated Pydantic outputs and usage/latency traces.
5. Add topology-aware alert correlation and lineage ingestion.
6. Add replay scenarios and evaluation for detection, evidence support, unsafe-action blocking, and verification.
7. Implement named, allowlisted runbooks with preconditions, rollback, approval binding, and recovery verification before any production executor.
