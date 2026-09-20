"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type KeyboardEvent } from "react";
import { Arrow, ForementionMark, Wordmark } from "@/components/brand";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { Viewer } from "@/lib/auth";
import { resetProductAnalytics } from "@/lib/product-analytics";

const primaryNav = [
  ["/app", "Attention"],
  ["/app/prompts", "Questions"],
  ["/app/runs", "Records"],
  ["/app/analytics", "Comparisons"],
  ["/app/settings", "Settings"],
] as const;

const workspaceGroups = [
  {
    label: "Monitor",
    links: [
      ["/app/alerts", "Alerts"],
      ["/app/competitors", "Competitors"],
      ["/app/source-map", "Source Map"],
      ["/app/evidence", "Evidence Vault"],
      ["/app/intelligence", "Intelligence Loop"],
    ],
  },
  {
    label: "Decide & act",
    links: [
      ["/app/opportunities", "Opportunities"],
      ["/app/change-specifications", "Change Specifications"],
      ["/app/placements", "Actions"],
      ["/app/resolutions", "Resolution Center"],
      ["/app/outcomes", "Outcome Ledger"],
      ["/app/decision-lab", "Decision Lab"],
    ],
  },
  {
    label: "Workspace",
    links: [
      ["/app/team", "Team"],
      ["/app/settings#integrations", "Integrations"],
      ["/app/support", "Support"],
      ["/app/passport", "Vendor Passport"],
      ["/app/agents", "Agent Control Plane"],
    ],
  },
] as const;

export const CONTEXTUAL_WORKSPACE_ROUTES = workspaceGroups.flatMap((group) => group.links);

function hrefPath(href: string) {
  return href.split("#")[0] || href;
}

function isCurrent(pathname: string, href: string) {
  const path = hrefPath(href);
  return path === "/app" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
}

function WorkspaceIdentity({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  return <div className="sidebar-company">
    <span>Workspace</span>
    <strong>{viewer.mode === "demo" ? "Northstar HR" : workspaceName || "Setup required"}</strong>
    <small>{viewer.mode === "demo" ? "Seeded demo · fictional data" : workspaceName ? "Customer workspace" : "Complete onboarding"}</small>
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
      return <Link className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} key={href} href={href} onClick={onNavigate}>{label}<span aria-hidden="true">&rarr;</span></Link>;
    })}
  </nav>;
}

function ExploreWorkspace({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const containsCurrent = CONTEXTUAL_WORKSPACE_ROUTES.some(([href]) => isCurrent(pathname, href));
  return <details className="sidebar-advanced workspace-explorer" open={containsCurrent ? true : undefined}>
    <summary>
      <span>Explore workspace</span>
      <small>{CONTEXTUAL_WORKSPACE_ROUTES.length} tools</small>
    </summary>
    <nav className="sidebar-nav sidebar-nav--workspace" aria-label="Explore workspace">
      {workspaceGroups.map((group) => <div className="sidebar-nav__group" key={group.label}>
        <span className="sidebar-nav__group-label">{group.label}</span>
        {group.links.map(([href, label]) => {
          const current = isCurrent(pathname, href);
          return <Link className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} key={href} href={href} onClick={onNavigate}>{label}<span aria-hidden="true">&rarr;</span></Link>;
        })}
      </div>)}
    </nav>
  </details>;
}

export function WorkspaceSidebar({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  return <aside className="app-sidebar registered-workspace-sidebar">
    <Link className="app-sidebar__home" href="/app" aria-label="Foremention workspace home"><Wordmark /></Link>
    <div className="app-sidebar__navigation">
      <NavigationLinks pathname={pathname} />
      <ExploreWorkspace pathname={pathname} />
    </div>
    <div className="app-sidebar__footer">
      <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
      <SignOutButton demo={viewer.mode === "demo"} />
    </div>
  </aside>;
}

export function WorkspaceMobileNavigation({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
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
        <ExploreWorkspace pathname={pathname} onNavigate={() => closeMenu()} />
        <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
        <SignOutButton demo={viewer.mode === "demo"} />
      </div>
    </details>;
}
