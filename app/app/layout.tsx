import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceSummary } from "@/lib/data";
import { PostHogIdentity } from "@/components/posthog-analytics";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer();
  // Authentication must never become a Cloudflare Worker exception because
  // the workspace database is temporarily unavailable. The child route still
  // decides whether to show onboarding, data, or a recoverable error state.
  const workspace = await loadWorkspaceSummary(viewer).catch((error) => {
    console.error("Workspace summary unavailable", error);
    return null;
  });
  return <AppShell viewer={viewer} workspaceName={workspace?.organizationName}><PostHogIdentity viewerId={viewer.id} organizationId={workspace?.organizationId} demo={viewer.mode === "demo"} />{children}</AppShell>;
}
