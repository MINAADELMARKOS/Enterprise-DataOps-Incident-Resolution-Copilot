import { apiGet } from "@/lib/api";
import { Badge, PageHeading, Panel, Unavailable } from "@/components/ui";

type About={creator:{name:string;title:string};product:string};
export default async function Administration(){const about=await apiGet<About>("/about");if(!about)return <><PageHeading eyebrow="Platform / Settings" title="Administration" /><Unavailable /></>;
  return <><PageHeading eyebrow="Platform / Settings" title="Administration" description="Deployment mode, security boundaries and configured product identity." />
    <div className="grid grid-2"><Panel title="Environment"><div className="panel-body"><div className="check-row"><span>Mode</span><Badge tone="warning">LOCAL DEMO</Badge></div><div className="check-row"><span>Tenant</span><strong className="mono">demo</strong></div><div className="check-row"><span>Creator</span><strong>{about.creator.name}</strong></div></div></Panel>
      <Panel title="Access controls"><div className="panel-body"><div className="callout callout-warning"><strong>Production access is disabled.</strong><p>Demo identity is fixed on the server. Configure an OIDC provider and role policy before exposing a production deployment.</p></div></div></Panel></div>
  </>;
}
