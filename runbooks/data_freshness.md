# Dataset freshness failure

**Scope:** Diagnose delayed or missing records even when infrastructure is healthy.

1. Compare expected arrival time with latest partition, record count, watermark, and pipeline checkpoint.
2. Trace source topic, consumer, processing job, target dataset, and dashboard lineage.
3. Check schema drift, rejected records, missing partitions, duplicate suppression, and upstream delivery gaps.
4. Require approval for reprocessing or backfill because it may duplicate or overwrite data; define validation and rollback.
5. Verify new records arrive, counts and quality checks pass, and freshness meets the SLO.
