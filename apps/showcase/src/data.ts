export type Scenario = {
  id: string;
  title: string;
  system: string;
  severity: "P1" | "P2";
  difficulty: string;
  symptom: string;
  cause: string;
  action: string;
  evidence: { id: string; source: string; detail: string }[];
  affected: string[];
};

export const scenarios: Scenario[] = [
  {
    id: "kafka-disk",
    title: "Kafka broker disk pressure",
    system: "Kafka",
    severity: "P1",
    difficulty: "Intermediate",
    symptom:
      "Broker log directory errors increase while orders.events consumer lag rises.",
    cause:
      "A broker volume approaches its capacity limit, blocking writes and delaying the orders pipeline.",
    action:
      "Apply the allowlisted ReplayLab broker recovery simulation, then verify lag and freshness.",
    evidence: [
      {
        id: "EV-101",
        source: "Broker log",
        detail: "DiskErrorException reported on broker-02 log directory.",
      },
      {
        id: "EV-102",
        source: "Metric",
        detail: "Broker disk utilization reached 96%.",
      },
      {
        id: "EV-103",
        source: "Metric",
        detail: "orders-consumer lag rose above the demo threshold.",
      },
    ],
    affected: [
      "broker-02",
      "orders.events",
      "orders-consumer",
      "order_stream_job",
      "fact_orders",
      "Revenue dashboard",
    ],
  },
  {
    id: "spark-pressure",
    title: "Spark executor pressure",
    system: "Spark",
    severity: "P2",
    difficulty: "Intermediate",
    symptom:
      "Streaming micro-batches slow and executor failures delay fact_orders updates.",
    cause:
      "Executor memory pressure reduces processing throughput in order_stream_job.",
    action:
      "Apply the allowlisted ReplayLab Spark recovery simulation, then verify batch latency.",
    evidence: [
      {
        id: "EV-201",
        source: "Spark event",
        detail: "Repeated executor loss during order_stream_job.",
      },
      {
        id: "EV-202",
        source: "Metric",
        detail: "Micro-batch duration exceeded the demo threshold.",
      },
      {
        id: "EV-203",
        source: "Dataset",
        detail: "fact_orders freshness exceeded its SLO.",
      },
    ],
    affected: ["order_stream_job", "fact_orders", "Revenue dashboard"],
  },
  {
    id: "freshness",
    title: "Dataset freshness breach",
    system: "Data health",
    severity: "P2",
    difficulty: "Foundational",
    symptom:
      "fact_orders stops refreshing and the revenue dashboard becomes stale.",
    cause:
      "The seeded pipeline misses its freshness SLO after delayed upstream processing.",
    action:
      "Apply the allowlisted ReplayLab freshness recovery simulation, then verify the dataset timestamp.",
    evidence: [
      {
        id: "EV-301",
        source: "Freshness monitor",
        detail: "fact_orders age crossed the 30 minute demo threshold.",
      },
      {
        id: "EV-302",
        source: "Lineage",
        detail: "Revenue dashboard depends on fact_orders.",
      },
      {
        id: "EV-303",
        source: "Event",
        detail: "No recent successful dataset refresh was observed.",
      },
    ],
    affected: ["fact_orders", "Revenue dashboard"],
  },
];

export const entities = [
  {
    id: "orders-producer",
    name: "Orders producer",
    type: "Application",
    x: 25,
    y: 190,
  },
  { id: "broker-02", name: "broker-02", type: "Kafka broker", x: 205, y: 52 },
  {
    id: "orders.events",
    name: "orders.events",
    type: "Kafka topic",
    x: 205,
    y: 190,
  },
  {
    id: "orders-consumer",
    name: "orders-consumer",
    type: "Consumer group",
    x: 385,
    y: 190,
  },
  {
    id: "order_stream_job",
    name: "order_stream_job",
    type: "Spark job",
    x: 565,
    y: 190,
  },
  { id: "fact_orders", name: "fact_orders", type: "Dataset", x: 745, y: 190 },
  {
    id: "revenue-dashboard",
    name: "Revenue dashboard",
    type: "Dashboard",
    x: 745,
    y: 325,
  },
];

export const links = [
  ["orders-producer", "orders.events"],
  ["broker-02", "orders.events"],
  ["orders.events", "orders-consumer"],
  ["orders-consumer", "order_stream_job"],
  ["order_stream_job", "fact_orders"],
  ["fact_orders", "revenue-dashboard"],
] as const;

export const routeGroups = [
  {
    label: "WORKSPACE",
    items: [
      ["/", "Command Center"],
      ["/pulse", "Pulse"],
      ["/incidents", "Incidents"],
      ["/nervemap", "NerveMap"],
      ["/explore", "Explore"],
      ["/investigator", "Investigator"],
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      ["/replaylab", "ReplayLab"],
      ["/runbooks", "Runbooks"],
      ["/knowledge", "Knowledge"],
      ["/approvals", "Approvals"],
      ["/automations", "Automations"],
    ],
  },
  {
    label: "PLATFORM",
    items: [
      ["/ai-observability", "AI Observability"],
      ["/integrations", "Integrations"],
      ["/administration", "Administration"],
      ["/about", "About"],
    ],
  },
] as const;
