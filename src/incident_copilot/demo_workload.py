"""Small real Kafka producer/consumer workload; ReplayLab storage signals remain simulated."""

import json
import os
import sys
import time
from uuid import uuid4

from kafka import KafkaConsumer, KafkaProducer
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError


def _brokers() -> list[str]:
    return os.getenv("KAFKA_BOOTSTRAP_SERVERS", "broker:19092").split(",")


def ensure_topic() -> None:
    while True:
        try:
            admin = KafkaAdminClient(bootstrap_servers=_brokers(), request_timeout_ms=5000)
            try:
                admin.create_topics([NewTopic(name="orders.events", num_partitions=1, replication_factor=1)])
            except TopicAlreadyExistsError:
                pass
            admin.close()
            return
        except Exception as exc:
            print(f"Kafka demo workload waiting for broker ({type(exc).__name__})", flush=True)
            time.sleep(5)


def produce() -> None:
    ensure_topic()
    producer = KafkaProducer(bootstrap_servers=_brokers(), value_serializer=lambda value: json.dumps(value).encode())
    while True:
        order = {"order_id": str(uuid4()), "amount": 29.95, "created_at": time.time()}
        producer.send("orders.events", order).get(timeout=10)
        time.sleep(2)


def consume() -> None:
    ensure_topic()
    consumer = KafkaConsumer("orders.events", bootstrap_servers=_brokers(), group_id="orders-demo-consumer",
                             auto_offset_reset="earliest", enable_auto_commit=True,
                             value_deserializer=lambda raw: json.loads(raw.decode()))
    for message in consumer:
        print(f"Consumed demo order {message.value['order_id']}", flush=True)


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"producer", "consumer"}:
        raise SystemExit("Usage: python -m incident_copilot.demo_workload [producer|consumer]")
    produce() if sys.argv[1] == "producer" else consume()
