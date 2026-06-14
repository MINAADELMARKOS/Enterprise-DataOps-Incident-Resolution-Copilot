from fastapi import FastAPI
from .agents import run_workflow
from .schemas import IncidentRequest, IncidentResponse

app = FastAPI(title="Enterprise DataOps Incident Resolution Copilot")

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/incidents/analyze")
async def analyze_incident(request: IncidentRequest) -> IncidentResponse:
    return run_workflow(request)
