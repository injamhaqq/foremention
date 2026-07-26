import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceSummary } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) { const viewer = await requireViewer(); const workspace = await loadWorkspaceSummary(viewer); return <AppShell viewer={viewer} workspaceName={workspace?.organizationName}>{children}</AppShell>; }
