import Link from "next/link";
import type { Incident } from "@/lib/api";

export function PageHeading({ eyebrow, title, description, action, hero = false }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode; hero?: boolean }) {
  return <div className={`page-heading${hero ? " page-heading-hero" : ""}`}><div><div className="eyebrow">{eyebrow}</div><h1 className={hero ? "cyber-glitch" : undefined} data-text={hero ? title : undefined} aria-label={hero ? title : undefined}>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="heading-action">{action}</div>}</div>;
}

export function Panel({ title, detail, children, className = "", variant = "default", hoverEffect = false }: { title: string; detail?: string; children: React.ReactNode; className?: string; variant?: "default" | "terminal" | "holographic"; hoverEffect?: boolean }) {
  return <section className={`panel panel-${variant}${hoverEffect ? " panel-hover" : ""} ${className}`}>
    {variant === "terminal" && <div className="terminal-chrome" aria-hidden="true"><span /><span /><span /><i>INVESTINATOR://OPS</i></div>}
    <div className="panel-heading"><h2>{title}</h2>{detail && <span>{detail}</span>}</div>{children}
  </section>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "critical" | "warning" | "success" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <Badge tone={severity === "P1" ? "critical" : severity === "P2" ? "warning" : "info"}>{severity}</Badge>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-mark">◎</span><strong>{title}</strong><p>{detail}</p></div>;
}

export function Unavailable() { return <EmptyState title="InvestiNator API unavailable" detail="Start the API service to load operational data. The interface will reconnect on refresh." />; }

export function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) return <EmptyState title="No active incidents" detail="Start a ReplayLab scenario to observe the detection and investigation workflow." />;
  return <div className="table-scroll"><table><thead><tr><th>Priority</th><th>Incident</th><th>System</th><th>Impact</th><th>State</th><th>Open</th></tr></thead><tbody>
    {incidents.map(item => <tr key={item.incident_id}><td><SeverityBadge severity={item.severity} /></td>
      <td><strong>{item.incident_id}</strong><small>{item.likely_root_causes[0]}</small></td>
      <td>{item.technology}</td><td>{item.affected_entities.length} entities</td>
      <td><Badge tone={item.status === "resolved" ? "success" : "warning"}>{item.status}</Badge></td>
      <td><Link className="table-link" href={`/incidents/${item.incident_id}`}>View →</Link></td></tr>)}
  </tbody></table></div>;
}
