"""Deterministic application policy. Model output cannot authorize execution."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyDecision:
    outcome: str  # allow, approval_required, or deny
    reason: str


FORBIDDEN = ("delete topic", "drop table", "truncate table", "hdfs dfs -rm", "rm -rf")
APPROVAL = ("restart", "reassign", "change config", "cleanup", "move replicas")
READ_ONLY = ("get ", "query ", "check ", "inspect ", "search ", "describe ", "verify ", "collect ")


def evaluate_action(action: str, *, environment: str, role: str) -> PolicyDecision:
    normalized = action.strip().lower()
    if any(term in normalized for term in FORBIDDEN):
        return PolicyDecision("deny", "Destructive operation is forbidden by platform policy")
    if any(term in normalized for term in APPROVAL):
        if role not in {"SeniorSRE", "Administrator"}:
            return PolicyDecision("deny", "Role cannot approve write actions")
        return PolicyDecision("approval_required", f"Write action in {environment} requires a human decision")
    if normalized.startswith(READ_ONLY):
        return PolicyDecision("allow", "Allowlisted read-only operation")
    return PolicyDecision("deny", "Unrecognized action is not allowlisted")
