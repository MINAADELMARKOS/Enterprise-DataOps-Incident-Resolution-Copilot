import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  Clock3,
  Database,
  LayoutDashboard,
  ListFilter,
  Menu,
  Network,
  Play,
  Plug,
  ScanSearch,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import mark from "../../web/public/brand/investinator-mark.svg";
import { entities, links, routeGroups, scenarios, type Scenario } from "./data";

const repository =
  "https://github.com/MINAADELMARKOS/Enterprise-DataOps-Incident-Resolution-Copilot";
const page = (route: string) => `#${route}`;
const icons: Record<string, typeof Activity> = {
  "/": LayoutDashboard,
  "/pulse": Activity,
  "/incidents": ListFilter,
  "/nervemap": Network,
  "/explore": ScanSearch,
  "/investigator": Bot,
  "/replaylab": Play,
  "/runbooks": BookOpen,
  "/knowledge": Database,
  "/approvals": ShieldCheck,
  "/automations": Clock3,
  "/ai-observability": BarChart3,
  "/integrations": Plug,
  "/administration": Settings,
  "/about": UserRound,
};
type Stage = "investigating" | "approved" | "recovered" | "resolved";
type ChatMessage = { role: "user" | "assistant"; text: string };

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "critical" | "warning" | "success" | "info" | "neutral";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
function Panel({
  title,
  detail,
  children,
  variant = "default",
  className = "",
}: {
  title: string;
  detail?: string;
  children: ReactNode;
  variant?: "default" | "terminal" | "holographic";
  className?: string;
}) {
  return (
    <section className={`panel panel-${variant} ${className}`}>
      {variant === "terminal" && (
        <div className="terminal-chrome" aria-hidden="true">
          <span />
          <span />
          <span />
          <i>INVESTINATOR://PREVIEW</i>
        </div>
      )}
      <div className="panel-heading">
        <h2>{title}</h2>
        {detail && <span>{detail}</span>}
      </div>
      {children}
    </section>
  );
}
function Heading({
  eyebrow,
  title,
  description,
  action,
  hero = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  hero?: boolean;
}) {
  return (
    <div className={`page-heading${hero ? " page-heading-hero" : ""}`}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1
          className={hero ? "cyber-glitch" : undefined}
          data-text={hero ? title : undefined}
          aria-label={title}
        >
          {title}
        </h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
function Stat({
  label,
  value,
  foot,
  tone = "",
}: {
  label: string;
  value: ReactNode;
  foot: string;
  tone?: string;
}) {
  return (
    <div className={`stat-card ${tone}`}>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="stat-foot">{foot}</span>
    </div>
  );
}

function routeFromHash() {
  return decodeURIComponent(window.location.hash.slice(1) || "/");
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scenario, setScenario] = useState<Scenario>(scenarios[0]);
  const [stage, setStage] = useState<Stage>("investigating");
  const [entity, setEntity] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("investigate");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    const onHash = () => {
      setRoute(routeFromHash());
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const start = (item: Scenario) => {
    setScenario(item);
    setStage("investigating");
    setMessages([]);
    window.location.hash = page("/incidents/PREVIEW-001");
  };
  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    const answer = /fix|recover|action|remediat/i.test(text)
      ? `Recommended preview action: ${scenario.action} This public page cannot approve or execute anything. Open the local stack to use the policy-controlled workflow.`
      : /impact|blast|downstream/i.test(text)
        ? `Downstream impact reaches ${scenario.affected.join(", ")}. Open NerveMap to inspect the seeded lineage.`
        : `Likely cause: ${scenario.cause} Supporting synthetic evidence: ${scenario.evidence.map((item) => item.id).join(", ")}.`;
    setMessages((items) => [
      ...items,
      { role: "user", text },
      { role: "assistant", text: answer },
    ]);
    setQuestion("");
  };
  const selected = entities.find((item) => item.id === entity);
  const downstream = entity
    ? links.filter(([from]) => from === entity).map(([, to]) => to)
    : [];

  function content() {
    if (route.startsWith("/incidents/") && route.endsWith("/postmortem"))
      return (
        <>
          <Heading
            eyebrow="Operations / Learn"
            title="Postmortem"
            description="An example of the report produced after verified recovery."
          />
          <div className="callout block-gap">
            <strong>Synthetic preview.</strong> This report is not a record of a
            real incident.
          </div>
          <div className="grid grid-2">
            <Panel title="Executive summary">
              <div className="panel-body">
                <p>{scenario.symptom}</p>
                <p>The likely cause is {scenario.cause}</p>
                <Badge tone={stage === "resolved" ? "success" : "warning"}>
                  {stage === "resolved"
                    ? "Verified in preview"
                    : "Verification pending"}
                </Badge>
              </div>
            </Panel>
            <Panel title="Engineering record" variant="terminal">
              <div className="panel-body">
                <p>
                  <strong>Evidence:</strong>{" "}
                  {scenario.evidence.map((item) => item.id).join(", ")}
                </p>
                <p>
                  <strong>Action:</strong> {scenario.action}
                </p>
                <p>
                  <strong>Verification:</strong> Compare the relevant demo
                  metric with its threshold after recovery.
                </p>
              </div>
            </Panel>
          </div>
          <a
            className="button section-gap"
            href={page("/incidents/PREVIEW-001")}
          >
            ← Incident Room
          </a>
        </>
      );
    if (route.startsWith("/incidents/"))
      return (
        <>
          <Heading
            eyebrow="Workspace / Incident Room"
            title="PREVIEW-001"
            description={`${scenario.system} · ${scenario.title}`}
            action={
              <Badge tone={stage === "resolved" ? "success" : "warning"}>
                {stage}
              </Badge>
            }
          />
          <div className="callout block-gap">
            <strong>Local interaction only.</strong> Approval, recovery, and
            verification below change this browser preview only. They do not
            call an API.
          </div>
          <div className="grid grid-3 block-gap">
            <Stat
              label="Severity"
              value={scenario.severity}
              foot="Synthetic incident"
              tone="critical"
            />
            <Stat
              label="Evidence"
              value={scenario.evidence.length}
              foot="Inspectable signals"
            />
            <Stat
              label="Affected"
              value={scenario.affected.length}
              foot="Downstream entities"
            />
          </div>
          <div className="grid wide-left">
            <div className="stack">
              <Panel title="Hypothesis" detail="Evidence-backed">
                <div className="panel-body">
                  <p>{scenario.cause}</p>
                  <p className="text-muted">{scenario.symptom}</p>
                </div>
              </Panel>
              <Panel
                title="Evidence"
                detail={`${scenario.evidence.length} items`}
              >
                {scenario.evidence.map((item) => (
                  <div className="evidence-item" key={item.id}>
                    <div className="evidence-top">
                      <strong>{item.id}</strong>
                      <Badge tone="info">{item.source}</Badge>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </Panel>
              <Panel title="Timeline">
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="timeline-rail">
                      <i className="timeline-dot" />
                    </span>
                    <div>
                      <strong>Signals correlated</strong>
                      <small>Observe → Detect</small>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-rail">
                      <i className="timeline-dot" />
                    </span>
                    <div>
                      <strong>Incident opened</strong>
                      <small>Investigate → Recommend</small>
                    </div>
                  </div>
                  <div className="timeline-item">
                    <span className="timeline-rail">
                      <i className="timeline-dot" />
                    </span>
                    <div>
                      <strong>
                        {stage === "resolved"
                          ? "Recovery verified"
                          : "Recovery awaits verification"}
                      </strong>
                      <small>Fix → Verify → Learn</small>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
            <div className="stack">
              <Panel title="Blast radius" detail="Seeded lineage">
                <div className="panel-body">
                  <div className="scenario-tags">
                    {scenario.affected.map((item) => (
                      <Badge key={item}>{item}</Badge>
                    ))}
                  </div>
                  <div className="button-row section-gap">
                    <a className="button" href={page("/nervemap")}>
                      View NerveMap →
                    </a>
                    <a className="button" href={page("/investigator")}>
                      Ask Investigator →
                    </a>
                  </div>
                </div>
              </Panel>
              <Panel title="Controlled recovery" detail="Preview workflow">
                <div className="panel-body">
                  <p>{scenario.action}</p>
                  <div className="button-row">
                    <button
                      className="button button-secondary"
                      disabled={stage !== "investigating"}
                      onClick={() => setStage("approved")}
                    >
                      1. Approve preview
                    </button>
                    <button
                      className="button"
                      disabled={stage !== "approved"}
                      onClick={() => setStage("recovered")}
                    >
                      2. Simulate recovery
                    </button>
                    <button
                      className="button button-primary"
                      disabled={stage !== "recovered"}
                      onClick={() => setStage("resolved")}
                    >
                      3. Verify symptoms
                    </button>
                  </div>
                  <p className="small text-faint">
                    In the full local app, the backend records the decision,
                    writes allowlisted demo telemetry, and checks thresholds.
                  </p>
                  <a
                    className="table-link"
                    href={page("/incidents/PREVIEW-001/postmortem")}
                  >
                    Read postmortem →
                  </a>
                </div>
              </Panel>
            </div>
          </div>
        </>
      );
    switch (route) {
      case "/":
        return (
          <>
            <Heading
              eyebrow="Workspace / Overview"
              title="Command Center"
              hero
              description="A single view across platform signals, incidents, and downstream impact."
              action={
                <a className="button button-primary" href={page("/replaylab")}>
                  ▷ Explore ReplayLab
                </a>
              }
            />
            <div className="callout block-gap">
              <strong>Public UI preview.</strong> All readings are synthetic and
              fixed for this browser. Run the local stack for telemetry
              ingestion and saved workflows.
            </div>
            <div className="grid grid-5">
              <Stat
                label="Platform health"
                value={
                  <>
                    50<span className="small"> / 100</span>
                  </>
                }
                foot="Sample score"
                tone="accent"
              />
              <Stat
                label="Active P1"
                value={
                  scenario.severity === "P1" && stage !== "resolved" ? "1" : "0"
                }
                foot="Sample incident"
                tone="critical"
              />
              <Stat
                label="Active P2"
                value={
                  scenario.severity === "P2" && stage !== "resolved" ? "1" : "0"
                }
                foot="Sample incident"
                tone="warning"
              />
              <Stat label="Systems degraded" value="3" foot="Sample signals" />
              <Stat
                label="Datasets delayed"
                value="1"
                foot="Freshness monitor"
              />
            </div>
            <div className="grid wide-left section-gap">
              <Panel title="Active incident" detail="Synthetic record">
                <div className="panel-body">
                  <div className="evidence-top">
                    <strong>PREVIEW-001 · {scenario.title}</strong>
                    <Badge
                      tone={scenario.severity === "P1" ? "critical" : "warning"}
                    >
                      {scenario.severity}
                    </Badge>
                  </div>
                  <p>{scenario.symptom}</p>
                  <a
                    className="table-link"
                    href={page("/incidents/PREVIEW-001")}
                  >
                    Open Incident Room →
                  </a>
                </div>
              </Panel>
              <Panel
                title="Platform signals"
                variant="holographic"
                detail="Sample state"
              >
                <div className="service-list">
                  {["Kafka", "Spark", "Data health"].map((item, index) => (
                    <div className="service-row" key={item}>
                      <span className="service-icon">{item[0]}</span>
                      <span className="service-name">{item}</span>
                      <Badge tone={index === 0 ? "critical" : "warning"}>
                        degraded
                      </Badge>
                      <span className="service-score">
                        {[48, 62, 39][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
            <div className="grid grid-2 section-gap">
              <Panel title="Business impact" detail="From data health">
                <div className="panel-body">
                  <div className="grid grid-3">
                    <div>
                      <div className="text-faint small">FRESHNESS</div>
                      <h2>37m</h2>
                    </div>
                    <div>
                      <div className="text-faint small">DASHBOARDS</div>
                      <h2>1</h2>
                    </div>
                    <div>
                      <div className="text-faint small">SLO RISK</div>
                      <Badge tone="warning">At risk</Badge>
                    </div>
                  </div>
                </div>
              </Panel>
              <Panel
                title="Operating loop"
                variant="terminal"
                detail="Detect → Verify"
              >
                <div className="panel-body">
                  <div className="terminal-line">
                    <span className="terminal-prompt">&gt;</span> observe
                    --pipeline orders{" "}
                    <span className="terminal-cursor" aria-hidden="true">
                      _
                    </span>
                  </div>
                  <p className="terminal-description">
                    Observe a fault, inspect its evidence and lineage, walk
                    through a local approval preview, then read the postmortem.
                  </p>
                  <a className="table-link" href={page("/replaylab")}>
                    Open ReplayLab →
                  </a>
                </div>
              </Panel>
            </div>
          </>
        );
      case "/pulse":
        return (
          <>
            <Heading
              eyebrow="Workspace / Telemetry"
              title="Pulse"
              description="A sample view of operational metrics and threshold breaches."
            />
            <div className="callout block-gap">
              <strong>Sample signals.</strong> The local app ingests and stores
              current telemetry through its API.
            </div>
            <div className="grid grid-4 block-gap">
              <Stat
                label="Broker disk"
                value="96%"
                foot="Above 90% threshold"
                tone="critical"
              />
              <Stat
                label="Consumer lag"
                value="18.4k"
                foot="Orders events"
                tone="warning"
              />
              <Stat
                label="Spark batch"
                value="14.2s"
                foot="Streaming latency"
              />
              <Stat label="Freshness" value="37m" foot="fact_orders" />
            </div>
            <Panel title="Signal readings" detail="Synthetic snapshot">
              <div className="metric-list">
                {[
                  ["broker_disk_utilization", "broker-02", "96%", 96],
                  ["consumer_lag", "orders-consumer", "18,420 messages", 84],
                  [
                    "micro_batch_duration",
                    "order_stream_job",
                    "14.2 seconds",
                    65,
                  ],
                  ["dataset_freshness", "fact_orders", "37 minutes", 74],
                ].map(([name, source, value, width]) => (
                  <div className="metric-row" key={name}>
                    <span>
                      {name}
                      <small>{source}</small>
                    </span>
                    <strong>{value}</strong>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${Number(width) > 85 ? "bad" : "warn"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </>
        );
      case "/incidents":
        return (
          <>
            <Heading
              eyebrow="Workspace / Detection"
              title="Incidents"
              description="Prioritized, correlated issues with a route into evidence and controlled recovery."
            />
            <Panel title="Incident queue" detail="1 synthetic record">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Priority</th>
                      <th>Incident</th>
                      <th>System</th>
                      <th>Impact</th>
                      <th>State</th>
                      <th>Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <Badge
                          tone={
                            scenario.severity === "P1" ? "critical" : "warning"
                          }
                        >
                          {scenario.severity}
                        </Badge>
                      </td>
                      <td>
                        <strong>PREVIEW-001</strong>
                        <small>{scenario.cause}</small>
                      </td>
                      <td>{scenario.system}</td>
                      <td>{scenario.affected.length} entities</td>
                      <td>
                        <Badge
                          tone={stage === "resolved" ? "success" : "warning"}
                        >
                          {stage}
                        </Badge>
                      </td>
                      <td>
                        <a
                          className="table-link"
                          href={page("/incidents/PREVIEW-001")}
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        );
      case "/nervemap":
        return (
          <>
            <Heading
              eyebrow="Workspace / Topology"
              title="NerveMap"
              description="Follow the order signal across infrastructure, processing, and business data."
            />
            <div className="callout block-gap">
              <strong>Seeded demo lineage.</strong> Select a node to inspect its
              immediate downstream dependency.
            </div>
            <Panel
              title="Orders pipeline"
              detail="7 entities · 6 relationships"
            >
              <div className="topology-wrap">
                <div className="topology-toolbar">
                  <input
                    className="form-input"
                    aria-label="Search entities"
                    placeholder="Search entities…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <button
                    className="button"
                    aria-label="Zoom out"
                    onClick={() => setZoom(Math.max(0.65, zoom - 0.15))}
                  >
                    −
                  </button>
                  <button
                    className="button"
                    aria-label="Zoom in"
                    onClick={() => setZoom(Math.min(1.4, zoom + 0.15))}
                  >
                    +
                  </button>
                </div>
                <div
                  className="topology-canvas"
                  style={{ "--zoom": zoom } as CSSProperties}
                >
                  <svg
                    width="900"
                    height="450"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                    }}
                    aria-hidden="true"
                  >
                    {links.map(([from, to]) => {
                      const a = entities.find((item) => item.id === from)!;
                      const b = entities.find((item) => item.id === to)!;
                      return (
                        <path
                          key={`${from}-${to}`}
                          className="topology-edge"
                          d={
                            from === "broker-02" || to === "revenue-dashboard"
                              ? `M ${a.x + 71} ${a.y + 52} L ${b.x + 71} ${b.y}`
                              : `M ${a.x + 142} ${a.y + 26} L ${b.x} ${b.y + 26}`
                          }
                        />
                      );
                    })}
                  </svg>
                  {entities.map((item) => (
                    <button
                      className={`topology-node ${entity === item.id ? "selected" : ""}`}
                      key={item.id}
                      style={{
                        left: item.x,
                        top: item.y,
                        opacity:
                          search &&
                          !`${item.name} ${item.type}`
                            .toLowerCase()
                            .includes(search.toLowerCase())
                            ? 0.35
                            : 1,
                      }}
                      onClick={() => setEntity(item.id)}
                    >
                      <span>{item.type}</span>
                      <strong>{item.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div className="topology-details">
                <div className="evidence-top">
                  <h3>{selected?.name ?? "Select an entity"}</h3>
                  {selected && <Badge tone="info">{selected.type}</Badge>}
                </div>
                <p>
                  {selected
                    ? `${downstream.length} immediate downstream connection${downstream.length === 1 ? "" : "s"}.`
                    : "Select a node, search entities, or use zoom to explore the seeded orders pipeline."}
                </p>
                <div className="scenario-tags">
                  {downstream.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        );
      case "/explore":
        return (
          <>
            <Heading
              eyebrow="Workspace / Signals"
              title="Explore"
              description="Inspect metrics, logs, events, and traces behind a diagnosis."
            />
            <div className="grid grid-4 block-gap">
              <Stat label="Metrics" value="4" foot="Sample readings" />
              <Stat label="Logs" value="2" foot="Sample records" />
              <Stat label="Events" value="2" foot="Sample records" />
              <Stat label="Traces" value="1" foot="Sample span" />
            </div>
            <div className="grid grid-2">
              <Panel title="Recent logs">
                <div className="panel-body">
                  <p>
                    <Badge tone="critical">ERROR</Badge> broker-02 ·
                    DiskErrorException in log directory
                  </p>
                  <p>
                    <Badge tone="warning">WARN</Badge> orders-consumer · lag
                    threshold exceeded
                  </p>
                </div>
              </Panel>
              <Panel title="Events and traces" variant="terminal">
                <div className="panel-body">
                  <p>EVENT / orders pipeline health changed to degraded</p>
                  <p>TRACE / ingest → detect → correlate → incident</p>
                  <p className="text-faint small">
                    The local API stores and exposes the actual demo signal
                    records.
                  </p>
                </div>
              </Panel>
            </div>
          </>
        );
      case "/investigator":
        return (
          <>
            <Heading
              eyebrow="Workspace / AI"
              title="Investigator"
              description="Ask, investigate, and plan recovery with incident evidence in view."
            />
            <div className="callout block-gap">
              <strong>Scripted preview.</strong> Answers here are deterministic
              examples. The local app can use configured AI or its
              evidence-summary fallback.
            </div>
            <div className="chat-layout">
              <section className="panel chat-pane">
                <div className="panel-heading">
                  <h2>Investigation conversation</h2>
                  <Badge tone="info">Evidence first</Badge>
                </div>
                <div className="chat-mode">
                  {["ask", "investigate", "fix"].map((item) => (
                    <button
                      className={mode === item ? "selected" : ""}
                      key={item}
                      onClick={() => setMode(item)}
                    >
                      {item.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="chat-messages" aria-live="polite">
                  {messages.length === 0 && (
                    <div className="callout">
                      <strong>Start with a question.</strong>
                      <p>
                        Try “What caused this?”, “What is affected?”, or “How
                        should we recover?”
                      </p>
                    </div>
                  )}
                  {messages.map((item, index) => (
                    <div className={`chat-bubble ${item.role}`} key={index}>
                      <div className="small text-faint">
                        {item.role === "user" ? "YOU" : "INVESTINATOR PREVIEW"}
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>
                <form className="chat-compose" onSubmit={send}>
                  <div className="terminal-input-wrap">
                    <input
                      className="form-input"
                      aria-label="Message preview Investigator"
                      placeholder="Ask about the sample incident…"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                    />
                  </div>
                  <button
                    className="button button-primary"
                    disabled={!question.trim()}
                  >
                    Send →
                  </button>
                </form>
              </section>
              <div className="stack">
                <Panel title="Incident context">
                  <div className="panel-body">
                    <strong>PREVIEW-001 · {scenario.system}</strong>
                    <p className="text-muted">{scenario.symptom}</p>
                  </div>
                </Panel>
                <Panel
                  title="Evidence"
                  detail={`${scenario.evidence.length} items`}
                >
                  {scenario.evidence.map((item) => (
                    <div className="evidence-item" key={item.id}>
                      <strong>{item.id}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))}
                </Panel>
              </div>
            </div>
          </>
        );
      case "/replaylab":
        return (
          <>
            <Heading
              eyebrow="Operations / Simulation"
              title="ReplayLab"
              description="Select one of three synthetic fault scenarios to walk through the operating loop."
            />
            <div className="callout callout-warning block-gap">
              <strong>UI preview only.</strong> Starting a scenario changes
              local browser state; it does not inject telemetry. The local full
              stack runs the backend ReplayLab adapters.
            </div>
            <div className="grid grid-3">
              {scenarios.map((item) => (
                <div className="panel scenario-card" key={item.id}>
                  <div className="scenario-head">
                    <h3>{item.title}</h3>
                    <Badge tone="info">{item.difficulty}</Badge>
                  </div>
                  <p>{item.symptom}</p>
                  <div className="scenario-tags">
                    <Badge>{item.system}</Badge>
                    <Badge
                      tone={item.severity === "P1" ? "critical" : "warning"}
                    >
                      {item.severity}
                    </Badge>
                  </div>
                  <div className="top-gap">
                    <button
                      className="button button-primary"
                      onClick={() => start(item)}
                    >
                      ▷ Open scenario
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      case "/runbooks":
        return (
          <>
            <Heading
              eyebrow="Operations / Guidance"
              title="Runbooks"
              description="Operational guidance retrieved as supporting context, not executed as commands."
            />
            <div className="grid grid-2">
              {[
                "Kafka broker disk triage",
                "Spark streaming recovery",
                "Dataset freshness response",
              ].map((title, index) => (
                <Panel title={title} detail="Seed guidance" key={title}>
                  <div className="panel-body">
                    <Badge tone="info">Read only</Badge>
                    <p className="text-muted">{scenarios[index].cause}</p>
                    <p>
                      Check the signals, compare impact through lineage, propose
                      the allowlisted demo action, and verify symptoms after
                      approval.
                    </p>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        );
      case "/knowledge":
        return (
          <>
            <Heading
              eyebrow="Operations / Memory"
              title="Knowledge"
              description="Searchable prior guidance and incident learnings in the local backend."
            />
            <div className="grid grid-2">
              {scenarios.map((item) => (
                <Panel title={item.title} detail={item.system} key={item.id}>
                  <div className="panel-body">
                    <p>{item.cause}</p>
                    <div className="evidence-source">
                      Synthetic knowledge card · preview
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        );
      case "/approvals":
        return (
          <>
            <Heading
              eyebrow="Operations / Control"
              title="Approvals"
              description="A human decision is required before a risky recovery in the local workflow."
            />
            <div className="grid grid-2">
              <Panel
                title="Awaiting decision"
                detail={stage === "investigating" ? "1 action" : "0 actions"}
              >
                <div className="panel-body">
                  {stage === "investigating" ? (
                    <>
                      <strong>{scenario.action}</strong>
                      <p>
                        PREVIEW-001 · {scenario.system} ·{" "}
                        {scenario.evidence.length} evidence items
                      </p>
                      <a
                        className="table-link"
                        href={page("/incidents/PREVIEW-001")}
                      >
                        Review in Incident Room →
                      </a>
                    </>
                  ) : (
                    <p>No preview action awaiting a decision.</p>
                  )}
                </div>
              </Panel>
              <Panel title="Decision record" detail="Browser state">
                <div className="panel-body">
                  <Badge
                    tone={stage === "investigating" ? "warning" : "success"}
                  >
                    {stage === "investigating"
                      ? "Pending"
                      : "Approved in preview"}
                  </Badge>
                  <p>
                    The full app persists the actor, decision, reason, and audit
                    trail. This static page saves nothing.
                  </p>
                </div>
              </Panel>
            </div>
          </>
        );
      case "/automations":
        return (
          <>
            <Heading
              eyebrow="Operations / Automation"
              title="Automations"
              description="Controlled operational workflows and their approval policy."
            />
            <Panel title="Configured automations" detail="No schedules">
              <div className="empty-state">
                <span className="empty-mark">◎</span>
                <strong>No automations configured</strong>
                <p>
                  Scheduled actions require an authenticated actor, policy, and
                  durable executor. ReplayLab recovery can be run from an
                  approved local incident.
                </p>
              </div>
            </Panel>
          </>
        );
      case "/ai-observability":
        return (
          <>
            <Heading
              eyebrow="Platform / AI"
              title="AI Observability"
              description="Usage, fallback, latency, and offline evaluation visibility."
            />
            <div className="grid grid-4 block-gap">
              <Stat label="Model calls" value="0" foot="Preview makes none" />
              <Stat label="Fallback" value="Ready" foot="Deterministic path" />
              <Stat
                label="Evidence"
                value="Required"
                foot="Cited or uncertain"
              />
              <Stat label="Evaluation" value="Offline" foot="Fixture based" />
            </div>
            <Panel title="How AI is controlled">
              <div className="panel-body">
                <p>
                  The local Investigator sends a bounded incident snapshot to a
                  configured model. It rejects unsupported evidence IDs and
                  marks uncertainty. A policy engine outside the model controls
                  recovery approval.
                </p>
                <p className="text-muted">
                  This public preview uses scripted responses and does not send
                  prompts or incidents to a model.
                </p>
              </div>
            </Panel>
          </>
        );
      case "/integrations":
        return (
          <>
            <Heading
              eyebrow="Platform / Connectors"
              title="Integrations"
              description="Connection status and capabilities for demo services and planned adapters."
            />
            <Panel title="Connector inventory" detail="Illustrative">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Integration</th>
                      <th>Status</th>
                      <th>Capabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      [
                        "Kafka",
                        "Local demo",
                        "Producer, consumer, read-only broker health",
                      ],
                      [
                        "Prometheus",
                        "Local demo",
                        "API scrape and metrics view",
                      ],
                      ["OpenTelemetry", "Local demo", "HTTP trace export"],
                      [
                        "Spark / HDFS / NiFi / Kudu",
                        "Planned",
                        "Live connectors are not implemented",
                      ],
                    ].map(([name, status, capability]) => (
                      <tr key={name}>
                        <td>
                          <strong>{name}</strong>
                        </td>
                        <td>
                          <Badge
                            tone={status === "Planned" ? "neutral" : "info"}
                          >
                            {status}
                          </Badge>
                        </td>
                        <td>{capability}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        );
      case "/administration":
        return (
          <>
            <Heading
              eyebrow="Platform / Settings"
              title="Administration"
              description="Product identity and safety boundaries."
            />
            <div className="grid grid-2">
              <Panel title="Demo configuration">
                <div className="panel-body">
                  <p>
                    <strong>Identity:</strong> Fixed demo actor in the local
                    stack
                  </p>
                  <p>
                    <strong>Policy:</strong> Human approval for risky demo
                    recovery
                  </p>
                  <p>
                    <strong>Executor:</strong> Allowlisted ReplayLab simulation
                    only
                  </p>
                </div>
              </Panel>
              <Panel title="Production boundary">
                <div className="panel-body">
                  <p>
                    OIDC, RBAC, production connectors, durable automation, and
                    production write executors are not implemented in this
                    repository.
                  </p>
                  <a
                    className="table-link"
                    href={`${repository}/blob/main/docs/security.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the security design ↗
                  </a>
                </div>
              </Panel>
            </div>
          </>
        );
      case "/about":
        return (
          <>
            <Heading eyebrow="Platform / About" title="About InvestiNator" />
            <div className="about-hero">
              <img src={mark} alt="InvestiNator mark" />
              <div className="eyebrow top-gap">DATAOPS CONTROL PLANE</div>
              <h2
                className="cyber-glitch"
                data-text="See the signal. Find the cause. Fix with confidence."
                aria-label="See the signal. Find the cause. Fix with confidence."
              >
                See the signal. Find the cause. Fix with confidence.
              </h2>
              <p>
                AI-powered DataOps observability, investigation, and controlled
                remediation. This public site is a static UI preview of the
                working local demo.
              </p>
              <a
                className="button button-primary"
                href={repository}
                target="_blank"
                rel="noreferrer"
              >
                View source on GitHub ↗
              </a>
            </div>
            <div className="grid grid-2 section-gap">
              <Panel title="Operating loop">
                <div className="panel-body">
                  <ol className="inline-list">
                    {[
                      "Observe operational signals",
                      "Detect anomalies deterministically",
                      "Correlate alerts through topology",
                      "Investigate with inspectable evidence",
                      "Recommend a policy-controlled action",
                      "Verify recovery symptoms",
                      "Learn from the incident record",
                    ].map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              </Panel>
              <Panel title="Creator">
                <div className="panel-body">
                  <h2 className="flush-top">Mina Adel Markos</h2>
                  <p className="text-muted">Senior Big Data Engineer</p>
                  <a
                    className="button"
                    href="https://github.com/MINAADELMARKOS"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub profile ↗
                  </a>
                </div>
              </Panel>
            </div>
          </>
        );
      default:
        return (
          <>
            <Heading eyebrow="Platform / Navigation" title="Page not found" />
            <a className="button" href={page("/")}>
              Return to Command Center
            </a>
          </>
        );
    }
  }

  return (
    <div className="app-shell">
      <aside
        id="showcase-sidebar"
        className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}
        aria-label="Preview navigation"
      >
        <a
          className="brand"
          href={page("/")}
          onClick={() => setMenuOpen(false)}
        >
          <img src={mark} width="36" height="36" alt="" />
          <span>
            <strong>InvestiNator</strong>
            <small>DATAOPS CONTROL PLANE</small>
          </span>
        </a>
        <div className="sidebar-scroll">
          {routeGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{group.label}</div>
              {group.items.map(([href, label]) => {
                const Icon = icons[href];
                const active =
                  route === href ||
                  (href === "/incidents" && route.startsWith("/incidents/"));
                return (
                  <a
                    className={`nav-link ${active ? "active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    href={page(href)}
                    key={href}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="nav-icon">
                      <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        <div className="sidebar-foot">
          <span className="avatar">MM</span>
          <span>
            <strong>Mina Adel Markos</strong>
            <small>Senior Big Data Engineer</small>
          </span>
          <a
            href={repository}
            target="_blank"
            rel="noreferrer"
            aria-label="Source repository"
          >
            <ArrowUpRight size={17} strokeWidth={1.5} />
          </a>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <button
            className="menu-toggle"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="showcase-sidebar"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={22} strokeWidth={1.5} />
          </button>
          <div className="topbar-context">
            <span className="environment-dot" /> PUBLIC UI PREVIEW{" "}
            <span className="divider">/</span> SYNTHETIC DATA
          </div>
          <div className="topbar-right">
            <span className="live-pill" aria-label="Static preview">
              <i /> STATIC PREVIEW
            </span>
            <a
              href={page("/about")}
              className="topbar-avatar"
              aria-label="About"
            >
              MM
            </a>
          </div>
        </header>
        <main className="content">
          <div className="preview-banner" role="note">
            <span>PREVIEW://</span> Explore the interface with synthetic data.
            For API-backed actions,{" "}
            <a
              href={`${repository}/blob/main/docs/user-guide.md`}
              target="_blank"
              rel="noreferrer"
            >
              run the full local demo ↗
            </a>
          </div>
          {content()}
          <p className="page-footer">
            InvestiNator · Public UI preview · No backend or external actions
          </p>
        </main>
      </div>
    </div>
  );
}
