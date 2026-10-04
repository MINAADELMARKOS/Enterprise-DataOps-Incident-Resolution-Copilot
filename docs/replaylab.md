# ReplayLab

ReplayLab has three named simulated scenarios: `kafka_disk_pressure`, `spark_executor_pressure`, and `data_freshness_failure`. Each run persists a run record, injected telemetry and alert records, an incident, and an evaluation result. The Kafka scenario injects five related observations and correlates them through the seeded order-pipeline topology. The real Compose Kafka producer and consumer continue independently and are not faulted by ReplayLab.

Start a run in the UI or call `POST /api/v1/replay/runs` with `{"scenario":"kafka_disk_pressure"}`. Inspect `/api/v1/alerts`, `/api/v1/incidents/{id}`, and `/api/v1/topology`. Verification before recovery fails on current symptoms. Record approval for `ACT-DEMO`, then call its execute route. The allowlisted adapter writes scenario-specific recovery metrics and rechecks thresholds; the Kafka case also checks downstream Spark delay and dataset freshness. Only a passed check resolves the incident. Audit and postmortem endpoints preserve the sequence. The same simulated recovery flow is available for the Spark and freshness scenarios.

Replay records and evaluations are local evidence of workflow behavior. They do not prove a production Kafka cluster was repaired. The offline JSONL evaluation can be run with `python -m incident_copilot.evaluation eval/test_incidents.jsonl`.
