// Chat06 test support: a small in-memory PostgREST emulator with the filter,
// compare-and-set (PATCH ... WHERE), upsert and unique-constraint semantics the
// job code relies on. It is NOT a database: it exists to make race/replay
// behavior executable in unit tests. Real SQL/RLS acceptance stays with FM-00.

const UNIQUE = {
  run_attempts: [["run_id", "prompt_id", "provider", "attempt_number"]],
  run_answers: [["run_id", "prompt_key", "provider"]],
  usage_events: [],
  notifications: [["organization_id", "user_id", "event_key"]],
  ai_cost_events: [["run_attempt_id"]],
};

export class ConflictError extends Error {
  constructor(table) { super(`duplicate key value violates unique constraint on ${table}`); this.status = 409; }
}

function parseValue(raw) {
  if (raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return raw;
}

function matches(row, column, expr) {
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = decodeURIComponent(expr.slice(dot + 1));
  const value = row[column];
  switch (op) {
    case "eq": return String(value) === raw;
    case "neq": return String(value) !== raw;
    case "is": return raw === "null" ? value === null || value === undefined : value === parseValue(raw);
    case "in": return raw.replace(/^\(|\)$/g, "").split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(value));
    case "lt": return value !== null && value !== undefined && String(value) < raw;
    case "lte": return value !== null && value !== undefined && String(value) <= raw;
    case "gte": return value !== null && value !== undefined && String(value) >= raw;
    case "not": return !matches(row, column, raw);
    default: throw new Error("Unsupported filter op in fake PostgREST: " + op);
  }
}

export function createFakePostgrest({ tables = {}, rpc = {}, failNext = [] } = {}) {
  const db = Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.map((row) => ({ ...row }))]));
  const calls = [];
  let idCounter = 0;
  const table = (name) => (db[name] ??= []);

  async function rest(path, options = {}) {
    const method = options.method || "GET";
    calls.push({ path, method, body: options.body, serviceRole: options.serviceRole === true, token: options.token });
    const injected = failNext.findIndex((rule) => rule.method === method && path.startsWith(rule.prefix));
    if (injected >= 0) {
      const [rule] = failNext.splice(injected, 1);
      throw rule.error ?? new Error("Injected synthetic transport failure");
    }
    if (path.startsWith("rpc/")) {
      const fn = rpc[path.slice(4)];
      if (!fn) throw new Error("Unexpected RPC in fake PostgREST: " + path);
      return fn(options.body, db);
    }
    const [name, query = ""] = path.split("?");
    const params = new URLSearchParams(query.replace(/\+/g, "%2B"));
    const filters = [];
    let limit = Infinity;
    let onConflict = null;
    for (const [key, value] of params) {
      if (key === "select" || key === "order") continue;
      if (key === "limit") { limit = Number(value); continue; }
      if (key === "on_conflict") { onConflict = value.split(","); continue; }
      filters.push([key, value]);
    }
    const rows = table(name);
    const selected = () => rows.filter((row) => filters.every(([column, expr]) => matches(row, column, expr)));
    const representation = String(options.prefer || "").includes("return=representation");
    if (method === "GET") return selected().slice(0, limit).map((row) => ({ ...row }));
    if (method === "PATCH") {
      const hit = selected();
      for (const row of hit) Object.assign(row, Object.fromEntries(Object.entries(options.body || {}).filter(([, v]) => v !== undefined)));
      return representation ? hit.map((row) => ({ ...row })) : [];
    }
    if (method === "DELETE") {
      const hit = new Set(selected());
      db[name] = rows.filter((row) => !hit.has(row));
      return [];
    }
    if (method === "POST") {
      const inputs = Array.isArray(options.body) ? options.body : [options.body];
      const out = [];
      const ignore = String(options.prefer || "").includes("ignore-duplicates");
      for (const input of inputs) {
        const keys = onConflict ? [onConflict] : (UNIQUE[name] || []);
        const existing = keys.map((cols) => rows.find((row) => cols.every((col) => String(row[col]) === String(input[col])))).find(Boolean);
        if (existing) {
          if (!onConflict) throw new ConflictError(name);
          if (ignore) continue;
          Object.assign(existing, input);
          out.push({ ...existing });
          continue;
        }
        const row = { id: input.id ?? `00000000-0000-4000-8000-${String(++idCounter).padStart(12, "0")}`, created_at: new Date().toISOString(), ...input };
        rows.push(row);
        out.push({ ...row });
      }
      return representation ? out : [];
    }
    throw new Error("Unsupported method " + method);
  }
  return { rest, db, calls };
}
