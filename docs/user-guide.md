# InvestiNator user guide

InvestiNator is a working **local DataOps demo** for the orders pipeline. The UI connects to a FastAPI service, PostgreSQL, Kafka, Prometheus, and OpenTelemetry. It follows **Observe → Detect → Investigate → Fix → Verify → Learn**. Fault injection and recovery are simulated; the repository does not contain a production remediation executor.

## Choose the right version

| Version | Open | What it can do |
| --- | --- | --- |
| Full local demo | [localhost:3000](http://localhost:3000) | Read stored demo telemetry, create replay runs and incidents, investigate evidence, record approvals, execute an allowlisted simulated recovery, verify it, and read the postmortem. Requires Docker Desktop. |
| [GitHub Pages UI preview](https://minaadelmarkos.github.io/Enterprise-DataOps-Incident-Resolution-Copilot/) | Public website | Explore the same visual system with synthetic, fixed data. Scenario, approval, recovery, verification, search, topology, and scripted chat interactions stay in the browser. It has no API, database, live telemetry, model call, or external action. |

The public preview labels itself **PUBLIC UI PREVIEW / SYNTHETIC DATA**. Do not use its readings as operational facts. GitHub Pages serves static files and cannot run the FastAPI, Kafka, or PostgreSQL parts of this repository.

## Start the full product locally

1. Install and start Docker Desktop. Verify its Linux engine is running.
2. Open a terminal in the repository root and run `docker compose up --build -d`.
3. Run `docker compose ps`. Wait until `api` and `db` are healthy and `web` is up.
4. Open [InvestiNator](http://localhost:3000). The API reference is at [localhost:8000/docs](http://localhost:8000/docs); Prometheus is at [localhost:9090](http://localhost:9090).

Useful commands from the repository root:

```bash
docker compose ps
docker compose logs -f api web
docker compose up --build -d
docker compose down
```

`docker compose down` stops containers and preserves the PostgreSQL volume. `docker compose down -v` also deletes that demo database, so use it only when you want a reset. The web app proxies API calls through its server; never put an API key in the browser or GitHub Pages build.

## Walk through one incident

1. **Command Center** gives the current demo health score, active P1/P2 counts, degraded systems, delayed datasets, incident list, and business impact. The banner identifies simulated fault signals.
2. **ReplayLab** lists three scenarios. Select **Kafka broker disk pressure** and press **Start scenario**. This creates demo telemetry, correlated alerts, an incident, and a saved replay run. It does not fill a real disk.
3. **Incident Room** opens automatically. Read the hypothesis, supporting evidence, timeline, affected entities, and recommended action. The evidence IDs and sources explain what supports the hypothesis.
4. Press **Recheck recovery criteria** before recovery. The Kafka disk, ISR, or lag checks should fail while symptoms remain.
5. Open **NerveMap** to trace the seeded orders lineage from producer and broker through topic, consumer, Spark job, dataset, and dashboard. Select a node to view its downstream blast radius.
6. Open **Investigator** to ask what changed, what evidence supports the likely cause, what is affected, or how to recover. Without an OpenAI key and configured model, the local API returns a deterministic evidence summary. The optional model path is bounded and evidence checked.
7. Back in Incident Room, review the allowlisted `ACT-DEMO` action. Press **Approve demo recovery**; or **Reject** if you want to inspect that branch. Approvals shows decisions and the local API records the demo actor and reason.
8. After approval, press **Execute allowlisted demo action**. The backend updates the simulated telemetry. It does not restart a real broker, change Spark infrastructure, or alter a production dataset.
9. Press **Recheck recovery criteria** again. The incident resolves only if the demo thresholds pass. Open the **postmortem** from Incident Room to see the incident summary and verification record.

The Spark executor pressure and dataset freshness scenarios exercise other parts of the same loop. Each replay creates stored demo records, so counts and incident IDs can differ from screenshots or the GitHub Pages preview.

## What each screen does

| Screen | Purpose | What to do there |
| --- | --- | --- |
| Command Center | Unified operational summary | Check health, priority, degradation, freshness, active incident, and business impact; open a scenario or incident. |
| Pulse | Metrics and thresholds | Inspect current metric values and identify which entity and reading is degraded. |
| Incidents | Prioritized incident queue | Compare severity, likely cause, technology, impact, and state; open an Incident Room. |
| Incident Room | Investigation and recovery record | Read evidence, alerts, timeline, blast radius, verification, and proposed actions; approve or reject the demo action. |
| NerveMap | Seeded dependency graph | Search, zoom, and select an entity to see the downstream path into datasets and dashboards. |
| Explore | Raw signal inspection | Compare stored metrics, logs, events, and traces that support an investigation. |
| Investigator | Evidence-first Q&A | Pick an incident and use Ask, Investigate, or Fix mode; review evidence IDs and uncertainty in the answer. |
| ReplayLab | Reproducible scenario launcher | Start Kafka, Spark, or freshness simulations; open saved replay runs and related incidents. |
| Runbooks | Curated recovery guidance | Read technology-specific runbooks as reference material. Reading a runbook does not execute it. |
| Knowledge | Searchable demo memory | Inspect tenant-scoped guidance and incident context used during investigation. |
| Approvals | Human decision ledger | Review proposed risky actions and recent decisions, then open the incident to act. |
| Automations | Future workflow area | See that no durable scheduled actions are configured in this demo. |
| AI Observability | AI usage and evaluation | Inspect model calls, tokens, failures, fallback state, and offline replay evaluation results. |
| Integrations | Connector inventory | See which local connectors have actual demo activity and which external adapters are planned. |
| Administration | Environment and access boundary | Review demo mode, fixed demo identity, and production access limitations. |
| About | Product and creator | See the operating loop and Mina Adel Markos's public GitHub identity. |

## Data, AI, and safety boundaries

- Kafka produces and consumes local demo orders. Broker health is read from the local broker. ReplayLab fault metrics for broker pressure, Spark, and freshness are injected demo signals.
- Topology and lineage are seeded for the orders pipeline. The app does not discover an enterprise estate automatically.
- The optional AI path needs `OPENAI_API_KEY` and `INVESTINATOR_OPENAI_MODEL` in the API environment. Without them, deterministic investigation remains available. Model output cannot approve an action; the policy engine runs separately.
- Only a named, allowlisted ReplayLab action can write recovery telemetry. There is no production shell or infrastructure write executor.
- Authentication is a fixed server-side demo identity. OIDC and RBAC are not implemented. Keep the Compose stack on a trusted local machine; do not expose its ports to the internet.
- The GitHub Pages preview never receives API keys, private telemetry, approval records, or a backend URL. Its interactions are local browser state and reset on refresh.

For implementation detail, see [architecture](architecture.md), [ReplayLab](replaylab.md), [AI design](ai-design.md), [security](security.md), and [integrations](integrations.md). API schemas and the full endpoint list are available in the local Swagger UI at [localhost:8000/docs](http://localhost:8000/docs).

## GitHub Pages publication

The static source is in `apps/showcase`. Its Vite build imports the main app's design tokens and styles, so visual changes stay aligned. The [Pages workflow](../.github/workflows/pages.yml) builds `apps/showcase/dist` from `main` and deploys it to the `github-pages` environment. The repository's **Settings → Pages → Build and deployment → Source** must be **GitHub Actions**. The project site uses the repository path as its URL base.
