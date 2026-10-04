from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Technology(str, Enum):
    hdfs = "HDFS"
    spark = "Spark"
    kafka = "Kafka"
    kudu = "Kudu"
    nifi = "NiFi"
    api = "API"
    data = "Data"
    unknown = "Unknown"


class Severity(str, Enum):
    p1 = "P1"
    p2 = "P2"
    p3 = "P3"
    p4 = "P4"


class IncidentRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(min_length=1, max_length=10_000)
    logs: str = Field(default="", max_length=100_000)
    metrics: dict[str, float | int | str] = Field(default_factory=dict)
    environment: str = Field(default="demo", max_length=100)
    tenant_id: str = Field(default="demo", max_length=100)


class Evidence(BaseModel):
    id: str
    source: str
    kind: str = "runbook"
    snippet: str
    score: float = Field(ge=0, le=1)
    observed_at: str | None = None


class RecoveryAction(BaseModel):
    id: str
    action: str
    rationale: str
    risk: str = "low"
    dangerous: bool = False
    requires_approval: bool = False
    status: str = "proposed"


class IncidentResponse(BaseModel):
    incident_id: str
    status: str = "investigating"
    technology: Technology
    severity: Severity = Severity.p3
    confidence: float = Field(ge=0, le=1)
    environment: str = "demo"
    tenant_id: str = "demo"
    likely_root_causes: list[str]
    evidence: list[Evidence]
    recovery_actions: list[RecoveryAction]
    approval_required: bool
    affected_entities: list[str] = Field(default_factory=list)
    timeline: list[dict[str, Any]] = Field(default_factory=list)
    engineering_report: str
    executive_summary: str


class Signal(BaseModel):
    id: str
    source: str
    entity: str
    kind: str
    message: str
    observed_at: str
    severity: Severity = Severity.p3
    value: float | int | str | None = None


class ApprovalDecision(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    decided_by: str = Field(min_length=1, max_length=200)
    reason: str = Field(default="", max_length=2000)


class VerificationRequest(BaseModel):
    checks: dict[str, float | int | str | bool]
    verified_by: str = Field(default="system", max_length=200)


class MetricInput(BaseModel):
    entity_id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=150)
    value: float
    unit: str = Field(default="", max_length=30)
    observed_at: str | None = None
    labels: dict[str, str] = Field(default_factory=dict)


class ReplayStart(BaseModel):
    scenario: str


class ChatMessage(BaseModel):
    conversation_id: str | None = None
    incident_id: str | None = None
    mode: str = Field(default="investigate", pattern="^(ask|investigate|fix)$")
    message: str = Field(min_length=1, max_length=4000)
