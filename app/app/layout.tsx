import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";
import { loadNotifications, loadWorkspaceSummary } from "@/lib/data";
import { PostHogIdentity } from "@/components/posthog-analytics";
import { WorkspaceActivationAnalytics } from "@/components/workspace-activation-analytics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  // Authentication must never become a Cloudflare Worker exception because
  // the workspace database is temporarily unavailable. The child route still
  // decides whether to show onboarding, data, or a recoverable error state.
  const [workspace, notifications] = await Promise.all([
    loadWorkspaceSummary(viewer).catch((error) => {
      console.error("Workspace summary unavailable", error);
      return null;
    }),
    loadNotifications(viewer).catch(() => []),
  ]);
  return <AppShell viewer={viewer} workspaceName={workspace?.organizationName} notifications={notifications}><PostHogIdentity viewerId={viewer.id} organizationId={workspace?.organizationId} demo={viewer.mode === "demo"} /><WorkspaceActivationAnalytics demo={viewer.mode === "demo"} />{children}</AppShell>;
}
