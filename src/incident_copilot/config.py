"""Environment-backed application settings. No credentials are read into frontend code."""

import os
from dataclasses import dataclass
from functools import lru_cache


def _flag(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str
    demo_mode: bool
    demo_tenant: str
    openai_model: str | None
    openai_fast_model: str | None
    openai_reasoning_model: str | None
    openai_store: bool
    max_ai_calls: int
    creator_name: str
    creator_title: str
    github_url: str
    linkedin_url: str
    portfolio_url: str
    cors_origins: tuple[str, ...]


@lru_cache
def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./investinator.db"),
        demo_mode=_flag("INVESTINATOR_DEMO_MODE", True),
        demo_tenant=os.getenv("INVESTINATOR_DEMO_TENANT", "demo"),
        openai_model=os.getenv("INVESTINATOR_OPENAI_MODEL") or None,
        openai_fast_model=os.getenv("INVESTINATOR_OPENAI_FAST_MODEL") or None,
        openai_reasoning_model=os.getenv("INVESTINATOR_OPENAI_REASONING_MODEL") or None,
        openai_store=_flag("INVESTINATOR_OPENAI_STORE", False),
        max_ai_calls=max(1, min(10, int(os.getenv("INVESTINATOR_MAX_AI_CALLS", "3")))),
        creator_name=os.getenv("INVESTINATOR_CREATOR_NAME", "Mina Adel Markos"),
        creator_title=os.getenv("INVESTINATOR_CREATOR_TITLE", "Senior Big Data Engineer"),
        github_url=os.getenv("INVESTINATOR_GITHUB_URL", "https://github.com/MINAADELMARKOS"),
        linkedin_url=os.getenv("INVESTINATOR_LINKEDIN_URL", "https://www.linkedin.com/in/mina-markos-343b8b171"),
        portfolio_url=os.getenv("INVESTINATOR_PORTFOLIO_URL", ""),
        cors_origins=tuple(filter(None, os.getenv("INVESTINATOR_CORS_ORIGINS", "http://localhost:3000").split(","))),
    )
