"use client";

import { useState } from "react";
import type { Incident } from "@/lib/api";
import { Badge } from "@/components/ui";

type Message = { role: "user" | "assistant"; content: string; evidence_ids?: string[] };
export default function InvestigatorChat({ incidents, defaultIncident }: { incidents: Incident[]; defaultIncident?: string }) {
  const [incidentId, setIncidentId] = useState(defaultIncident || incidents[0]?.incident_id || "");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [mode, setMode] = useState("investigate");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = incidents.find(item => item.incident_id === incidentId);
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (!input.trim() || busy) return;
    const value=input.trim();setInput("");setMessages(items=>[...items,{role:"user",content:value}]);setBusy(true);setError(null);
    try { const response=await fetch("/api/v1/investigator/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversation_id:conversationId,incident_id:incidentId||null,mode,message:value})});
      const data=await response.json();if(!response.ok)throw new Error(data.detail??"Investigator unavailable");
      setConversationId(data.conversation_id);setMessages(items=>[...items,{role:"assistant",content:data.answer,evidence_ids:data.evidence_ids}]);
    }catch(cause){setError(cause instanceof Error?cause.message:"Investigator unavailable");}finally{setBusy(false);}
  }
  return <div className="chat-layout"><section className="panel chat-pane"><div className="panel-heading"><h2>Investigation conversation</h2><Badge tone="info">Evidence first</Badge></div>
    <div className="chat-mode">{["ask","investigate","fix"].map(value=><button key={value} type="button" className={mode===value?"selected":""} onClick={()=>setMode(value)}>{value.toUpperCase()}</button>)}</div>
    <div className="chat-messages" aria-live="polite">{messages.length===0&&<div className="callout"><strong>Start with a question.</strong><p>Select an incident and ask what changed, what evidence supports the hypothesis, or how to recover safely.</p></div>}
      {messages.map((item,index)=><div key={index} className={`chat-bubble ${item.role}`}><div className="small text-faint" style={{marginBottom:5}}>{item.role==="user"?"YOU":"INVESTINATOR"}</div>{item.content}{item.evidence_ids?.length? <div className="small text-faint" style={{marginTop:8}}>Evidence: {item.evidence_ids.join(", ")}</div>:null}</div>)}
      {busy&&<div className="chat-bubble assistant">Checking incident context and evidence…</div>}
    </div>{error&&<div className="error-box" role="alert">{error}</div>}
    <form className="chat-compose" onSubmit={send}><input className="form-input" aria-label="Message InvestiNator" placeholder="Ask about the incident…" value={input} onChange={event=>setInput(event.target.value)} /><button className="button button-primary" disabled={busy||!input.trim()}>Send →</button></form>
  </section><div className="stack"><section className="panel"><div className="panel-heading"><h2>Incident context</h2></div><div className="panel-body"><label className="form-label" htmlFor="incident-choice">INCIDENT</label><select id="incident-choice" className="form-select" value={incidentId} onChange={event=>{setIncidentId(event.target.value);setConversationId(null);setMessages([]);}}><option value="">Select incident</option>{incidents.map(item=><option key={item.incident_id} value={item.incident_id}>{item.incident_id} · {item.technology}</option>)}</select><p className="text-muted small">{current?.executive_summary??"No incident selected. Start a ReplayLab scenario to create one."}</p></div></section>
    <section className="panel"><div className="panel-heading"><h2>Evidence</h2><span>{current?.evidence.length??0} items</span></div>{current?.evidence.slice(0,6).map(item=><div key={item.id} className="evidence-item"><div className="evidence-top"><strong className="mono">{item.id}</strong><Badge tone="info">{item.kind}</Badge></div><p>{item.snippet}</p></div>)??<div className="panel-body text-muted">Select an incident to inspect evidence.</div>}</section>
  </div></div>;
}
