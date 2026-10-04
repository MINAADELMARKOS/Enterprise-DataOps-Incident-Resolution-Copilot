# Integration status

| Integration | Present behavior | Next production work |
| --- | --- | --- |
| Kafka | Compose producer/consumer on `orders.events`; read-only broker/topic health endpoint | SASL/TLS, authorized metrics, consumer lag and broker telemetry ingestion |
| PostgreSQL | Durable demo state with Alembic migration | Managed DB, credentials, backup, isolation and retention |
| Prometheus | Scrapes the API's `/metrics` endpoint | Broader service metrics and alert rules |
| OpenTelemetry | FastAPI HTTP spans export to local collector when endpoint is configured | Collector backend, sampling, semantic attributes and trace retention |
| OpenAI | Optional Responses structured investigation when configured | Governance, model evaluations, budget enforcement and operational monitoring |
| Spark, HDFS, NiFi, Kudu | Classification and seed runbooks only | Authenticated read-only adapters and topology discovery |
| Data lineage/catalog | Seed order-flow entities and edges | Catalog import and dataset-level quality/freshness contracts |

`GET /api/v1/integrations` reports configured, unavailable, or planned states. `GET /api/v1/integrations/kafka/health` checks a configured broker; it does not mutate topics or broker settings. ReplayLab telemetry must not be described as live connector data.
