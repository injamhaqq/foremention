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

export async function supabaseRest<T>(path: string, options: RestOptions = {}): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (options.serviceRole && !serviceRoleKey) {
    throw new Error("Server-side database processing is not configured.");
  }
  const key = options.serviceRole ? serviceRoleKey as string : anonKey;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      authorization: `Bearer ${options.token || key}`,
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
    throw new SupabaseRequestError(response.status, safe.message, safe.code);
  }
  const responseText = await response.text();
  if (!responseText.trim()) return undefined as T;
  return JSON.parse(responseText) as T;
}

export async function supabaseAuth(path: string, body: unknown) {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(data.msg || data.error_description || data.message || "Authentication failed."));
  return data;
}
