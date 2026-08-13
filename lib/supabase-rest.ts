const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function supabaseConfigured() {
  return Boolean(supabaseUrl && anonKey);
}

type RestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  token?: string;
  body?: unknown;
  prefer?: string;
  serviceRole?: boolean;
};

export type SupabaseSignOutScope = "global" | "local" | "others";

export class SupabaseRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "SupabaseRequestError";
    this.status = status;
    this.code = code;
  }
}

export class SupabaseAuthError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "SupabaseAuthError";
    this.status = status;
    this.code = code;
  }

  get retryable() {
    return this.status === 429 || this.status >= 500;
  }
}

function safeDatabaseMessage(status: number, detail: string) {
  let parsed: { message?: string; code?: string } = {};
  try { parsed = JSON.parse(detail) as { message?: string; code?: string }; } catch { /* Non-JSON response. */ }
  const message = String(parsed.message || "");
  const allowed = [
    /authentication required/i,
    /permission/i,
    /workspace is not active/i,
    /free beta limit reached/i,
    /monthly ai spending ceiling reached/i,
    /maximum number of active collection runs/i,
    /incomplete workspace already exists/i,
    /queued run not found/i,
    /prompt limit exceeded/i,
    /competitor limit exceeded/i,
    /company, domain, and category are required/i,
    /at least one approved prompt is required/i,
  ];
  const safe = allowed.some((pattern) => pattern.test(message))
    ? message.slice(0, 300)
    : status === 404 ? "The requested workspace record was not found."
      : status === 409 ? "That change conflicts with the current workspace state."
        : status === 429 ? "This workspace has reached its current capacity."
          : "The workspace database could not complete this request.";
  return { message: safe, code: parsed.code };
}

/**
 * True when the database rejected a request because the table does not exist
 * yet. PostgREST reports an unknown relation as 404 with PGRST205 (missing from
 * the schema cache); Postgres itself reports 42P01. A pending forward-only
 * migration must degrade into an explainable state, never a crash.
 */
export function isMissingRelationError(error: unknown): boolean {
  if (!(error instanceof SupabaseRequestError)) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  return error.status === 404 && Boolean(error.code?.startsWith("PGRST2"));
}

function isOpaqueApiKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

export async function supabaseRest<T>(path: string, options: RestOptions = {}): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (options.serviceRole && !serviceRoleKey) {
    throw new Error("Server-side database processing is not configured.");
  }
  const key = options.serviceRole ? serviceRoleKey as string : anonKey;
  const authorization = options.token
    ? `Bearer ${options.token}`
    : isOpaqueApiKey(key) ? null : `Bearer ${key}`;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      ...(authorization ? { authorization } : {}),
      "content-type": "application/json",
      ...(options.prefer ? { prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    const safe = safeDatabaseMessage(response.status, detail);
    console.warn("Supabase REST request failed.", {
      resource: path.split("?")[0],
      method: options.method || "GET",
      status: response.status,
      code: safe.code || null,
      authorization: options.serviceRole ? "service-role" : options.token ? "user" : "anonymous",
    });
    const diagnosticMessage = options.serviceRole
      ? `${safe.message} (database status ${response.status}${safe.code ? `, code ${safe.code}` : ""})`
      : safe.message;
    throw new SupabaseRequestError(response.status, diagnosticMessage, safe.code);
  }
  const responseText = await response.text();
  if (!responseText.trim()) return undefined as T;
  return JSON.parse(responseText) as T;
}

function safeAuthError(status: number, responseText: string) {
  let data: Record<string, unknown> = {};
  try { data = responseText ? JSON.parse(responseText) as Record<string, unknown> : {}; } catch { /* Keep an opaque upstream response private. */ }
  const code = String(data.error_code || data.code || "").trim() || undefined;
  const providerMessage = String(data.msg || data.error_description || data.message || "Authentication failed.").trim();
  const safeMessage = status >= 500
    ? "The authentication service is temporarily unavailable."
    : status === 429
      ? "Authentication is temporarily rate limited. Please wait a moment and try again."
      : providerMessage.slice(0, 300) || "Authentication failed.";
  return new SupabaseAuthError(status, safeMessage, code);
}

export async function supabaseAuth(path: string, body: unknown) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const responseText = await response.text();
  if (!response.ok) throw safeAuthError(response.status, responseText);
  if (!responseText.trim()) return {} as Record<string, unknown>;
  try { return JSON.parse(responseText) as Record<string, unknown>; }
  catch { return {} as Record<string, unknown>; }
}

/**
 * Revoke Supabase Auth refresh session(s) with an explicit scope. Never rely on
 * the SDK/default global scope: ordinary Foremention sign-out is local, while
 * "Sign out all devices" is an explicit global security action.
 *
 * Supabase access-token JWTs remain stateless until their encoded expiry even
 * after the affected refresh sessions are revoked, so callers must not promise
 * instant invalidation of already-issued access tokens on other devices.
 */
export async function supabaseSignOut(accessToken: string, scope: SupabaseSignOutScope) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  if (!accessToken) throw new SupabaseAuthError(401, "A valid session is required to sign out.", "session_missing");
  const response = await fetch(`${supabaseUrl}/auth/v1/logout?scope=${encodeURIComponent(scope)}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    cache: "no-store",
  });
  if (response.ok) return;
  const responseText = await response.text();
  throw safeAuthError(response.status, responseText);
}
