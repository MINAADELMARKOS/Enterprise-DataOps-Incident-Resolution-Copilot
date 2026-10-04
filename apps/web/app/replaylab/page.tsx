import { apiGet } from "@/lib/api";
import ReplayControls from "@/components/replay-controls";
import { PageHeading, Unavailable } from "@/components/ui";

type Scenario={id:string;name:string;systems:string[];difficulty:string;expected_root_cause:string;mode:string};
type Run={id:string;scenario:string;status:string;incident_id:string;mode:string;steps?:{metric:string;value:number}[]};
export default async function ReplayLab(){
  const [scenarios,runs]=await Promise.all([apiGet<Scenario[]>("/replay/scenarios"),apiGet<Run[]>("/replay/runs")]);
  if(!scenarios||!runs)return <><PageHeading eyebrow="Operations / Simulation" title="ReplayLab" /><Unavailable /></>;
  return <><PageHeading eyebrow="Operations / Simulation" title="ReplayLab" description="Run repeatable fault scenarios through detection, correlation, investigation and verification." />
    <div className="callout callout-warning" style={{marginBottom:17}}><strong>Simulated fault injection.</strong> These runs change backend demo telemetry. They do not change a live Kafka broker, Spark job, or production dataset.</div>
    <ReplayControls scenarios={scenarios} runs={runs} />
  </>;
}
