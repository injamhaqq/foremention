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

export async function supabaseRest<T>(path: string, options: RestOptions = {}): Promise<T> {
  if (!supabaseUrl || !anonKey) throw new Error("Supabase is not configured.");
  const key = options.serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey : anonKey;
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
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
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
