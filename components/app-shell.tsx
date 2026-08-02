import { Wordmark } from "@/components/brand";
import { WorkspaceMobileNavigation, WorkspaceSidebar } from "@/components/workspace-navigation";
import { WorkspaceKeyboardShortcuts } from "@/components/workspace-keyboard-shortcuts";
import { WorkspaceGlobalSearch } from "@/components/workspace-global-search";
import type { Viewer } from "@/lib/auth";

export function AppShell({ viewer, workspaceName, children }: { viewer: Viewer; workspaceName?: string; children: React.ReactNode }) {
  return <div className="app-frame">
    <WorkspaceKeyboardShortcuts />
    <WorkspaceSidebar viewer={viewer} workspaceName={workspaceName} />
    <div className="app-main">
      <header className="app-topbar">
        <WorkspaceMobileNavigation viewer={viewer} workspaceName={workspaceName} />
        <div>
          <span className="mobile-wordmark"><Wordmark /></span>
          <span className="demo-badge">{viewer.mode === "demo" ? "Fictional demo" : workspaceName ? "Customer data" : "Setup required"}</span>
        </div>
        <WorkspaceGlobalSearch />
        <div className="app-user"><span>{viewer.name.slice(0, 1).toUpperCase()}</span><div><strong>{viewer.name}</strong><small>{viewer.email}</small></div></div>
      </header>
      {children}
    </div>
  </div>;
}
