"""Allowlisted read-only investigation tools. Credentials never enter model context."""

from dataclasses import dataclass
from typing import Callable

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import KnowledgeRow
from .services import blast_radius, latest_metrics


class MetricQuery(BaseModel):
    name: str = Field(min_length=1, max_length=150)


class KnowledgeQuery(BaseModel):
    text: str = Field(min_length=1, max_length=300)


class TopologyQuery(BaseModel):
    entity_id: str = Field(min_length=1, max_length=200)


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    risk: str
    input_model: type[BaseModel]
    handler: Callable[[Session, str, BaseModel], dict]


def _metrics(db: Session, tenant: str, args: BaseModel) -> dict:
    wanted = MetricQuery.model_validate(args)
    return {"items": [item for item in latest_metrics(db, tenant) if item["name"] == wanted.name][:10]}


def _knowledge(db: Session, tenant: str, args: BaseModel) -> dict:
    wanted = KnowledgeQuery.model_validate(args)
    terms = set(wanted.text.lower().split())
    rows = db.scalars(select(KnowledgeRow).where(KnowledgeRow.tenant_id == tenant).limit(100)).all()
    ranked = sorted(rows, key=lambda row: len(terms.intersection((row.title + " " + row.content).lower().split())), reverse=True)
    return {"items": [{"id": item.id, "title": item.title, "source": item.source,
                       "excerpt": item.content[:1000]} for item in ranked[:5]]}


def _topology(db: Session, tenant: str, args: BaseModel) -> dict:
    wanted = TopologyQuery.model_validate(args)
    return {"downstream": blast_radius(db, tenant, wanted.entity_id)}


TOOLS = {
    "get_latest_metric": ToolSpec("get_latest_metric", "Read the latest stored metric values", "READ_ONLY", MetricQuery, _metrics),
    "search_knowledge": ToolSpec("search_knowledge", "Search tenant-scoped runbook content", "READ_ONLY", KnowledgeQuery, _knowledge),
    "get_blast_radius": ToolSpec("get_blast_radius", "Read downstream dependency impact", "READ_ONLY", TopologyQuery, _topology),
}


def execute_tool(db: Session, tenant: str, name: str, arguments: dict) -> dict:
    spec = TOOLS.get(name)
    if spec is None or spec.risk != "READ_ONLY":
        raise ValueError("Tool is not allowlisted for investigation")
    return spec.handler(db, tenant, spec.input_model.model_validate(arguments))
