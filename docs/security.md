# Security boundary

This is a local demo. The API derives a fixed demo tenant and actor on the server and overrides client-supplied tenant IDs. Tenant-scoped database reads and writes prevent one demo tenant's records from appearing in another tenant's queries, but this is not authentication. When demo mode is disabled, protected routes return 503 until an identity provider is implemented. Do not expose the demo API or its PostgreSQL trust connection to a public network.

Manual report text and logs are redacted before deterministic analysis. The AI gateway receives bounded evidence and treats retrieved material as untrusted. It validates evidence references before returning model hypotheses. The `OPENAI_API_KEY` remains in the API environment and is never sent to the frontend. Model storage is disabled by default. Production privacy and retention policies still need design and review.

Action policy denies destructive and unknown commands, records approvals and audit events, and allows execution only for one named simulated ReplayLab action. An approval is bound to an incident and action. Verification uses current stored metrics, not a user-supplied success flag, before marking an incident resolved. No endpoint executes raw GPT text, shell commands, broker restarts, or infrastructure changes.

Before production use, implement OIDC login, RBAC, per-resource authorization, tenant provisioning and isolation tests across every adapter, encrypted database credentials and secrets management, CSRF/rate controls, audit retention, dependency review, and a real runbook executor with preconditions, rollback, and separate change approval.
