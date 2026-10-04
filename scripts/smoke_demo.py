"""Exercise the live Compose demo without touching production infrastructure."""

import os

import httpx


def main() -> None:
    base = os.getenv("INVESTINATOR_API_URL", "http://127.0.0.1:8000/api/v1")
    with httpx.Client(base_url=base, timeout=10) as client:
        health = client.get("/health")
        health.raise_for_status()
        assert health.json()["mode"] == "simulated-demo"
        kafka = client.get("/integrations/kafka/health")
        kafka.raise_for_status()
        assert kafka.json()["status"] == "connected", kafka.json()

        started = client.post("/replay/runs", json={"scenario": "kafka_disk_pressure"})
        started.raise_for_status()
        incident_id = started.json()["incident_id"]
        assert len(started.json()["steps"]) == 5
        before = client.post(f"/incidents/{incident_id}/verify")
        before.raise_for_status()
        assert before.json()["passed"] is False

        blocked = client.post(f"/incidents/{incident_id}/actions/ACT-DEMO/execute")
        assert blocked.status_code == 403
        approval = client.post(f"/incidents/{incident_id}/actions/ACT-DEMO/approval",
                               json={"decision": "approve", "decided_by": "demo.senior_sre",
                                     "reason": "Automated local smoke test"})
        approval.raise_for_status()
        executed = client.post(f"/incidents/{incident_id}/actions/ACT-DEMO/execute")
        executed.raise_for_status()
        assert executed.json()["verification"]["passed"] is True
        incident = client.get(f"/incidents/{incident_id}")
        incident.raise_for_status()
        assert incident.json()["status"] == "resolved"
        platform = client.get("/platform/health")
        platform.raise_for_status()
        assert all(service["status"] == "healthy" for service in platform.json()["services"])
        postmortem = client.get(f"/incidents/{incident_id}/postmortem")
        postmortem.raise_for_status()
        print(f"Compose smoke passed: {incident_id}, Kafka connected, approval enforced, recovery verified")


if __name__ == "__main__":
    main()
