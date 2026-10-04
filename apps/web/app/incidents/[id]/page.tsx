import Link from "next/link";
import { apiGet, type Incident } from "@/lib/api";
import IncidentActions from "@/components/incident-actions";
import { Badge, PageHeading, Panel, SeverityBadge, Unavailable } from "@/components/ui";

export default async function IncidentRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await apiGet<Incident>(`/incidents/${encodeURIComponent(id)}`);
  if (!item) return <><PageHeading eyebrow="Workspace / Incident Room" title="Incident unavailable" /><Unavailable /></>;
  return <><PageHeading eyebrow="Workspace / Incident Room" title={item.incident_id} description={item.executive_summary}
    action={<div className="button-row"><SeverityBadge severity={item.severity} /><Badge tone={item.status === "resolved" ? "success" : "warning"}>{item.status}</Badge></div>} />
    <div className="grid grid-4">
      <div className="stat-card"><span className="stat-label">Technology</span><strong style={{fontSize:22}}>{item.technology}</strong><span className="stat-foot">Incident domain</span></div>
      <div className="stat-card"><span className="stat-label">Confidence</span><strong>{Math.round(item.confidence*100)}%</strong><span className="stat-foot">Fallback classification</span></div>
      <div className="stat-card"><span className="stat-label">Evidence</span><strong>{item.evidence.length}</strong><span className="stat-foot">Inspectable records</span></div>
      <div className="stat-card"><span className="stat-label">Affected entities</span><strong>{item.affected_entities.length}</strong><span className="stat-foot">Topology linked</span></div>
    </div>
    <div className="grid wide-left section-gap"><div className="stack">
      <Panel title="Probable root cause" detail="Hypothesis · inspect evidence"><div className="panel-body"><div className="callout callout-warning"><strong>{item.likely_root_causes[0]}</strong><p className="text-muted small">Evidence supports a probable cause. Review metrics and logs before acting.</p></div>
        <div className="button-row" style={{marginTop:14}}><Link className="button" href={`/investigator?incident=${item.incident_id}`}>Open Investigator →</Link><Link className="button" href="/nervemap">View NerveMap →</Link>{item.status === "resolved" && <Link className="button" href={`/incidents/${item.incident_id}/postmortem`}>View postmortem →</Link>}</div></div></Panel>
      <Panel title="EvidenceGraph" detail="Facts and source references">{item.evidence.map(evidence => <div className="evidence-item" key={evidence.id}><div className="evidence-top"><strong className="mono">{evidence.id}</strong><Badge tone={evidence.kind === "metric" ? "info" : evidence.kind === "log" ? "warning" : "neutral"}>{evidence.kind}</Badge></div><p>{evidence.snippet}</p><div className="evidence-source">{evidence.source}</div></div>)}</Panel>
      <Panel title="Remediation plan" detail="Policy-gated actions"><IncidentActions incidentId={item.incident_id} actions={item.recovery_actions} /></Panel>
    </div><div className="stack">
      <Panel title="Incident timeline" detail={`${item.timeline.length} events`}><div className="timeline">{item.timeline.map((entry,index) => <div className="timeline-item" key={`${entry.at}-${index}`}><div className="timeline-rail"><span className="timeline-dot" /></div><div><strong>{entry.event}</strong><small>{new Date(entry.at).toLocaleString()} · {entry.kind}</small></div></div>)}</div></Panel>
      <Panel title="Blast radius" detail="Affected path"><div className="panel-body"><p className="text-muted">{item.affected_entities.join(" → ") || "No topology entity identified."}</p><Link className="table-link" href="/nervemap">Inspect dependencies →</Link></div></Panel>
      <Panel title="Engineering report" detail="Deterministic analysis"><div className="panel-body"><p className="mono small text-muted">{item.engineering_report}</p></div></Panel>
    </div></div>
  </>;
}
