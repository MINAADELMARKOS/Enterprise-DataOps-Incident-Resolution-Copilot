export type Severity = "P1" | "P2" | "P3" | "P4";
export type Evidence = { id: string; source: string; kind: string; snippet: string; score: number; observed_at?: string | null };
export type Action = { id: string; action: string; rationale: string; risk: string; dangerous: boolean; requires_approval: boolean; status: string };
export type Incident = { incident_id: string; status: string; technology: string; severity: Severity; confidence: number; likely_root_causes: string[]; evidence: Evidence[]; recovery_actions: Action[]; approval_required: boolean; affected_entities: string[]; timeline: { at: string; event: string; kind: string; evidence_id?: string }[]; executive_summary: string; engineering_report: string };
export type Metric = { id: string; entity_id: string; name: string; value: number; unit: string; observed_at: string; mode: string };
export type Health = { product: string; mode: string; overall_health: { score: number }; services: { name: string; status: string; score: number }[]; active_incidents: Incident[]; active_p1: number; active_p2: number; systems_degraded: number; datasets_delayed: number; business_impact: { affected_dashboards: number; slo_at_risk: boolean; mode: string }; operations: { mttd_seconds: number | null; mtti_seconds: number | null; mttr_seconds: number | null; alert_compression_ratio: number | null } };
export type Topology = { nodes: { id: string; name: string; type: string; criticality: number }[]; edges: { from: string; to: string; relationship: string }[]; mode: string };

const backend = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${backend}/api/v1${path}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}
