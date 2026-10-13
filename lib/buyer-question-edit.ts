/**
 * A11 (Chat04 caller, FM-00 migrations 20261013100000 + 20261013160000):
 * buyer-question edits go through the project-bound RPC
 * `update_prompt_versioned_in_project`, which locks the prompt row and
 * re-checks organization + project + active project in the database before
 * delegating to the existing versioning RPC.
 *
 * The project id always comes from the server-resolved active workspace
 * context, never from the request body. The route also keeps its own
 * org+project-scoped read before calling this (defence in depth).
 *
 * Phase 2: the org-only `update_prompt_versioned` is no longer callable by
 * `authenticated` (migration 20261013160000), and there is no legacy
 * fallback. If the project-bound function is missing from the schema cache
 * (HTTP 404, code PGRST202) the edit fails closed with 503 instead of
 * reaching an RPC that cannot enforce the project.
 */
export const PROJECT_SCOPED_PROMPT_RPC = "rpc/update_prompt_versioned_in_project";

export type PromptEditScope = { organizationId: string; projectId: string };
export type PromptEditChange = { promptId: string; text: string | null; active: boolean | null; changeReason: string };
export type UpdatedPromptRow = { id: string; prompt_key: string; prompt_text: string; active: boolean; version: number };
export type RpcCaller = <T>(path: string, body: Record<string, unknown>) => Promise<T>;
export type PromptEditResult =
  | { ok: true; row: UpdatedPromptRow; rpc: typeof PROJECT_SCOPED_PROMPT_RPC }
  | { ok: false; status: number; error: string };

type ErrorShape = { status?: unknown; code?: unknown };
const shape = (error: unknown): ErrorShape => (error && typeof error === "object" ? error as ErrorShape : {});

/** True only when the project-bound function is not deployed (schema cache miss). */
export function isMissingProjectScopedFunction(error: unknown): boolean {
  const { status, code } = shape(error);
  return status === 404 && code === "PGRST202";
}

export function projectScopedPromptBody(scope: PromptEditScope, change: PromptEditChange) {
  return {
    p_prompt_id: change.promptId,
    p_organization_id: scope.organizationId,
    p_project_id: scope.projectId,
    p_prompt_text: change.text,
    p_active: change.active,
    p_change_reason: change.changeReason,
  };
}

/**
 * Map a database rejection from the project-bound RPC to a client response
 * that does not reveal whether the question exists in another project/org.
 */
export function promptEditFailure(error: unknown): { status: number; error: string } | null {
  const { status, code } = shape(error);
  if (code === "P0001" || status === 404 || code === "PGRST116") {
    return { status: 404, error: "Buyer question not found in the active project." };
  }
  if (status === 401 || status === 403 || code === "42501") {
    return { status: 403, error: "Your workspace role cannot edit buyer questions in this project." };
  }
  return null;
}

export const PROJECT_SCOPED_RPC_UNAVAILABLE = {
  status: 503,
  error: "Buyer-question editing is unavailable until the project-bound database update is applied.",
} as const;

export async function updatePromptInProject(call: RpcCaller, scope: PromptEditScope, change: PromptEditChange): Promise<PromptEditResult> {
  const body = projectScopedPromptBody(scope, change);
  try {
    const row = await call<UpdatedPromptRow>(PROJECT_SCOPED_PROMPT_RPC, body);
    return { ok: true, row, rpc: PROJECT_SCOPED_PROMPT_RPC };
  } catch (error) {
    // Fail closed: never fall back to the org-only RPC (A11 phase 2).
    if (isMissingProjectScopedFunction(error)) return { ok: false, ...PROJECT_SCOPED_RPC_UNAVAILABLE };
    const mapped = promptEditFailure(error);
    if (mapped) return { ok: false, ...mapped };
    throw error;
  }
}
