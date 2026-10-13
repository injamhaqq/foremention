import { SupportCenter } from "@/components/support-center";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { resolveWorkspaceSetupState } from "@/lib/workspace-setup-state";

export default async function SupportPage() {
  const viewer = await requireViewer("/app/support");
  // A26: a missing workspace is a setup state. A failed lookup is NOT treated
  // as "no workspace" — the client then loads normally and shows the real error.
  let hasWorkspace = true;
  if (viewer.mode !== "demo") {
    try {
      hasWorkspace = Boolean(await loadWorkspaceContext(viewer));
    } catch {
      hasWorkspace = true;
    }
  }
  const setupState = resolveWorkspaceSetupState({ demo: viewer.mode === "demo", hasWorkspace, email: viewer.email });
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">{setupState.kind === "setup_required" ? "Account support" : "Workspace support"}</span>
        <h1>Support</h1>
        <p>{setupState.kind === "setup_required"
          ? "Account help is available before you create a workspace. In-app requests with workspace context become available after setup."
          : "Submit an account or product question with your workspace context attached. Foremention records the request first, then prepares any AI-assisted reply for human review before sending."}</p>
      </div>
    </div>
    <SupportCenter demo={viewer.mode === "demo"} setupState={setupState} />
    <div className="evidence-note"><strong>Support boundary</strong><p>Support diagnostics are operational context, not Recommendation Intelligence evidence. A drafted reply is not sent until an authorized operator approves and separately executes it.</p></div>
  </main>;
}
