"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity, ArrowUpRight, BarChart3, BookOpen, Bot, Clock3, Database,
  LayoutDashboard, ListFilter, Menu, Network, Play, Plug, ScanSearch,
  Settings, ShieldCheck,
} from "lucide-react";

const groups = [
  { label: "WORKSPACE", items: [
    { href: "/", label: "Command Center", Icon: LayoutDashboard },
    { href: "/pulse", label: "Pulse", Icon: Activity },
    { href: "/incidents", label: "Incidents", Icon: ListFilter },
    { href: "/nervemap", label: "NerveMap", Icon: Network },
    { href: "/explore", label: "Explore", Icon: ScanSearch },
    { href: "/investigator", label: "Investigator", Icon: Bot },
  ] },
  { label: "OPERATIONS", items: [
    { href: "/replaylab", label: "ReplayLab", Icon: Play },
    { href: "/runbooks", label: "Runbooks", Icon: BookOpen },
    { href: "/knowledge", label: "Knowledge", Icon: Database },
    { href: "/approvals", label: "Approvals", Icon: ShieldCheck },
    { href: "/automations", label: "Automations", Icon: Clock3 },
  ] },
  { label: "PLATFORM", items: [
    { href: "/ai-observability", label: "AI Observability", Icon: BarChart3 },
    { href: "/integrations", label: "Integrations", Icon: Plug },
    { href: "/administration", label: "Administration", Icon: Settings },
  ] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside id="primary-sidebar" className={`sidebar ${open ? "sidebar-open" : ""}`} aria-label="Primary navigation">
      <Link href="/" className="brand" onClick={() => setOpen(false)}>
        <Image src="/brand/investinator-mark.svg" width={36} height={36} alt="" />
        <span><strong>InvestiNator</strong><small>DATAOPS CONTROL PLANE</small></span>
      </Link>
      <div className="sidebar-scroll">{groups.map(group => <div className="nav-group" key={group.label}>
        <div className="nav-label">{group.label}</div>
        {group.items.map(({ href, label, Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(`${href}/`));
          return <Link key={href} href={href} onClick={() => setOpen(false)}
            className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            <span className="nav-icon"><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></span><span>{label}</span>
          </Link>;
        })}
      </div>)}</div>
      <div className="sidebar-foot"><span className="avatar">MM</span><span><strong>Mina Adel Markos</strong><small>Senior Big Data Engineer</small></span><Link href="/about" aria-label="About InvestiNator"><ArrowUpRight size={17} strokeWidth={1.5} aria-hidden="true" /></Link></div>
    </aside>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="main-area">
      <header className="topbar"><button className="menu-toggle" aria-label="Open navigation" aria-controls="primary-sidebar" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} strokeWidth={1.5} aria-hidden="true" /></button>
        <div className="topbar-context"><span className="environment-dot" /> DEMO ENVIRONMENT <span className="divider">/</span> ORDERS PIPELINE</div>
        <div className="topbar-right"><span className="live-pill" aria-label="Simulated demo signals"><i /> SIMULATED SIGNALS</span><Link href="/about" className="topbar-avatar" aria-label="About">MM</Link></div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}
