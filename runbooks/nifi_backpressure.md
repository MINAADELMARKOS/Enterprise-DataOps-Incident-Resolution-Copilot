# NiFi backpressure

**Scope:** Diagnose queued flow files and stalled processors.

1. Inspect queue object count, bytes, oldest flow-file age, processor bulletins, and repository health.
2. Trace the path from upstream source to affected downstream dataset, including retries and dead-letter routes.
3. Compare recent flow changes and external dependency failures before changing queue limits.
4. Require a reviewed, approved action for processor changes or flow-file movement; preserve provenance and a rollback plan.
5. Verify queue drain, processor throughput, error rates, and dataset freshness.
