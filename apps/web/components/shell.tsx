"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const groups = [
  { label: "WORKSPACE", items: [
    ["/", "Command Center", "▦"], ["/pulse", "Pulse", "⌁"], ["/incidents", "Incidents", "▤"],
    ["/nervemap", "NerveMap", "⌘"], ["/explore", "Explore", "⊞"], ["/investigator", "Investigator", "◈"],
  ] },
  { label: "OPERATIONS", items: [
    ["/replaylab", "ReplayLab", "▷"], ["/runbooks", "Runbooks", "≡"],
    ["/knowledge", "Knowledge", "▧"], ["/approvals", "Approvals", "◇"],
    ["/automations", "Automations", "◷"],
  ] },
  { label: "PLATFORM", items: [
    ["/ai-observability", "AI Observability", "◎"], ["/integrations", "Integrations", "⊕"],
    ["/administration", "Administration", "⚙"],
  ] },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`} aria-label="Primary navigation">
      <Link href="/" className="brand" onClick={() => setOpen(false)}>
        <Image src="/brand/investinator-mark.svg" width={36} height={36} alt="" />
        <span><strong>InvestiNator</strong><small>DATAOPS CONTROL PLANE</small></span>
      </Link>
      <div className="sidebar-scroll">{groups.map(group => <div className="nav-group" key={group.label}>
        <div className="nav-label">{group.label}</div>
        {group.items.map(([href, label, icon]) => <Link key={href} href={href} onClick={() => setOpen(false)}
          className={`nav-link ${path === href || (href !== "/" && path.startsWith(`${href}/`)) ? "active" : ""}`}>
          <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>
        </Link>)}
      </div>)}</div>
      <div className="sidebar-foot"><span className="avatar">MM</span><span><strong>Mina Adel Markos</strong><small>Creator / Engineer</small></span><Link href="/about" aria-label="About InvestiNator">↗</Link></div>
    </aside>
    {open && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="main-area">
      <header className="topbar"><button className="menu-toggle" aria-label="Open navigation" onClick={() => setOpen(true)}>☰</button>
        <div className="topbar-context"><span className="environment-dot" /> DEMO ENVIRONMENT <span className="divider">/</span> ORDERS PIPELINE</div>
        <div className="topbar-right"><span className="live-pill" aria-label="Simulated demo signals"><i /> SIMULATED SIGNALS</span><ThemeToggle /><Link href="/about" className="topbar-avatar" aria-label="About">MM</Link></div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>;
}

function ThemeToggle() {
  const [light, setLight] = useState(false);
  return <button className="theme-toggle" aria-label={light ? "Use dark theme" : "Use light theme"}
    onClick={() => { document.documentElement.dataset.theme = light ? "dark" : "light"; setLight(!light); }}>
    {light ? "☾" : "☼"}
  </button>;
}
