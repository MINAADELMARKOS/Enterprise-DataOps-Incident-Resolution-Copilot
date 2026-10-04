import { apiGet, type Metric } from "@/lib/api";
import { Badge, EmptyState, PageHeading, Panel, Unavailable } from "@/components/ui";

type Signal = {id:string;entity_id:string;observed_at:string;message?:string;name?:string;mode?:string};
export default async function Explore() {
  const [metrics, logs, events, traces] = await Promise.all([
    apiGet<{items:Metric[]}>("/telemetry/metrics"), apiGet<{items:Signal[]}>("/telemetry/logs"),
    apiGet<{items:Signal[]}>("/telemetry/events"), apiGet<{items:Signal[]}>("/telemetry/traces"),
  ]);
  if (!metrics) return <><PageHeading eyebrow="Workspace / Telemetry" title="Explore" /><Unavailable /></>;
  return <><PageHeading eyebrow="Workspace / Telemetry" title="Explore" description="Inspect stored metrics, logs, events and traces linked to the demo environment." />
    <div className="grid grid-4 block-gap">{[["Metrics",metrics.items.length],["Logs",logs?.items.length??0],["Events",events?.items.length??0],["Traces",traces?.items.length??0]].map(([label,count])=><div className="stat-card" key={label}><span className="stat-label">{label}</span><strong>{count}</strong><span className="stat-foot">Stored signals</span></div>)}</div>
    <div className="grid grid-2"><Panel title="Latest metrics" detail="Current values"><div className="table-scroll"><table><thead><tr><th>Signal</th><th>Entity</th><th>Value</th></tr></thead><tbody>{metrics.items.map(item=><tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.entity_id}</td><td className="mono">{item.value} {item.unit}</td></tr>)}</tbody></table></div></Panel>
    <Panel title="Operational logs" detail={`${logs?.items.length??0} records`}>{logs?.items.length?<div className="table-scroll"><table><thead><tr><th>Time</th><th>Entity</th><th>Message</th></tr></thead><tbody>{logs.items.map(item=><tr key={item.id}><td className="mono">{new Date(item.observed_at).toLocaleTimeString()}</td><td>{item.entity_id}</td><td>{item.message}</td></tr>)}</tbody></table></div>:<EmptyState title="No logs yet" detail="ReplayLab fault scenarios create demo log records." />}</Panel>
    <Panel title="Events" detail={`${events?.items.length??0} records`}>{events?.items.length?<div className="panel-body">{events.items.map(item=><div className="check-row" key={item.id}><span>{item.message}</span><Badge tone="info">{item.entity_id}</Badge></div>)}</div>:<EmptyState title="No events yet" detail="Start a ReplayLab run to see the change timeline." />}</Panel>
    <Panel title="Traces" detail={`${traces?.items.length??0} records`}>{traces?.items.length?<div className="panel-body">{traces.items.map(item=><p key={item.id}>{item.message}</p>)}</div>:<EmptyState title="No traces connected" detail="The collector is configured, but the demo does not persist traces yet." />}</Panel></div>
  </>;
}
