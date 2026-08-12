"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Arrow, Wordmark } from "@/components/brand";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import type { Viewer } from "@/lib/auth";
import { resetProductAnalytics } from "@/lib/product-analytics";

const primaryNav = [
  ["/app", "Overview"],
  ["/app/prompts", "Questions"],
  ["/app/runs", "AI Results"],
  ["/app/source-map", "Sources"],
  ["/app/competitors", "Competitors"],
  ["/app/opportunities", "Opportunities"],
  ["/app/placements", "Actions"],
  ["/app/analytics", "Analytics"],
] as const;

const workspaceNav = [
  ["/app/alerts", "Alerts"],
  ["/app/team", "Team"],
  ["/app/settings#integrations", "Integrations"],
  ["/app/settings", "Settings"],
] as const;

function isCurrent(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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
  return <>
    <nav aria-label="Main workspace">
      {primaryNav.map(([href, label]) => {
        const current = isCurrent(pathname, href);
        return <Link className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} key={href} href={href} onClick={onNavigate}>{label}<span aria-hidden="true">&rarr;</span></Link>;
      })}
    </nav>
    <nav aria-label="Workspace tools">
      {workspaceNav.map(([href, label]) => {
        const current = isCurrent(pathname, href);
        return <Link className={current ? "is-current" : ""} aria-current={current ? "page" : undefined} key={href} href={href} onClick={onNavigate}>{label}<span aria-hidden="true">&rarr;</span></Link>;
      })}
    </nav>
  </>;
}

export function WorkspaceSidebar({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  return <aside className="app-sidebar">
    <Wordmark inverse />
    <NavigationLinks pathname={pathname} />
    <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
    <SignOutButton demo={viewer.mode === "demo"} />
  </aside>;
}

export function WorkspaceMobileNavigation({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const closeMenu = () => { if (mobileMenu.current) mobileMenu.current.open = false; };
  return <details className="app-mobile-nav" ref={mobileMenu}>
      <summary>Workspace menu</summary>
      <div className="app-mobile-nav__panel">
        <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
        <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
        <SignOutButton demo={viewer.mode === "demo"} />
      </div>
    </details>;
}
