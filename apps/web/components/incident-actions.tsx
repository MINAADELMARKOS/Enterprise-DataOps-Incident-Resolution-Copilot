"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Action } from "@/lib/api";

export default function IncidentActions({ incidentId, actions }: { incidentId: string; actions: Action[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function invoke(actionId: string, operation: "approve" | "reject" | "execute" | "verify") {
    setBusy(`${actionId}:${operation}`); setError(null);
    const endpoint = operation === "verify" ? `/api/v1/incidents/${incidentId}/verify`
      : operation === "execute" ? `/api/v1/incidents/${incidentId}/actions/${actionId}/execute`
      : `/api/v1/incidents/${incidentId}/actions/${actionId}/approval`;
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" },
        body: operation === "approve" || operation === "reject" ? JSON.stringify({decision:operation,decided_by:"demo.senior_sre",reason:"Reviewed evidence in Incident Room"}) : "{}" });
      if (!response.ok) { const body = await response.json(); throw new Error(body.detail ?? "Action failed"); }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Action failed"); }
    finally { setBusy(null); }
  }
  return <div>{actions.map(action => <div className="action-item" key={action.id}>
    <div className="evidence-top"><strong>{action.action}</strong><span className={`badge badge-${action.status === "approved" || action.status === "executed" ? "success" : action.risk === "high" ? "critical" : "neutral"}`}>{action.status}</span></div>
    <p>{action.rationale}</p><div className="evidence-source">RISK {action.risk.toUpperCase()} · {action.id} {action.requires_approval ? "· HUMAN APPROVAL REQUIRED" : "· READ ONLY"}</div>
    {action.status === "proposed" && action.requires_approval && action.id === "ACT-DEMO" && <div className="button-row"><button className="button button-primary" disabled={!!busy} onClick={() => invoke(action.id,"approve")}>Approve demo recovery</button><button className="button button-danger" disabled={!!busy} onClick={() => invoke(action.id,"reject")}>Reject</button></div>}
    {action.status === "approved" && action.id === "ACT-DEMO" && <div className="button-row"><button className="button button-primary" disabled={!!busy} onClick={() => invoke(action.id,"execute")}>Execute allowlisted demo action</button></div>}
  </div>)}
    {error && <div className="error-box" role="alert">{error}</div>}
    <div className="panel-body"><button className="button" disabled={!!busy} onClick={() => invoke("", "verify")}>Recheck recovery criteria</button></div>
  </div>;
}
