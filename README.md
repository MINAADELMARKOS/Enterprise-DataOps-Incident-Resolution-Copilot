# InvestiNator

**AI-powered DataOps Observability, Investigation & Controlled Remediation**

See the signal. Find the cause. Fix with confidence.

**Observe → Detect → Investigate → Fix → Verify → Learn**

InvestiNator follows a signal across infrastructure, pipelines, and datasets, gathers inspectable evidence, proposes a recovery path, records human approval, and verifies symptoms before closing an incident. This repository is a working **local demo foundation** for that loop, centered on an orders pipeline. It is not a production monitoring or remediation service.

| Capability | What runs today | Boundary |
| --- | --- | --- |
| Telemetry and Pulse | API ingestion, seeded metrics/logs/events, threshold alerts, Prometheus API scrape, optional OpenTelemetry HTTP traces | ReplayLab fault signals are simulated; no live Spark, HDFS, NiFi, or Kudu connector |
| Kafka | Real local producer, consumer, and read-only broker health in Compose | Broker disk pressure and lag failure scenarios are injected demo signals |
| Correlation and NerveMap | Persistent topology, correlated alerts, incident evidence, blast radius, dataset freshness | Seed lineage graph; no automatic discovery |
| Investigator and memory | Read-only tool registry, searchable seed knowledge, deterministic analysis, optional OpenAI Responses structured investigation | OpenAI needs a key and model name; no paid call is required for the demo |
| Fix and verification | Deterministic policy, recorded approvals, one allowlisted simulated recovery, metric-based verification, audit trail | No production shell or infrastructure write executor |
| ReplayLab and evaluation | Three replay scenarios, saved run/evaluation records, offline regression dataset | Scenario results describe demo behavior only |
| Interface | Next.js Command Center, Pulse, Incident Room, Investigator, NerveMap, ReplayLab, Approvals, Knowledge, AI Observability and more | Demo identity is fixed server-side; OIDC/RBAC is not implemented |

## Run the full demo

Requires Docker Desktop with its engine running. From the repository root:

```bash
docker compose up --build -d
```

Open [InvestiNator](http://localhost:3000), [API docs](http://localhost:8000/docs), and [Prometheus](http://localhost:9090). Run `docker compose ps` to check containers. The Kafka workload creates `orders.events` and continually produces and consumes demo orders. PostgreSQL stores incidents, telemetry, approvals, audit records, and replay results; Alembic applies the schema at API startup. Docker Compose uses a trusted PostgreSQL connection on its private demo network. Do not expose the stack to the internet.

In ReplayLab, choose **Kafka broker disk pressure** and start a run. Open its Incident Room to review five correlated alerts, evidence, and blast radius. Try **Verify** before recovery to see the failing checks. Approve the named demo action and execute it. The demo adapter writes recovery telemetry and resolves the incident only when thresholds pass. The replay does **not** fill an actual Kafka disk or restart a broker. Other scenarios cover Spark executor pressure and dataset freshness.

Run `python scripts/smoke_demo.py` after the stack starts to exercise the same path through the live API. It creates and resolves one demo incident.

To stop the stack, run `docker compose down`. Add `-v` only when you intend to erase the demo PostgreSQL volume.

## Run backend and frontend separately

Use Python 3.11+ and Node 22+:

```bash
python -m venv .venv
# Activate .venv for your shell.
python -m pip install -e '.[dev]'
alembic upgrade head
uvicorn incident_copilot.api:app --app-dir src --reload
```

The default local database is `investinator.db` (SQLite) and demo identity is enabled. In a second terminal:

```bash
cd apps/web
npm ci
npm run dev
```

Copy `.env.example` to `.env` to configure optional models or a different database. Environment files are ignored by Git. The web app proxies API calls server-side; the OpenAI key stays in the API environment.

## Verify and evaluate

```bash
pytest -q
ruff check src tests
mypy src
python -m incident_copilot.evaluation eval/test_incidents.jsonl
cd apps/web && npm ci && npm run build && npm audit --audit-level=high
```

The offline evaluation checks classification, evidence or explicit uncertainty, and approval requirements. Model quality, retrieval relevance, and live connector behavior require separate evaluations; no offline score is presented as a production accuracy claim.

## API and design

The stable API namespace is `/api/v1`. Useful endpoints include `/platform/health`, `/telemetry/metrics`, `/topology`, `/alerts`, `/incidents`, `/replay/scenarios`, `/replay/runs`, `/integrations/kafka/health`, `/ai/usage`, `/audit`, and `/evaluations`. The API docs list request schemas and action routes. Older V0.2 routes remain as aliases where practical.

See [architecture](docs/architecture.md), [AI design](docs/ai-design.md), [security](docs/security.md), [ReplayLab](docs/replaylab.md), [demo guide](docs/demo.md), [integrations](docs/integrations.md), and [migration plan](docs/migration-plan.md). Source runbooks live in [`runbooks/`](runbooks/).

## Creator

Created by **Mina Adel Markos**, Senior Big Data Engineer. [GitHub](https://github.com/MINAADELMARKOS) · [LinkedIn](https://www.linkedin.com/in/mina-markos-343b8b171).
