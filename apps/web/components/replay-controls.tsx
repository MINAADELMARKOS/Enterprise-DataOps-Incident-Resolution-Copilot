"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui";

type Scenario={id:string;name:string;systems:string[];difficulty:string;expected_root_cause:string;mode:string};
type Run={id:string;scenario:string;status:string;incident_id:string;mode:string;steps?:{metric:string;value:number;alert?:{message:string}|null}[];ground_truth?:string};
export default function ReplayControls({scenarios,runs}:{scenarios:Scenario[];runs:Run[]}) {
  const router=useRouter();const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);
  async function start(id:string){setBusy(id);setError(null);try{const response=await fetch("/api/v1/replay/runs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenario:id})});const data=await response.json();if(!response.ok)throw new Error(data.detail??"Replay failed");router.push(`/incidents/${data.incident_id}`);router.refresh();}catch(cause){setError(cause instanceof Error?cause.message:"Replay failed");}finally{setBusy(null);}}
  return <><div className="grid grid-3">{scenarios.map(item=><div key={item.id} className="panel scenario-card"><div className="scenario-head"><h3>{item.name}</h3><Badge tone="info">{item.difficulty}</Badge></div><p>Ground truth: {item.expected_root_cause}</p><div className="scenario-tags">{item.systems.map(system=><Badge key={system}>{system}</Badge>)}</div><div className="top-gap"><button className="button button-primary" disabled={!!busy} onClick={()=>start(item.id)}>{busy===item.id?"Injecting…":"▷ Start scenario"}</button></div></div>)}</div>
    {error&&<div className="error-box section-gap" role="alert">{error}</div>}
    <div className="panel section-gap"><div className="panel-heading"><h2>Replay runs</h2><span>{runs.length} recorded</span></div>{runs.length?<div className="table-scroll"><table><thead><tr><th>Scenario</th><th>Status</th><th>Incident</th><th>Signals</th></tr></thead><tbody>{runs.map(run=><tr key={run.id}><td><strong>{run.scenario.replaceAll("_"," ")}</strong><small>{run.mode}</small></td><td><Badge tone={run.status==="completed"?"success":"warning"}>{run.status}</Badge></td><td><Link className="table-link" href={`/incidents/${run.incident_id}`}>{run.incident_id} →</Link></td><td>{run.steps?.length??0} injected</td></tr>)}</tbody></table></div>:<div className="empty-state"><strong>No runs yet</strong><p>Start a scenario to create telemetry, alerts and an incident.</p></div>}</div>
  </>;
}
