from incident_copilot.agents import run_workflow
from incident_copilot.safety import redact_sensitive
from incident_copilot.schemas import IncidentRequest, Technology


def test_kafka_incident_requires_approval_for_restart():
    response = run_workflow(IncidentRequest(description="Kafka consumer lag rising", logs="ERROR DiskErrorException broker-2"))
    assert response.technology is Technology.kafka
    assert response.approval_required is True
    assert any(action.requires_approval for action in response.recovery_actions)


def test_unknown_incident_returns_insufficient_evidence():
    response = run_workflow(IncidentRequest(description="Something odd happened"))
    assert response.technology is Technology.unknown
    assert response.likely_root_causes == ["insufficient_evidence"]


def test_redacts_secrets_and_email_addresses():
    text = redact_sensitive("password=hunter2 contact jane@example.com")
    assert "hunter2" not in text
    assert "jane@example.com" not in text
