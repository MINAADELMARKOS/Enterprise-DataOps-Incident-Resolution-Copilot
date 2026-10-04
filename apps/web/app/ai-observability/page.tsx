import { apiGet } from "@/lib/api";
import { Badge, EmptyState, PageHeading, Panel, Unavailable } from "@/components/ui";

type Usage={model_calls:number;input_tokens:number;output_tokens:number;failures:number;mode:string;recent:{model:string;task:string;latency_ms:number;input_tokens:number;output_tokens:number;status:string}[]};
type Evaluation={id:string;replay_id:string;score:number;detection:boolean;correlation:boolean;verification:boolean};
export default async function AIObservability(){const [usage,evaluations]=await Promise.all([apiGet<Usage>("/ai/usage"),apiGet<Evaluation[]>("/evaluations")]);if(!usage||!evaluations)return <><PageHeading eyebrow="Platform / AI" title="AI Observability" /><Unavailable /></>;
  return <><PageHeading eyebrow="Platform / AI" title="AI Observability" description="Model usage, failures and replay evaluations, with no fabricated AI scores." />
    <div className="grid grid-4 block-gap">
      <div className="stat-card"><span className="stat-label">Model calls</span><strong>{usage.model_calls}</strong><span className="stat-foot">{usage.mode}</span></div>
      <div className="stat-card"><span className="stat-label">Input tokens</span><strong>{usage.input_tokens.toLocaleString()}</strong><span className="stat-foot">Recorded usage</span></div>
      <div className="stat-card"><span className="stat-label">Output tokens</span><strong>{usage.output_tokens.toLocaleString()}</strong><span className="stat-foot">Recorded usage</span></div>
      <div className="stat-card"><span className="stat-label">Failed calls</span><strong>{usage.failures}</strong><span className="stat-foot">Fallback remains available</span></div>
    </div><div className="grid grid-2"><Panel title="Recent model activity" detail={`${usage.recent.length} calls`}>{usage.recent.length?<div className="table-scroll"><table><thead><tr><th>Model</th><th>Task</th><th>Latency</th><th>Status</th></tr></thead><tbody>{usage.recent.map((item,index)=><tr key={index}><td><strong>{item.model}</strong></td><td>{item.task}</td><td className="mono">{item.latency_ms} ms</td><td><Badge tone={item.status==="ok"?"success":"warning"}>{item.status}</Badge></td></tr>)}</tbody></table></div>:<EmptyState title="No model calls" detail="Set an OpenAI API key and model name to enable optional structured investigations." />}</Panel>
      <Panel title="Replay evaluations" detail={`${evaluations.length} runs`}>{evaluations.length?evaluations.map(item=><div className="action-item" key={item.id}><div className="evidence-top"><strong className="mono">{item.replay_id}</strong><Badge tone={item.verification?"success":"warning"}>{Math.round(item.score*100)}%</Badge></div><p>Detection {item.detection?"passed":"failed"} · Correlation {item.correlation?"passed":"failed"} · Verification {item.verification?"passed":"failed"}</p></div>):<EmptyState title="No evaluations" detail="Complete a ReplayLab scenario to record an evaluation." />}</Panel></div>
  </>;
}
