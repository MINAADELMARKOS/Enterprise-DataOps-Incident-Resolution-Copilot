import { apiGet, type Metric } from "@/lib/api";
import { Badge, EmptyState, PageHeading, Panel, Unavailable } from "@/components/ui";

const sections = [
  { title: "Kafka", prefix: "kafka_" }, { title: "Spark", prefix: "spark_" },
  { title: "Data health", prefix: "dataset_" },
];

function label(name: string) { return name.replace(/^(kafka|spark|dataset)_/, "").replaceAll("_", " "); }

export default async function Pulse() {
  const data = await apiGet<{items: Metric[]; mode: string}>("/telemetry/metrics");
  if (!data) return <><PageHeading eyebrow="Workspace / Observability" title="Pulse" /><Unavailable /></>;
  return <><PageHeading eyebrow="Workspace / Observability" title="Pulse" description="Current metric readings from the backend telemetry store." />
    <div className="callout block-gap"><strong>Signal source: {data.mode}.</strong> ReplayLab changes these readings through the same ingestion and detection API.</div>
    <div className="grid grid-3">{sections.map(section => {
      const items = data.items.filter(item => item.name.startsWith(section.prefix));
      return <Panel key={section.title} title={section.title} detail={`${items.length} signals`}>
        {items.length ? <div className="metric-list">{items.map(item => {
          const danger = (item.name.includes("disk") && item.value > 90) || (item.name.includes("freshness") && item.value > 15) || (item.name.includes("lag") && item.value > 100000) || (item.name.includes("isr") && item.value < 95) || (item.name.includes("memory") && item.value > 90);
          const width = Math.max(3, Math.min(100, item.name.includes("lag") ? item.value / 25000 : item.value));
          return <div className="metric-row" key={`${item.entity_id}:${item.name}`}><span>{label(item.name)}<small>{item.entity_id}</small></span><strong>{item.value.toLocaleString()}{item.unit === "%" ? "%" : ` ${item.unit}`}</strong><div className="bar-track"><div className={`bar-fill ${danger ? "bad" : ""}`} style={{width:`${width}%`}} /></div></div>;
        })}</div> : <EmptyState title="No signals" detail="No metric adapter is configured for this system." />}
      </Panel>;
    })}</div>
    <div className="section-gap"><Panel title="Collection status" detail="Backend adapters"><div className="panel-body"><Badge tone="info">SIMULATED TELEMETRY</Badge><p className="text-muted">Prometheus can scrape the API’s `/metrics` endpoint. The OpenTelemetry Collector configuration is included with the Compose stack. Kafka and Spark source adapters are planned.</p></div></Panel></div>
  </>;
}
