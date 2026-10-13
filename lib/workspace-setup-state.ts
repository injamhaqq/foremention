/**
 * A26 — one consistent "setup required" boundary for workspace-dependent
 * actions. A signed-in account without an organization/project is not an
 * error to retry and is never treated as membership: workspace actions are
 * withheld, while account help stays reachable through the existing verified
 * public contact channel. No grant is derived from fallback defaults.
 */
export const WORKSPACE_SETUP_REQUIRED_CODE = "workspace_setup_required" as const;
export const ACCOUNT_HELP_EMAIL = "hello@foremention.com" as const;

export type WorkspaceSetupState =
  | { kind: "demo" }
  | { kind: "ready" }
  | { kind: "setup_required"; accountHelpHref: string; setupHref: string };

export function accountHelpHref(email: string | null | undefined) {
  const subject = encodeURIComponent("Foremention account help (before workspace setup)");
  const body = encodeURIComponent([
    "Describe what you need help with. Never include passwords, API keys, recovery codes or tokens.",
    "",
    email ? `Signed-in account: ${email}` : "Signed-in account: (not shown)",
  ].join("\n"));
  return `mailto:${ACCOUNT_HELP_EMAIL}?subject=${subject}&body=${body}`;
}

export function resolveWorkspaceSetupState(input: {
  demo: boolean;
  hasWorkspace: boolean;
  email?: string | null;
}): WorkspaceSetupState {
  if (input.demo) return { kind: "demo" };
  if (input.hasWorkspace) return { kind: "ready" };
  return { kind: "setup_required", accountHelpHref: accountHelpHref(input.email), setupHref: "/app/onboarding" };
}

/** True only for the explicit server code, never for a generic 404/500. */
export function isWorkspaceSetupRequiredPayload(payload: unknown) {
  return Boolean(payload && typeof payload === "object"
    && (payload as { code?: unknown }).code === WORKSPACE_SETUP_REQUIRED_CODE);
}
