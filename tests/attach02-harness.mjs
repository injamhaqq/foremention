// Chat02 (CV-04 / A11 / CV-08): local two-tenant route harness.
//
// Loads the REAL route modules (TypeScript transpiled in-process) and the real
// security helpers (origin guard, account security, session cookies, auth-next),
// replacing only I/O boundaries:
//   - "@/lib/supabase-rest"  -> an in-memory PostgREST emulator (FakePostgrest)
//   - "@/lib/auth"           -> the acting synthetic viewer
//   - "@/lib/data"           -> workspace context derived from emulator memberships
//   - job / email / billing provider modules -> recording stubs
//
// The emulator applies a deliberately simple RLS model to token-bound requests
// (rows visible only inside the caller's member organizations) and NO
// restriction to service-role requests, so a route that relies on a
// service-role query without its own organization predicate leaks in tests.
// This is NOT proof of production RLS policy correctness; that needs the
// nonproduction Supabase matrix in docs/execution/attach-v1/02-proposals/.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const realRequire = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);

// Pure helpers that are executed for real (never mocked) by the harness.
const REAL_LIBS = new Set([
  "@/lib/request-security",
  "@/lib/account-security",
  "@/lib/session-cookies",
  "@/lib/google-auth",
  "@/lib/csv",
  "@/lib/record-sharing",
]);

export const SITE = "https://foremention.com";
process.env.NEXT_PUBLIC_SITE_URL = SITE;

function compile(relPath) {
  const source = readFileSync(new URL(relPath, root), "utf8");
  return ts.transpileModule(source, {
    fileName: relPath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
}

export function loadModule(relPath, deps = {}, cache = new Map()) {
  if (cache.has(relPath)) return cache.get(relPath);
  const loaded = { exports: {} };
  cache.set(relPath, loaded.exports);
  const require = (id) => {
    if (Object.prototype.hasOwnProperty.call(deps, id)) return deps[id];
    if (REAL_LIBS.has(id)) {
      const path = `${id.replace("@/", "")}.ts`;
      return loadModule(path, deps, cache);
    }
    if (id === "next/server" || id === "next/headers" || id === "next/navigation") return realRequire(id);
    throw new Error(`attach02 harness: unexpected import ${id} from ${relPath}`);
  };
  runInNewContext(compile(relPath), {
    module: loaded, exports: loaded.exports, require, process, console,
    Response, Request, Headers, URL, URLSearchParams, TextEncoder, TextDecoder,
    crypto: globalThis.crypto, atob, btoa, setTimeout, clearTimeout, structuredClone,
    Date, JSON, Math, Number, String, Boolean, Array, Object, Promise, Error, RegExp, Set, Map, Symbol, Uint8Array,
  }, { filename: `${relPath}.attach02.cjs` });
  cache.set(relPath, loaded.exports);
  return loaded.exports;
}

export function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Synthetic, unsigned JWT. The emulator maps it to a user; nothing verifies it. */
export function syntheticJwt(claims) {
  return `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url(claims)}.synthetic`;
}

export function freshToken(sub, { authAgeSeconds = 30, tokenAgeSeconds = 30, method = "password" } = {}) {
  const now = Math.floor(Date.now() / 1000);
  return syntheticJwt({ sub, role: "authenticated", iat: now - tokenAgeSeconds, exp: now + 3600 - tokenAgeSeconds, amr: [{ method, timestamp: now - authAgeSeconds }] });
}

const RESERVED = new Set(["select", "limit", "order", "offset", "on_conflict"]);

function matches(row, column, expression) {
  const value = row[column];
  if (expression.startsWith("eq.")) return String(value) === decodeURIComponent(expression.slice(3));
  if (expression.startsWith("neq.")) return String(value) !== decodeURIComponent(expression.slice(4));
  if (expression.startsWith("in.(") && expression.endsWith(")")) return expression.slice(4, -1).split(",").includes(String(value));
  if (expression === "is.null") return value === null || value === undefined;
  throw new Error(`attach02 emulator: unsupported filter ${column}=${expression}`);
}

export class FakePostgrest {
  constructor(tables, tokens) {
    this.tables = structuredClone(tables);
    this.tokens = tokens; // token -> user id
    this.calls = [];
    this.rpcCalls = [];
  }

  orgsOf(userId) {
    return new Set(this.tables.organization_members.filter((m) => m.user_id === userId).map((m) => m.organization_id));
  }

  rest = async (path, options = {}) => {
    const [resource, query = ""] = path.split("?");
    const method = options.method || "GET";
    const actor = options.token ? (this.tokens.get(options.token) || "invalid-token") : null;
    const auth = options.serviceRole && !options.token ? "service-role" : actor ? "user" : "anon";
    this.calls.push({ method, resource, query, auth, actor, body: options.body });
    if (resource.startsWith("rpc/")) {
      this.rpcCalls.push({ name: resource.slice(4), auth, body: options.body });
      return this.rpcResult?.(resource.slice(4), options.body) ?? [];
    }
    const table = this.tables[resource];
    if (!table) throw new Error(`attach02 emulator: unknown table ${resource}`);
    const params = new URLSearchParams(query);
    const filters = [...params.entries()].filter(([key]) => !RESERVED.has(key));
    const visible = (row) => {
      if (auth === "service-role") return true;
      if (auth === "anon") return false;
      return this.orgsOf(actor).has(row.organization_id);
    };
    const selected = () => table.filter((row) => visible(row) && filters.every(([column, expression]) => matches(row, column, expression)));
    if (method === "GET") {
      const limit = Number(params.get("limit") || Infinity);
      return structuredClone(selected().slice(0, limit));
    }
    if (method === "PATCH") {
      const rows = selected();
      for (const row of rows) Object.assign(row, structuredClone(options.body));
      return options.prefer?.includes("return=representation") ? structuredClone(rows) : undefined;
    }
    if (method === "DELETE") {
      const rows = new Set(selected());
      this.tables[resource] = table.filter((row) => !rows.has(row));
      return undefined;
    }
    if (method === "POST") {
      const inserted = [];
      for (const body of [options.body].flat()) {
        if (auth !== "service-role" && !visible(body)) throw Object.assign(new Error("new row violates row-level security policy"), { status: 403 });
        const conflict = params.get("on_conflict")?.split(",");
        const existing = conflict ? table.find((row) => conflict.every((column) => row[column] === body[column])) : null;
        if (existing && options.prefer?.includes("merge-duplicates")) Object.assign(existing, structuredClone(body));
        else if (!existing) {
          const row = { id: body.id || `${resource}-${table.length + 1}`, created_at: new Date().toISOString(), ...structuredClone(body) };
          table.push(row);
          inserted.push(row);
        }
      }
      return options.prefer?.includes("return=representation") ? structuredClone(inserted) : undefined;
    }
    throw new Error(`attach02 emulator: unsupported method ${method}`);
  };

  /** Every mutating call that touched a row-set filtered to another org. */
  writesTouching(organizationId) {
    return this.calls.filter((call) => call.method !== "GET" && (
      call.query.includes(organizationId) || JSON.stringify(call.body || {}).includes(organizationId)
    ));
  }
}

export const ORG_A = "aaaaaaaa-0000-4000-8000-00000000000a";
export const ORG_B = "bbbbbbbb-0000-4000-8000-00000000000b";
export const PROJECT_A1 = "a1a1a1a1-0000-4000-8000-0000000000a1";
export const PROJECT_A2 = "a2a2a2a2-0000-4000-8000-0000000000a2";
export const PROJECT_B1 = "b1b1b1b1-0000-4000-8000-0000000000b1";

export const USERS = {
  aOwner: { id: "11111111-0000-4000-8000-000000000001", email: "a-owner@a.example.test" },
  aAnalyst: { id: "11111111-0000-4000-8000-000000000002", email: "a-analyst@a.example.test" },
  aViewer: { id: "11111111-0000-4000-8000-000000000003", email: "a-viewer@a.example.test" },
  bOwner: { id: "22222222-0000-4000-8000-000000000001", email: "b-owner@b.example.test" },
  bAnalyst: { id: "22222222-0000-4000-8000-000000000002", email: "b-analyst@b.example.test" },
  revoked: { id: "33333333-0000-4000-8000-000000000001", email: "revoked@a.example.test" },
  invitee: { id: "44444444-0000-4000-8000-000000000001", email: "invitee@new.example.test" },
};

export function twoTenantTables() {
  const now = Date.now();
  return {
    organizations: [
      { id: ORG_A, organization_id: ORG_A, name: "Synthetic Org A" },
      { id: ORG_B, organization_id: ORG_B, name: "Synthetic Org B" },
    ],
    organization_members: [
      { organization_id: ORG_A, user_id: USERS.aOwner.id, role: "owner" },
      { organization_id: ORG_A, user_id: USERS.aAnalyst.id, role: "analyst" },
      { organization_id: ORG_A, user_id: USERS.aViewer.id, role: "viewer" },
      { organization_id: ORG_B, user_id: USERS.bOwner.id, role: "owner" },
      { organization_id: ORG_B, user_id: USERS.bAnalyst.id, role: "analyst" },
    ],
    projects: [
      { id: PROJECT_A1, organization_id: ORG_A, name: "A1", status: "active" },
      { id: PROJECT_A2, organization_id: ORG_A, name: "A2", status: "active" },
      { id: PROJECT_B1, organization_id: ORG_B, name: "B1", status: "active" },
    ],
    runs: [
      { id: "aaaa0001-0000-4000-8000-0000000000a1", organization_id: ORG_A, project_id: PROJECT_A1, status: "queued", started_at: null },
      { id: "aaaa0002-0000-4000-8000-0000000000a2", organization_id: ORG_A, project_id: PROJECT_A2, status: "running", started_at: new Date(now - 60_000).toISOString() },
      { id: "bbbb0001-0000-4000-8000-0000000000b1", organization_id: ORG_B, project_id: PROJECT_B1, status: "queued", started_at: null },
    ],
    invitations: [],
    billing_accounts: [
      { organization_id: ORG_B, provider: "paddle", external_customer_id: "ctm_synthetic_org_b" },
    ],
    account_deletion_requests: [],
    record_shares: [],
    audit_logs: [],
    notifications: [],
  };
}

/** Builds the dependency set a route sees for one acting viewer. */
export function workspaceDeps(db, viewerRef, extra = {}) {
  const activeProject = extra.activeProject || new Map();
  const membership = (viewer) => db.tables.organization_members.find((m) => m.user_id === viewer.id) || null;
  const data = {
    getPrimaryOrganizationId: async (viewer) => membership(viewer)?.organization_id || null,
    getPrimaryWorkspaceRole: async (viewer) => membership(viewer)?.role || null,
    loadWorkspaceContext: async (viewer) => {
      const member = membership(viewer);
      if (!member) return null;
      const projects = db.tables.projects.filter((p) => p.organization_id === member.organization_id && p.status === "active");
      const project = projects.find((p) => p.id === activeProject.get(viewer.id)) || projects[0];
      const organization = db.tables.organizations.find((o) => o.id === member.organization_id);
      return project ? { organizationId: member.organization_id, projectId: project.id, organizationName: organization.name, projectName: project.name } : null;
    },
    // Mirrors lib/data.ts loadRuns/loadRunAnswers: token-bound, active project only.
    loadRuns: async (viewer) => {
      const context = await data.loadWorkspaceContext(viewer);
      if (!context) return [];
      const rows = await db.rest(`runs?select=id,status&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken });
      return rows.map((row) => ({ id: row.id, date: "2026-10-13", status: row.status }));
    },
    loadRunAnswers: async (viewer, runId) => {
      const context = await data.loadWorkspaceContext(viewer);
      if (!context) return [];
      const rows = await db.rest(`runs?select=id&id=eq.${runId}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { token: viewer.accessToken });
      return rows.length ? [{ prompt: `question for ${runId}`, provider: "synthetic", model: "m", status: "verified", collectedAt: "2026-10-13", answer: `answer for ${runId}`, citations: [] }] : [];
    },
    loadPendingDeletionRequest: async (viewer) => {
      const member = membership(viewer);
      const row = member && db.tables.account_deletion_requests.find((r) => r.organization_id === member.organization_id && r.status === "pending");
      return row ? { id: row.id, scheduledAt: row.scheduled_for } : null;
    },
  };
  return {
    "@/lib/supabase-rest": { supabaseRest: db.rest, isMissingRelationError: () => false },
    "@/lib/auth": {
      getViewer: async () => viewerRef.current,
      requireViewer: async () => { if (!viewerRef.current) throw new Error("NEXT_REDIRECT /login"); return viewerRef.current; },
    },
    "@/lib/data": data,
    ...extra.modules,
  };
}

export function viewerFor(db, user, overrides = {}) {
  const token = overrides.accessToken || freshToken(user.id, overrides.tokenOptions);
  db.tokens.set(token, user.id);
  return { id: user.id, email: user.email, name: user.email.split("@")[0], mode: "supabase", accessToken: token, emailVerified: true, ...overrides, accessToken: token };
}

export function request(path, { method = "POST", origin = SITE, body, headers = {} } = {}) {
  return new Request(`${SITE}${path}`, {
    method,
    headers: { ...(origin ? { origin } : {}), ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const params = (id) => ({ params: Promise.resolve({ id }) });
