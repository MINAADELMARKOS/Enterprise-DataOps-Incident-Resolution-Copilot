import Link from "next/link";
import { apiGet } from "@/lib/api";
import { PageHeading, Panel, Unavailable } from "@/components/ui";

type Postmortem = { incident_id: string; summary: string; impact: string[]; timeline: {at:string;event:string}[]; probable_root_cause:string[]; evidence_ids:string[]; verification:string; preventive_actions:string[]; mode:string };
export default async function PostmortemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await apiGet<Postmortem>(`/incidents/${encodeURIComponent(id)}/postmortem`);
  if (!post) return <><PageHeading eyebrow="Incident Room / Postmortem" title="Postmortem unavailable" /><Unavailable /></>;
  return <><PageHeading eyebrow="Incident Room / Postmortem" title={`${post.incident_id} postmortem`} description="Generated draft. Engineers should review the evidence before sharing." action={<Link href={`/incidents/${id}`} className="button">← Incident Room</Link>} />
    <div className="grid grid-2"><Panel title="Summary"><div className="panel-body"><p>{post.summary}</p></div></Panel><Panel title="Impact"><div className="panel-body">{post.impact.join(", ")}</div></Panel><Panel title="Probable root cause"><div className="panel-body">{post.probable_root_cause.join("; ")}</div></Panel><Panel title="Resolution verification"><div className="panel-body">{post.verification}</div></Panel><Panel title="Preventive actions"><div className="panel-body"><ul>{post.preventive_actions.map(text=><li key={text}>{text}</li>)}</ul></div></Panel><Panel title="Evidence references"><div className="panel-body mono small">{post.evidence_ids.join(", ")}</div></Panel></div>
  </>;
}
