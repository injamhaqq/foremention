import { Wordmark } from "@/components/brand";
import { WorkspaceMobileNavigation, WorkspaceSidebar } from "@/components/workspace-navigation";
import { WorkspaceKeyboardShortcuts } from "@/components/workspace-keyboard-shortcuts";
import { WorkspaceGlobalSearch } from "@/components/workspace-global-search";
import type { Viewer } from "@/lib/auth";
import type { WorkspaceNotification, WorkspaceProject } from "@/lib/data";
import { NotificationBell } from "@/components/notification-bell";
import { WorkspaceStatusBadge } from "@/components/workspace-status-badge";
import type { WorkspaceSetupState } from "@/lib/workspace-setup-status";

export function AppShell({ viewer, organizationName, projects, activeProjectId, notifications, setupState, children }: { viewer: Viewer; organizationName?: string; projects: WorkspaceProject[]; activeProjectId?: string; notifications: WorkspaceNotification[]; setupState?: WorkspaceSetupState; children: React.ReactNode }) {
  return <div className="app-frame">
    <a className="skip-link" href="#app-content">Skip to workspace content</a>
    <WorkspaceKeyboardShortcuts />
    <WorkspaceSidebar viewer={viewer} organizationName={organizationName} projects={projects} activeProjectId={activeProjectId} setupState={setupState} />
    <div className="app-main" id="app-content" tabIndex={-1}>
      <header className="app-topbar">
        <WorkspaceMobileNavigation viewer={viewer} organizationName={organizationName} projects={projects} activeProjectId={activeProjectId} setupState={setupState} />
        <div>
          <span className="app-topbar__brand-label"><Wordmark /></span>
          <WorkspaceStatusBadge state={setupState || (activeProjectId ? "ready" : "missing")} demo={viewer.mode === "demo"} />
        </div>
        <WorkspaceGlobalSearch />
        <div className="app-topbar__account"><NotificationBell initialItems={notifications} /><div className="app-user"><span>{viewer.name.slice(0, 1).toUpperCase()}</span><div><strong>{viewer.name}</strong><small>{viewer.email}</small></div></div></div>
      </header>
      {children}
    </div>
  </div>;
}
