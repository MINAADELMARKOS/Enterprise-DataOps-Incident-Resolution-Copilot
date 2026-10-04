# Kudu tablet unavailable

**Scope:** Investigate tablet unavailability or consensus errors.

1. Inspect tablet-server availability, tablet replicas, leader election, consensus errors, and disk/network health.
2. Identify affected tables, writers, readers, and business-facing datasets.
3. Check recent maintenance, host failures, and replica placement before proposing changes.
4. Any replica reconfiguration requires specialist review, approval, and documented rollback.
5. Verify tablet availability, stable leadership, successful writes/reads, and downstream freshness.
