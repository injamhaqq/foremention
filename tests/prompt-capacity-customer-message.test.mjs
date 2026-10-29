// Payable-path correctness (Refs #516 #532): a workspace that has already paid
// must get an accurate ceiling message, and the atomic (advisory-locked) DB
// admission must surface as the same 429 as the ordinary read-side guard, never
// an opaque 500. These run the real route and the real product-limits helper.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(path, mocks = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
    module: { exports },
    process,
    console,
    Date,
    Set,
    Map,
    JSON,
    Object,
    Array,
    Number,
    String,
    Math,
    Error,
    RegExp,
    Promise,
    URL,
    encodeURIComponent,
    crypto,
  });
  return exports;
}

const productLimits = loadModule("lib/product-limits.ts");
const supabaseRest = loadModule("lib/supabase-rest.ts");
const { SupabaseRequestError } = supabaseRest;

const coreEntitlement = { status: "active", expires_at: null, max_prompts: 25, billing_source: "paddle", package_key: "core" };
const signalEntitlement = { status: "active", expires_at: null, max_prompts: 100, billing_source: "paddle", package_key: "signal" };
const trialEntitlement = { status: "active", expires_at: "2099-01-01T00:00:00Z", max_prompts: 25, billing_source: "trial", package_key: "core" };
const freeEntitlement = null;

function routeWith(entitlement, { activeQuestionCount, rpc = async () => ({ id: "prompt-new", version: 1 }) } = {}) {
  const calls = [];
  const rest = async (path, options) => {
    calls.push({ path, options });
    if (path.startsWith("organization_entitlements?")) return entitlement ? [entitlement] : [];
    if (path.startsWith("prompts?select=id")) return Array.from({ length: activeQuestionCount }, (_, i) => ({ id: `p${i}` }));
    if (path.startsWith("rpc/create_prompt_versioned")) return rpc();
    throw new Error(`Unexpected read: ${path}`);
  };
  const route = loadModule("app/api/prompts/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
    "@/lib/auth": { getViewer: async () => ({ mode: "supabase", accessToken: "viewer-token", id: "user-1" }) },
    "@/lib/data": {
      loadPrompts: async () => [],
      getPrimaryWorkspaceRole: async () => "owner",
      loadWorkspaceContext: async () => ({ organizationId: "org-a", projectId: "proj-a", categoryId: "cat-a", clusterId: "clu-a" }),
    },
    "@/lib/product-limits": productLimits,
    "@/lib/request-security": { isTrustedMutationOrigin: () => true },
    "@/lib/supabase-rest": { ...supabaseRest, supabaseRest: rest },
    "@/lib/input-validation": { cleanText: (v, l) => (typeof v === "string" ? v.trim().slice(0, l) : ""), readJsonObject: async () => ({ text: "Which platform fits a mid-market buyer?" }) },
    "@/lib/approved-buyer-questions": { exceedsBuyerQuestionLength: () => false },
    "@/lib/buyer-question-edit": { updatePromptInProject: async () => ({ ok: true, row: {} }) },
  });
  return { route, calls };
}

test("a paying Core customer at their cap is not told paid capacity is inactive", async () => {
  const { route } = routeWith(coreEntitlement, { activeQuestionCount: 25 });
  const response = await route.POST(new Request("https://foremention.com/api/prompts", { method: "POST" }));
  assert.equal(response.status, 429);
  assert.doesNotMatch(response.body.error, /Paid capacity is enabled only after verified billing activation/i);
  assert.match(response.body.error, /Your Core plan includes 25 buyer questions/);
  assert.match(response.body.error, /Upgrade to Signal/);
});

test("a paying Signal customer at their cap gets a Signal-accurate message", async () => {
  const { route } = routeWith(signalEntitlement, { activeQuestionCount: 100 });
  const response = await route.POST(new Request("https://foremention.com/api/prompts", { method: "POST" }));
  assert.equal(response.status, 429);
  assert.match(response.body.error, /Your Signal plan includes 100 buyer questions/);
  assert.doesNotMatch(response.body.error, /Upgrade to Signal/);
});

test("a trial and a free workspace get their own accurate next step", () => {
  assert.match(productLimits.buyerQuestionCeilingMessage(trialEntitlement, 25), /Your Core trial includes 25 buyer questions/);
  assert.match(productLimits.buyerQuestionCeilingMessage(freeEntitlement, 5), /free plan allows 5 buyer questions/);
});

test("a concurrent atomic refusal (PT429 from the DB) returns 429, not an opaque 500", async () => {
  const { route } = routeWith(coreEntitlement, {
    activeQuestionCount: 24, // read-side count still allows it; the DB wins the race
    rpc: async () => { throw new SupabaseRequestError(500, "The workspace database could not complete this request.", "PT429"); },
  });
  const response = await route.POST(new Request("https://foremention.com/api/prompts", { method: "POST" }));
  assert.equal(response.status, 429);
  assert.match(response.body.error, /Your Core plan includes 25 buyer questions/);
});

test("a genuine database failure is still surfaced, not masked as capacity", async () => {
  const { route } = routeWith(coreEntitlement, {
    activeQuestionCount: 1,
    rpc: async () => { throw new SupabaseRequestError(500, "The workspace database could not complete this request.", "XX000"); },
  });
  await assert.rejects(
    () => route.POST(new Request("https://foremention.com/api/prompts", { method: "POST" })),
    (error) => error instanceof SupabaseRequestError && error.code === "XX000",
  );
});
