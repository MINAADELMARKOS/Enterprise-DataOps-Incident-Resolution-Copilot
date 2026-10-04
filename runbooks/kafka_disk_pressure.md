# Kafka broker disk pressure

**Scope:** Investigation guidance for a Kafka broker showing disk pressure or `DiskErrorException`. This document does not authorize a production change.

1. Confirm broker disk usage, free bytes, offline log directories, and recent storage errors from trusted telemetry.
2. Check topic partition leaders, in-sync replicas, under-replicated partitions, and consumer lag. Identify affected datasets and dashboards through lineage.
3. Inspect retention, compaction, and partition growth. Check whether other brokers have sufficient capacity before proposing reassignment or restart.
4. Present an evidence-linked recovery plan with preconditions, owner, approval, rollback, and a maintenance window. Never delete topics or log directories from an AI recommendation.
5. After an authorized action, verify disk below the configured threshold, full ISR, falling lag, and recovered dataset freshness. Keep the incident open if any check fails.
