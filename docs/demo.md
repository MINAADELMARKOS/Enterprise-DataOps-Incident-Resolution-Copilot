# Demo walkthrough

1. Run `docker compose up --build -d` and wait until `docker compose ps` shows API and database healthy.
2. Open `http://localhost:3000` and confirm Command Center labels the view as simulated demo. Open Integrations to check Kafka's actual broker status.
3. Open ReplayLab and start Kafka broker disk pressure. Inspect the returned incident in Incident Room, its evidence list, five alerts, and NerveMap blast radius.
4. Press Verify before remediation; the current Kafka disk/ISR/lag symptoms fail.
5. In the incident action panel, approve `ACT-DEMO` as the demo operator, then execute the allowlisted simulation. Check the new verification result and resolved status.
6. Open the postmortem, audit trail, and AI Observability. With no API key/model configured, the AI section correctly reports deterministic fallback and zero model calls.
7. Start the data freshness scenario to see data health degrade while Kafka health remains healthy.

The broker disk, ISR, lag, Spark, and freshness failures are simulated. The Kafka traffic and broker health adapter are real local services. Do not interpret this walkthrough as proof of production connector or remediation safety.
