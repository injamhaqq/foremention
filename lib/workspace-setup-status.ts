/**
 * Shell status for the signed-in top bar. "Setup required" is shown only when
 * the workspace is positively known not to exist. A failed lookup (database or
 * Worker subrequest hiccup) is "unavailable", which must never be presented as
 * missing setup to a customer whose workspace is already configured.
 */
export type WorkspaceSetupState = "ready" | "missing" | "unavailable";

export const WORKSPACE_CREATED_EVENT = "foremention:workspace-created";

export function workspaceSetupState(input: { summaryProjectId?: string | null; summaryFailed: boolean; knownProjectCount: number }): WorkspaceSetupState {
  if (input.summaryProjectId) return "ready";
  if (input.summaryFailed) return input.knownProjectCount > 0 ? "ready" : "unavailable";
  return "missing";
}

export function workspaceStatusLabel(state: WorkspaceSetupState, demo: boolean): string {
  if (demo) return "Fictional demo";
  if (state === "ready") return "Customer data";
  if (state === "missing") return "Setup required";
  return "Workspace";
}
