import Image from "next/image";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { PageHeading, Panel, Unavailable } from "@/components/ui";

type About={product:string;tagline:string;statement:string;creator:{name:string;title:string;github_url:string;linkedin_url:string;portfolio_url:string|null}};
export default async function AboutPage(){const about=await apiGet<About>("/about");if(!about)return <><PageHeading eyebrow="Platform / About" title="About InvestiNator" /><Unavailable /></>;
  return <><PageHeading eyebrow="Platform / About" title="About InvestiNator" /><div className="about-hero"><Image src="/brand/investinator-mark.svg" width={52} height={52} alt="InvestiNator mark" /><div className="eyebrow" style={{marginTop:20}}>DATAOPS CONTROL PLANE</div><h1>{about.tagline}</h1><p>{about.statement}</p><Link className="button button-primary" href="/">Open Command Center →</Link></div>
    <div className="grid grid-2 section-gap"><Panel title="How it works"><div className="panel-body"><ol className="inline-list">{["Observe operational signals","Detect anomalies deterministically","Correlate alerts through topology","Investigate with inspectable evidence","Recommend a policy controlled action","Verify every recovery symptom","Learn from the incident record"].map(step=><li key={step}>{step}</li>)}</ol></div></Panel>
      <Panel title="Creator"><div className="panel-body"><h2 style={{marginTop:0}}>{about.creator.name}</h2><p className="text-muted">{about.creator.title}</p><p className="text-muted">Designed and engineered by {about.creator.name}. InvestiNator is built as a focused DataOps operations platform.</p><div className="button-row" style={{marginTop:20}}>{about.creator.github_url&&<a className="button" href={about.creator.github_url} target="_blank" rel="noreferrer">GitHub ↗</a>}{about.creator.linkedin_url&&<a className="button" href={about.creator.linkedin_url} target="_blank" rel="noreferrer">LinkedIn ↗</a>}{about.creator.portfolio_url&&<a className="button" href={about.creator.portfolio_url} target="_blank" rel="noreferrer">Portfolio ↗</a>}</div></div></Panel></div>
  </>;
}
