import Link from "next/link";
import { apiGet, type Incident } from "@/lib/api";
import { Badge, EmptyState, PageHeading, Panel, Unavailable } from "@/components/ui";

type Approval={incident_id:string;action_id:string;decision:string;actor:string;reason:string;created_at:string};
export default async function Approvals(){const [incidents,decisions]=await Promise.all([apiGet<Incident[]>("/incidents"),apiGet<Approval[]>("/approvals")]);if(!incidents||!decisions)return <><PageHeading eyebrow="Operations / Control" title="Approvals" /><Unavailable /></>;
  const pending=incidents.flatMap(item=>item.recovery_actions.filter(action=>action.requires_approval&&action.status==="proposed").map(action=>({incident:item,action})));
  return <><PageHeading eyebrow="Operations / Control" title="Approvals" description="Review evidence before granting any risky demo action." />
    <div className="grid grid-2"><Panel title="Awaiting decision" detail={`${pending.length} actions`}>{pending.length?pending.map(({incident,action})=><div className="action-item" key={`${incident.incident_id}:${action.id}`}><div className="evidence-top"><strong>{action.action}</strong><Badge tone="warning">{action.risk}</Badge></div><p>{incident.incident_id} · {incident.technology} · {incident.evidence.length} evidence items</p><Link className="table-link" href={`/incidents/${incident.incident_id}`}>Review in Incident Room →</Link></div>):<EmptyState title="No pending approvals" detail="Start a ReplayLab scenario to generate a reviewable demo action." />}</Panel>
      <Panel title="Recent decisions" detail={`${decisions.length} recorded`}>{decisions.length?decisions.map(item=><div className="action-item" key={`${item.incident_id}:${item.action_id}`}><div className="evidence-top"><strong>{item.incident_id} · {item.action_id}</strong><Badge tone={item.decision==="approve"?"success":"critical"}>{item.decision}</Badge></div><p>{item.reason}</p><div className="evidence-source">{item.actor} · {new Date(item.created_at).toLocaleString()}</div></div>):<EmptyState title="No decisions yet" detail="Approval decisions are written to the audit trail." />}</Panel></div>
  </>;
}
