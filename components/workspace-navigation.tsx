"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Arrow, Wordmark } from "@/components/brand";
import type { Viewer } from "@/lib/auth";

const nav = [
  ["/app", "Overview"],
  ["/app/intelligence", "Intelligence Loop"],
  ["/app/prompts", "Buyer questions"],
  ["/app/runs", "Answer runs"],
  ["/app/agents", "Agent Control Plane"],
  ["/app/source-map", "Source Map"],
  ["/app/decision-lab", "Decision Lab"],
  ["/app/opportunities", "Priority gaps"],
  ["/app/placements", "Action tracker"],
  ["/app/evidence", "Evidence Vault"],
  ["/app/analytics", "Analytics"],
  ["/app/alerts", "Alerts"],
  ["/app/team", "Team"],
  ["/app/settings", "Settings"],
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function WorkspaceIdentity({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  return <div className="sidebar-company">
    <span>Workspace</span>
    <strong>{viewer.mode === "demo" ? "Northstar HR" : workspaceName || "Setup required"}</strong>
    <small>{viewer.mode === "demo" ? "Seeded demo · fictional data" : workspaceName ? "Customer workspace" : "Complete onboarding"}</small>
  </div>;
}

function SignOutButton() {
  return <form action="/api/auth/logout" method="post">
    <button type="submit">Sign out <Arrow /></button>
  </form>;
}

export function WorkspaceSidebar({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  return <aside className="app-sidebar">
    <Wordmark inverse />
    <nav aria-label="Workspace">
      {nav.map(([href, label]) => <Link className={isCurrent(pathname, href) ? "is-current" : ""} aria-current={isCurrent(pathname, href) ? "page" : undefined} key={href} href={href}>{label}<span aria-hidden="true">&rarr;</span></Link>)}
    </nav>
    <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
    <SignOutButton />
  </aside>;
}

export function WorkspaceMobileNavigation({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  return <details className="app-mobile-nav" ref={mobileMenu}>
      <summary>Workspace menu</summary>
      <div className="app-mobile-nav__panel">
        <nav aria-label="Mobile workspace">
          {nav.map(([href, label]) => <Link className={isCurrent(pathname, href) ? "is-current" : ""} aria-current={isCurrent(pathname, href) ? "page" : undefined} key={href} href={href} onClick={() => { if (mobileMenu.current) mobileMenu.current.open = false; }}>{label}<span aria-hidden="true">&rarr;</span></Link>)}
        </nav>
        <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
        <SignOutButton />
      </div>
    </details>;
}
