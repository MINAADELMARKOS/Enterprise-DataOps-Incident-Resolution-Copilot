"use client";

import { useMemo, useState } from "react";
import type { Topology } from "@/lib/api";
import { Badge } from "@/components/ui";

const positions: Record<string, [number, number]> = {
  "orders-producer": [25, 190], "broker-02": [205, 52], "orders.events": [205, 190],
  "orders-consumer": [385, 190], "order_stream_job": [565, 190],
  "fact_orders": [745, 190], "revenue-dashboard": [745, 325],
};

export default function TopologyCanvas({ topology }: { topology: Topology }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const active = topology.nodes.find(node => node.id === selected);
  const downstream = useMemo(() => {
    if (!selected) return [];
    const children: Record<string, string[]> = {};
    for (const edge of topology.edges) (children[edge.from] ??= []).push(edge.to);
    const seen = new Set<string>(); const next = [selected];
    while (next.length) for (const child of children[next.pop()!] ?? []) if (!seen.has(child)) { seen.add(child); next.push(child); }
    return [...seen];
  }, [selected, topology.edges]);
  return <><div className="topology-wrap"><div className="topology-toolbar">
    <input className="form-input" aria-label="Search entities" placeholder="Search entities…" value={search} onChange={event => setSearch(event.target.value)} />
    <button className="button" onClick={() => setZoom(Math.max(.65,zoom-.15))} aria-label="Zoom out">−</button><button className="button" onClick={() => setZoom(Math.min(1.4,zoom+.15))} aria-label="Zoom in">+</button>
  </div><div className="topology-canvas" style={{ "--zoom": zoom } as React.CSSProperties}>
    <svg width="900" height="450" style={{position:"absolute",inset:0,pointerEvents:"none"}} aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" /></marker></defs>
      {topology.edges.map(edge => { const a=positions[edge.from];const b=positions[edge.to];if(!a||!b)return null;const x1=a[0]+142,y1=a[1]+25,x2=b[0],y2=b[1]+25;const vertical=edge.from==="broker-02"||edge.to==="revenue-dashboard";return <path key={`${edge.from}-${edge.to}`} className="topology-edge" d={vertical ? `M ${a[0]+71} ${a[1]+50} L ${b[0]+71} ${b[1]}` : `M ${x1} ${y1} L ${x2} ${y2}`} strokeDasharray={edge.relationship==="HOSTED_ON"?"4 4":undefined}/>;})}
    </svg>
    {topology.nodes.map((node,index) => { const [x,y]=positions[node.id]??[25+(index%4)*180,190+Math.floor(index/4)*130]; const dim=search&&!`${node.name} ${node.type}`.toLowerCase().includes(search.toLowerCase());return <button type="button" key={node.id} className={`topology-node ${selected===node.id?"selected":""}`} style={{left:x,top:y,opacity:dim ? .35 : 1}} onClick={()=>setSelected(node.id)}><span>{node.type.replaceAll("_"," ")}</span><strong>{node.name}</strong></button>;})}
  </div></div><div className="topology-details"><div className="evidence-top"><h3>{active?.name??"Select an entity"}</h3>{active&&<Badge tone="info">{active.type}</Badge>}</div>
    <p>{active ? `${downstream.length} downstream entities in the seeded orders pipeline.` : "Click a node to inspect its downstream blast radius. Use search and zoom to navigate."}</p>
    {active&&<div className="scenario-tags">{downstream.map(id=><Badge key={id}>{id}</Badge>)}</div>}
  </div></>;
}
