import { apiGet, type Topology } from "@/lib/api";
import TopologyCanvas from "@/components/topology-canvas";
import { PageHeading, Panel, Unavailable } from "@/components/ui";

export default async function NerveMap() {
  const data = await apiGet<Topology>("/topology");
  if (!data) return <><PageHeading eyebrow="Workspace / Topology" title="NerveMap" /><Unavailable /></>;
  return <><PageHeading eyebrow="Workspace / Topology" title="NerveMap" description="Follow the order signal across infrastructure, processing and business data." />
    <div className="callout block-gap"><strong>Seeded demo lineage.</strong> Nodes and edges come from the backend topology store.</div>
    <Panel title="Orders pipeline" detail={`${data.nodes.length} entities · ${data.edges.length} relationships`}><TopologyCanvas topology={data} /></Panel>
  </>;
}
