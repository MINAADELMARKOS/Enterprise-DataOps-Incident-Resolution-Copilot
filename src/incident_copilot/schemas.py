from dataclasses import dataclass, field, replace
from enum import Enum

class Technology(str, Enum):
    hdfs = "HDFS"
    spark = "Spark"
    kafka = "Kafka"
    kudu = "Kudu"
    nifi = "NiFi"
    api = "API"
    unknown = "Unknown"

@dataclass
class IncidentRequest:
    description: str
    logs: str = ""
    metrics: dict[str, float | int | str] = field(default_factory=dict)

@dataclass
class Evidence:
    source: str
    snippet: str
    score: float

    def model_copy(self, update: dict | None = None) -> "Evidence":
        return replace(self, **(update or {}))

@dataclass
class RecoveryAction:
    action: str
    rationale: str
    dangerous: bool = False
    requires_approval: bool = False

    def model_copy(self, update: dict | None = None) -> "RecoveryAction":
        return replace(self, **(update or {}))

@dataclass
class IncidentResponse:
    technology: Technology
    confidence: float
    likely_root_causes: list[str]
    evidence: list[Evidence]
    recovery_actions: list[RecoveryAction]
    approval_required: bool
    engineering_report: str
    executive_summary: str
