# Spark executor loss

**Scope:** Diagnose executor exits, out-of-memory errors, and streaming delay.

1. Inspect failed stages, executor exit reasons, memory use, GC time, spill, and input delay for the affected application.
2. Check for skewed partitions, recent code/configuration changes, increased source volume, and upstream Kafka lag.
3. Link the streaming job to downstream dataset freshness and dashboard impact.
4. Propose resource or partition changes only after evidence review and change approval; record rollback settings.
5. Verify stable executors, lower GC and delay, progress in checkpoints, and recovered data freshness.
