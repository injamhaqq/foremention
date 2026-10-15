import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";
import { workspaceSetupState } from "@/lib/workspace-setup-status";
import { loadNotifications, loadWorkspaceProjects, loadWorkspaceSummary } from "@/lib/data";
import { PostHogIdentity } from "@/components/posthog-analytics";
import { RetentionSurfaceBridge } from "@/components/retention-surface-bridge";
import { WorkspaceActivationAnalytics } from "@/components/workspace-activation-analytics";
import "./workspace-accessibility.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  // Authentication must never become a Cloudflare Worker exception because
  // the workspace database is temporarily unavailable. The child route still
  // decides whether to show onboarding, data, or a recoverable error state.
  const [summary, projects, notifications] = await Promise.all([
    loadWorkspaceSummary(viewer).then(
      (workspace) => ({ workspace, failed: false }),
      (error) => {
        console.error("Workspace summary unavailable", error);
        return { workspace: null, failed: true };
      },
    ),
    loadWorkspaceProjects(viewer).catch(() => []),
    loadNotifications(viewer).catch(() => []),
  ]);
  const workspace = summary.workspace;
  // A failed lookup is not missing setup: only a confirmed absent workspace
  // shows "Setup required".
  const setupState = workspaceSetupState({ summaryProjectId: workspace?.projectId, summaryFailed: summary.failed, knownProjectCount: projects.length });
  return <AppShell viewer={viewer} organizationName={workspace?.organizationName} projects={projects} activeProjectId={workspace?.projectId} notifications={notifications} setupState={setupState}><PostHogIdentity viewerId={viewer.id} organizationId={workspace?.organizationId} demo={viewer.mode === "demo"} /><WorkspaceActivationAnalytics demo={viewer.mode === "demo"} /><RetentionSurfaceBridge />{children}</AppShell>;
}
