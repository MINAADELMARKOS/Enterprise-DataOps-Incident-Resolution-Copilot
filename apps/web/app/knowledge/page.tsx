import { apiGet } from "@/lib/api";
import { Badge, EmptyState, PageHeading, Panel, Unavailable } from "@/components/ui";

type Knowledge={id:string;title:string;technology:string;source:string;content:string};
export default async function KnowledgePage(){const items=await apiGet<Knowledge[]>("/knowledge");if(!items)return <><PageHeading eyebrow="Operations / Memory" title="Knowledge" /><Unavailable /></>;
  return <><PageHeading eyebrow="Operations / Memory" title="Knowledge" description="Tenant scoped runbook memory for the orders pipeline." />
    <Panel title="Knowledge library" detail={`${items.length} documents`}>{items.length?items.map(item=><div className="evidence-item" key={item.id}><div className="evidence-top"><strong>{item.title}</strong><Badge tone="info">{item.technology}</Badge></div><p>{item.content}</p><div className="evidence-source">{item.source}</div></div>):<EmptyState title="No knowledge" detail="No documents have been ingested for this environment." />}</Panel>
  </>;
}
