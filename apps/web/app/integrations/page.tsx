import { apiGet } from "@/lib/api";
import { Badge, PageHeading, Panel, Unavailable } from "@/components/ui";

type Integration={name:string;status:string;capabilities:string[];last_sync:string|null};
export default async function Integrations(){const items=await apiGet<Integration[]>("/integrations");if(!items)return <><PageHeading eyebrow="Platform / Connectors" title="Integrations" /><Unavailable /></>;
  return <><PageHeading eyebrow="Platform / Connectors" title="Integrations" description="Connection status and capabilities for demo services and planned adapters." />
    <Panel title="Connector inventory" detail={`${items.length} listed`}><div className="table-scroll"><table><thead><tr><th>Integration</th><th>Status</th><th>Capabilities</th><th>Last sync</th></tr></thead><tbody>{items.map(item=><tr key={item.name}><td><strong>{item.name}</strong></td><td><Badge tone={item.status.includes("connected")?"success":item.status.includes("planned")?"neutral":"warning"}>{item.status}</Badge></td><td>{item.capabilities.join(", ")||"—"}</td><td>{item.last_sync??"—"}</td></tr>)}</tbody></table></div></Panel>
  </>;
}
