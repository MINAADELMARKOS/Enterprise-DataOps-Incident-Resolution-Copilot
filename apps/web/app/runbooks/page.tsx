import { apiGet } from "@/lib/api";
import { Badge, PageHeading, Panel, Unavailable } from "@/components/ui";

type Knowledge={id:string;title:string;technology:string;source:string;content:string};
export default async function Runbooks(){const items=await apiGet<Knowledge[]>("/runbooks");if(!items)return <><PageHeading eyebrow="Operations / Guidance" title="Runbooks" /><Unavailable /></>;
  return <><PageHeading eyebrow="Operations / Guidance" title="Runbooks" description="Operational guidance used as evidence during investigations." />
    <div className="grid grid-2">{items.map(item=><Panel key={item.id} title={item.title} detail={item.technology}><div className="panel-body"><Badge tone="info">DEMO SEED</Badge><p className="text-muted" style={{lineHeight:1.6}}>{item.content}</p><div className="evidence-source">{item.source}</div></div></Panel>)}</div>
  </>;
}
