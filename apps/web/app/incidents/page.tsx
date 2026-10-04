import Link from "next/link";
import { apiGet, type Incident } from "@/lib/api";
import { IncidentsTable, PageHeading, Panel, Unavailable } from "@/components/ui";

export default async function Incidents() {
  const incidents = await apiGet<Incident[]>("/incidents");
  if (!incidents) return <><PageHeading eyebrow="Workspace / Incidents" title="Incidents" /><Unavailable /></>;
  return <><PageHeading eyebrow="Workspace / Incidents" title="Incidents" description="Investigations, evidence, decisions and verification in one record."
    action={<Link href="/replaylab" className="button button-primary">▷ Start scenario</Link>} />
    <div className="grid grid-3 block-gap">
      <div className="stat-card"><span className="stat-label">Total incidents</span><strong>{incidents.length}</strong><span className="stat-foot">Persisted in the operations database</span></div>
      <div className="stat-card warning"><span className="stat-label">Open</span><strong>{incidents.filter(item => item.status !== "resolved").length}</strong><span className="stat-foot">Need investigation or recovery</span></div>
      <div className="stat-card accent"><span className="stat-label">Verified resolved</span><strong>{incidents.filter(item => item.status === "resolved").length}</strong><span className="stat-foot">All recovery checks passed</span></div>
    </div><Panel title="Incident register" detail={`${incidents.length} records`}><IncidentsTable incidents={incidents} /></Panel>
  </>;
}
