"""Read-only Kafka connectivity adapter for the optional Compose workload."""

import os


def kafka_health() -> dict:
    brokers = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    if not brokers:
        return {"status": "not-configured", "brokers": 0, "topics": [], "mode": "read-only"}
    try:
        from kafka.admin import KafkaAdminClient

        client = KafkaAdminClient(bootstrap_servers=brokers.split(","), request_timeout_ms=2000)
        topics = sorted(client.list_topics())
        cluster = client.describe_cluster()
        client.close()
        return {"status": "connected", "brokers": len(cluster.get("brokers", [])),
                "topics": topics[:50], "mode": "read-only"}
    except Exception as exc:
        return {"status": "unavailable", "brokers": 0, "topics": [],
                "error_type": type(exc).__name__, "mode": "read-only"}
