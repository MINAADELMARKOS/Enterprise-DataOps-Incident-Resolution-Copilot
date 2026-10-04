import { EmptyState, PageHeading, Panel } from "@/components/ui";

export default function Automations(){return <><PageHeading eyebrow="Operations / Automation" title="Automations" description="Controlled operational workflows and their approval policy." />
  <Panel title="Configured automations" detail="No schedules"><EmptyState title="No automations configured" detail="Scheduled actions require an authenticated actor, policy and a durable executor. ReplayLab recovery can be run from an approved incident." /></Panel></>;}
