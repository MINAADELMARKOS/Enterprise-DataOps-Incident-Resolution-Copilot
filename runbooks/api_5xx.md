# API 5xx spike

**Scope:** Investigate service errors in a data-platform API.

1. Compare 5xx rate, latency, request volume, dependency errors, and recent deployments.
2. Use trace IDs to locate failing dependencies; avoid logging secrets or full request bodies.
3. Check whether an API failure blocks ingestion or data availability.
4. Propose rollback or restart only with an approved change record and current health evidence.
5. Verify 5xx rate, latency, dependency health, and downstream processing.
