# Enterprise DataOps Incident Resolution Copilot

An agentic AI reference implementation for resolving enterprise data-platform incidents across HDFS, Spark, Kafka, Kudu, NiFi, and API services. The project mirrors real DataOps workflows: ingest incident context, retrieve trusted runbooks and historical tickets, inspect logs/metrics, recommend remediation, and require human approval before risky operations.

## Why this matters

Data-platform incidents span distributed systems, logs, runbooks, tickets, and infrastructure metrics. Engineers lose time correlating evidence and selecting safe recovery procedures. This copilot reduces mean time to resolution while preserving operational governance.

## Agent workflow

| Agent | Responsibility |
| --- | --- |
| Supervisor | Routes tasks and manages workflow state |
| Triage | Classifies HDFS, Spark, Kafka, Kudu, NiFi, or API incidents |
| Retrieval | Searches runbooks and historical tickets using hybrid retrieval |
| Log analysis | Extracts exceptions, timestamps, hostnames, and failure patterns |
| Metrics | Queries read-only platform metrics and SQL data |
| Remediation | Produces ordered recovery actions with evidence |
| Risk | Blocks dangerous or irreversible actions unless approved |
| Report | Creates engineering and executive incident summaries |

## Reference architecture

- **API:** FastAPI and asyncio
- **Orchestration:** LangGraph-style state-machine workflow
- **Models:** Azure OpenAI / Azure AI Foundry compatible chat models
- **Retrieval:** BM25 + vector hybrid retrieval, optional cross-encoder reranking
- **Structured outputs:** Pydantic schemas
- **Safety:** allowlisted tools, prompt-injection handling, approval gates, secret/PII redaction
- **Evaluation:** RAGAS-oriented dataset with classification, retrieval, groundedness, safety, latency, and cost metrics
- **Observability:** OpenTelemetry-ready request and tool-call logging

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
uvicorn src.incident_copilot.api:app --reload
```

Submit an incident:

```bash
curl -X POST http://127.0.0.1:8000/incidents/analyze \
  -H 'Content-Type: application/json' \
  -d '{"description":"Kafka consumer lag rising after broker disk alerts","logs":"ERROR DiskErrorException broker-2 /data1"}'
```

Run tests:

```bash
pytest
```

## Responsible AI controls

- Retrieved documents are treated as untrusted evidence and cannot override system/developer instructions.
- Tools are allowlisted and read-only by default.
- Restart, delete, config-change, and messaging actions are marked dangerous and require human approval.
- Secrets and personally identifiable information are redacted from reports and logs.
- Confidence thresholds return `insufficient_evidence` instead of fabricated root causes.
- Every tool call and approval decision is auditable.

## Evaluation targets

| Metric | Example target |
| --- | --- |
| Incident classification accuracy | > 85% |
| Correct document retrieval | Recall@5 > 80% |
| Supported-answer rate | > 90% |
| Tool-call success | > 95% |
| Dangerous-action blocking | 100% |
| Response latency | Track P50/P95 |
| Cost per incident | Track per model/tool call |
| Root-cause recommendation accuracy | Compare with reference cases |
