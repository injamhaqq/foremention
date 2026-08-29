"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Arrow, Wordmark } from "@/components/brand";
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

export function WorkspaceSidebar({ viewer, workspaceName }: { viewer: Viewer; workspaceName?: string }) {
  const pathname = usePathname();
  return <aside className="app-sidebar registered-workspace-sidebar">
    <Wordmark />
    <div className="app-sidebar__navigation">
      <NavigationLinks pathname={pathname} />
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
  const closeMenu = () => { if (mobileMenu.current) mobileMenu.current.open = false; };
  return <details className="app-mobile-nav registered-workspace-mobile" ref={mobileMenu}>
      <summary>Workspace menu</summary>
      <div className="app-mobile-nav__panel">
        <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
        <WorkspaceIdentity viewer={viewer} workspaceName={workspaceName} />
        <SignOutButton demo={viewer.mode === "demo"} />
      </div>
    </details>;
}
