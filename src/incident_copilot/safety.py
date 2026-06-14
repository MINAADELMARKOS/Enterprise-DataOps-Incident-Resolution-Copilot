import re

SECRET_PATTERNS = [
    re.compile(r"(?i)(password|secret|token|api[_-]?key)\s*[=:]\s*\S+"),
    re.compile(r"\b[\w.-]+@[\w.-]+\.\w+\b"),
]
DANGEROUS_TERMS = ("restart", "delete", "drop", "truncate", "chmod", "chown", "change config", "send message")

def redact_sensitive(text: str) -> str:
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted

def requires_approval(action: str) -> bool:
    return any(term in action.lower() for term in DANGEROUS_TERMS)
