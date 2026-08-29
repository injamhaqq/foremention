import { Wordmark } from "@/components/brand";
import { WorkspaceMobileNavigation, WorkspaceSidebar } from "@/components/workspace-navigation";
import { WorkspaceKeyboardShortcuts } from "@/components/workspace-keyboard-shortcuts";
import { WorkspaceGlobalSearch } from "@/components/workspace-global-search";
import type { Viewer } from "@/lib/auth";
import type { WorkspaceNotification } from "@/lib/data";
import { NotificationBell } from "@/components/notification-bell";

export function AppShell({ viewer, workspaceName, notifications, children }: { viewer: Viewer; workspaceName?: string; notifications: WorkspaceNotification[]; children: React.ReactNode }) {
  return <div className="app-frame">
    <a className="skip-link" href="#app-content">Skip to workspace content</a>
    <WorkspaceKeyboardShortcuts />
    <WorkspaceSidebar viewer={viewer} workspaceName={workspaceName} />
    <div className="app-main" id="app-content" tabIndex={-1}>
      <header className="app-topbar">
        <WorkspaceMobileNavigation viewer={viewer} workspaceName={workspaceName} />
        <div>
          <span className="app-topbar__brand-label"><Wordmark /></span>
          <span className="demo-badge">{viewer.mode === "demo" ? "Fictional demo" : workspaceName ? "Customer data" : "Setup required"}</span>
        </div>
        <WorkspaceGlobalSearch />
        <div className="app-topbar__account"><NotificationBell initialItems={notifications} /><div className="app-user"><span>{viewer.name.slice(0, 1).toUpperCase()}</span><div><strong>{viewer.name}</strong><small>{viewer.email}</small></div></div></div>
      </header>
      {children}
    </div>
  </div>;
}
