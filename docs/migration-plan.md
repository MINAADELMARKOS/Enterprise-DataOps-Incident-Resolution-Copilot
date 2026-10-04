# Migration plan and baseline

## Baseline (2026-10-04)

The repository starts as a small FastAPI prototype with a deterministic `run_workflow`, Pydantic incident contracts, redaction and approval helpers, one API module, three unit tests, five JSONL evaluation cases, and a single API Dockerfile. The existing tests passed: `3 passed` before the current migration.

Useful code is retained as the local fallback investigation path. `triage()` becomes the classification fallback, `analyze_logs()` the log signature utility, `retrieve()` the first knowledge seed, `remediate()` the proposal builder, and `requires_approval()` the policy seed. The `/incidents/analyze` endpoint remains available during migration.

## Breaking issues in the prototype

- Incident and audit state is process local and disappears on restart.
- The request supplies `tenant_id`; no authenticated actor binds it.
- The command center and NerveMap contain illustrative data and there is no frontend.
- Alert grouping is exact entity matching, with no lineage or time-window correlation.
- A verification request can mark an incident resolved based on a partial set of caller supplied checks.
- The Dockerfile only runs the API; there is no data service or replay stack.
- The keyword fallback may rank irrelevant runbooks because it matches short substrings.

## Incremental approach

1. Move operational state to a database and keep the existing Pydantic response contract.
2. Add deterministic telemetry, detection, correlation, topology, and replay services behind API routes.
3. Add an application web UI that reads backend APIs. Seed data lives in backend adapters.
4. Add an optional OpenAI Responses gateway; failures preserve the deterministic path.
5. Add an allowlisted demo runbook with policy, approval, execution record, and complete recovery checks.
6. Keep live integration claims tied to verified connectors; mark local replay values as simulated.

## Acceptance boundary

The first executable scenario is Kafka broker storage pressure flowing through the orders pipeline. It must yield telemetry, one correlated incident, evidence, a reviewable action, approval, an allowlisted local demo recovery, verification, a postmortem, and an evaluation record. Real broker disk exhaustion requires a separate integration environment and is not represented by synthetic telemetry.
