# HDFS safe mode

**Scope:** Investigate write failures when the NameNode reports safe mode.

1. Read NameNode safe-mode reason, live DataNode count, block reports, and under-replicated blocks.
2. Check storage capacity, network health, and recent NameNode or DataNode restarts.
3. Identify affected writers, pipelines, and datasets before proposing a change.
4. Do not force safe-mode exit without a reviewed recovery procedure and approval.
5. Verify safe mode has ended, replication is recovering, writes succeed, and downstream data arrives.
