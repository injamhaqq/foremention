"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { Arrow, ForementionMark, Wordmark } from "@/components/brand";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { Viewer } from "@/lib/auth";
import type { WorkspaceProject } from "@/lib/data";
import { resetProductAnalytics } from "@/lib/product-analytics";

const primaryNav = [
  ["/app", "Overview"],
  ["/app/prompts", "Questions"],
  ["/app/runs", "Records"],
  ["/app/source-map", "Evidence"],
  ["/app/opportunities", "Opportunities"],
  ["/app/analytics", "Comparisons"],
  ["/app/tools", "All tools"],
  ["/app/settings", "Settings"],
] as const;

// These capabilities remain available contextually and are also indexed from
// /app/tools so no important product area is hidden from navigation.
export const CONTEXTUAL_WORKSPACE_ROUTES = [
  ["/app/alerts", "Alerts"],
  ["/app/team", "Team"],
  ["/app/settings#integrations", "Integrations"],
  ["/app/competitors", "Competitors"],
  ["/app/opportunities", "Opportunities"],
  ["/app/placements", "Actions"],
  ["/app/resolutions", "Resolution Center"],
  ["/app/outcomes", "Outcome Ledger"],
  ["/app/passport", "Vendor Passport"],
  ["/app/intelligence", "Intelligence Loop"],
  ["/app/agents", "Agent Control Plane"],
  ["/app/support", "Support"],
  ["/app/decision-lab", "Decision Lab"],
  ["/app/evidence", "Evidence Vault"],
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function WorkspaceIdentity({
  viewer,
  organizationName,
  projects,
  activeProjectId,
}: {
  viewer: Viewer;
  organizationName?: string;
  projects: WorkspaceProject[];
  activeProjectId?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function switchProject(projectId: string) {
    if (viewer.mode === "demo" || projectId === activeProjectId) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/workspace/project", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not switch project.");
      // A hard navigation deliberately cancels stale in-flight UI requests.
      // The next server render re-resolves every customer surface from the
      // authorized active-project cookie.
      window.location.reload();
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Could not switch project.");
    }
  }

  const active = projects.find((project) => project.id === activeProjectId) || projects[0] || null;
  return <div className="sidebar-company">
    <span>Organization</span>
    <strong>{viewer.mode === "demo" ? "Northstar HR" : organizationName || "Setup required"}</strong>
    {active ? <label className="sidebar-project">
      <span>Active project</span>
      <select
        aria-label="Active project"
        value={active.id}
        disabled={viewer.mode === "demo" || projects.length < 2 || busy}
        onChange={(event) => void switchProject(event.target.value)}
      >
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
    </label> : <small>Complete onboarding</small>}
    {busy && <small role="status">Switching project…</small>}
    {error && <small className="sidebar-project__error" role="alert">{error}</small>}
  </div>;
}

function SignOutButton({ demo }: { demo: boolean }) {
  return <form action={demo ? "/api/auth/demo/exit" : "/api/auth/logout"} method="post">
    <PendingSubmitButton idle={<>{demo ? "Exit demo" : "Sign out"} <Arrow /></>} pending="Signing out…" onClick={() => resetProductAnalytics()} />
  </form>;
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <nav className="sidebar-nav sidebar-nav--primary" aria-label="Main workspace">
    {primaryNav.map(([href, label]) => {
      const current = isCurrent(pathname, href);
      return <Link prefetch={false} className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} key={href} href={href} onClick={onNavigate}>{label}<span aria-hidden="true">&rarr;</span></Link>;
    })}
  </nav>;
}

export function WorkspaceSidebar({ viewer, organizationName, projects, activeProjectId }: { viewer: Viewer; organizationName?: string; projects: WorkspaceProject[]; activeProjectId?: string }) {
  const pathname = usePathname();
  return <aside className="app-sidebar registered-workspace-sidebar">
    <Wordmark />
    <div className="app-sidebar__navigation">
      <NavigationLinks pathname={pathname} />
    </div>
    <div className="app-sidebar__footer">
      <WorkspaceIdentity viewer={viewer} organizationName={organizationName} projects={projects} activeProjectId={activeProjectId} />
      <SignOutButton demo={viewer.mode === "demo"} />
    </div>
  </aside>;
}

export function WorkspaceMobileNavigation({ viewer, organizationName, projects, activeProjectId }: { viewer: Viewer; organizationName?: string; projects: WorkspaceProject[]; activeProjectId?: string }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const closeMenu = (restoreFocus = false) => {
    if (mobileMenu.current) mobileMenu.current.open = false;
    if (restoreFocus) summaryRef.current?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === "Escape" && mobileMenu.current?.open) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
  };
  return <details className="app-mobile-nav registered-workspace-mobile" ref={mobileMenu} onKeyDown={handleKeyDown}>
      <summary ref={summaryRef}><ForementionMark /><span>Workspace menu</span></summary>
      <div className="app-mobile-nav__panel">
        <NavigationLinks pathname={pathname} onNavigate={() => closeMenu()} />
        <Link prefetch={false} className="app-mobile-nav__search" href="/app/search" onClick={() => closeMenu()}>Search workspace <span aria-hidden="true">&rarr;</span></Link>
        <WorkspaceIdentity viewer={viewer} organizationName={organizationName} projects={projects} activeProjectId={activeProjectId} />
        <SignOutButton demo={viewer.mode === "demo"} />
      </div>
    </details>;
}
