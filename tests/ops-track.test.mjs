// Ops and performance fix track (FM-02, FM-06, FM-07, FM-08/#351, FM-09, FM-10).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { evaluateCiGate } from "../scripts/release-gates/require-ci-success.mjs";
import {
  ANALYTICS_CONSENT_KEY,
  LEGACY_ANALYTICS_CONSENT_KEY,
  hasAnalyticsConsent,
  parseAnalyticsConsent,
} from "../lib/analytics-consent.ts";
import { braveSearchApiKey } from "../lib/free-web-retrieval.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const block = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `missing ${startMarker}`);
  const end = endMarker ? source.indexOf(endMarker, start + startMarker.length) : -1;
  return source.slice(start, end < 0 ? undefined : end);
};

// ---------------------------------------------------------------- FM-06 gate
const SHA = "991606c531b1ee6bf4c89779969ae23937fb5b1d";
const OTHER = "1d981da6aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ciRun = (over = {}) => ({
  id: 1, run_number: 10, run_attempt: 1, head_sha: SHA, event: "push", head_branch: "main",
  path: ".github/workflows/ci.yml", status: "completed", conclusion: "success",
  head_repository: { full_name: "injamhaqq/foremention" }, ...over,
});

test("FM-06 gate passes only for a successful CI push run on the exact main tip", () => {
  const ok = evaluateCiGate({ sha: SHA, mainSha: SHA, runs: [ciRun()], repository: "injamhaqq/foremention" });
  assert.equal(ok.ok, true);
  assert.equal(ok.runId, 1);
});

test("FM-06 gate refuses failed, cancelled, running, missing and foreign CI runs", () => {
  const refuse = (runs, extra = {}) => evaluateCiGate({ sha: SHA, mainSha: SHA, runs, repository: "injamhaqq/foremention", ...extra });
  assert.match(refuse([ciRun({ conclusion: "failure" })]).reason, /concluded failure/);
  assert.match(refuse([ciRun({ conclusion: "cancelled" })]).reason, /concluded cancelled/);
  assert.match(refuse([ciRun({ status: "in_progress", conclusion: null })]).reason, /still in_progress/);
  assert.match(refuse([]).reason, /no CI run/);
  assert.match(refuse([ciRun({ head_sha: OTHER })]).reason, /no CI run/);
  assert.match(refuse([ciRun({ event: "pull_request" })]).reason, /no CI run/);
  assert.match(refuse([ciRun({ head_branch: "feature" })]).reason, /no CI run/);
  assert.match(refuse([ciRun({ path: ".github/workflows/quality.yml" })]).reason, /no CI run/);
  assert.match(refuse([ciRun({ head_repository: { full_name: "fork/foremention" } })]).reason, /no CI run/);
  for (const result of [refuse([ciRun({ conclusion: "failure" })]), refuse([])]) assert.equal(result.ok, false);
});

test("FM-06 gate uses the latest run/attempt and refuses superseded or malformed SHAs", () => {
  const rerunGreen = [ciRun({ id: 1, run_attempt: 1, conclusion: "failure" }), ciRun({ id: 1, run_attempt: 2 })];
  assert.equal(evaluateCiGate({ sha: SHA, mainSha: SHA, runs: rerunGreen }).ok, true);
  const laterRed = [ciRun({ id: 1, run_number: 10 }), ciRun({ id: 2, run_number: 11, conclusion: "failure" })];
  assert.equal(evaluateCiGate({ sha: SHA, mainSha: SHA, runs: laterRed }).ok, false);
  assert.match(evaluateCiGate({ sha: SHA, mainSha: OTHER, runs: [ciRun()] }).reason, /main has moved/);
  assert.equal(evaluateCiGate({ sha: "main", mainSha: SHA, runs: [ciRun()] }).ok, false);
  assert.equal(evaluateCiGate({ sha: SHA, mainSha: "", runs: [ciRun()] }).ok, false);
});

test("FM-06 production deploy stays manual-only and is gated before any build or deploy", async () => {
  const wf = await text(".github/workflows/production-deploy.yml");
  const on = block(wf, "\non:\n", "\npermissions:");
  // Manual dispatch is the only trigger: a green CI never deploys production on
  // its own, and no untrusted workflow_run payload or artifact is ever read.
  assert.match(on, /^\s+workflow_dispatch:\s*$/m);
  assert.deepEqual(on.match(/^ {2}[a-z_]+:/gm), ["  workflow_dispatch:"]);
  assert.doesNotMatch(wf, /^\s*(workflow_run|push|pull_request_target|schedule):/m);
  assert.doesNotMatch(wf, /github\.event\.workflow_run/);
  assert.doesNotMatch(wf, /actions\/download-artifact|dawidd6\/action-download-artifact/);
  assert.match(wf, /^permissions:\n  contents: read\n/m);
  const gate = block(wf, "  gate:", "  deploy:");
  assert.match(gate, /node scripts\/release-gates\/require-ci-success\.mjs/);
  assert.match(gate, /if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(gate, /RELEASE_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(gate, /actions: read/);
  assert.doesNotMatch(gate, /write/);
  const deploy = block(wf, "  deploy:", "  trusted-release-acceptance:");
  assert.match(deploy, /needs: gate/);
  assert.match(deploy, /ref: \$\{\{ needs\.gate\.outputs\.sha \}\}/);
  assert.match(deploy, /git rev-parse HEAD\)" = "\$\{RELEASE_SHA\}"/);
  assert.match(deploy, /FOREMENTION_RELEASE_SHA: \$\{\{ needs\.gate\.outputs\.sha \}\}/);
  const recheck = deploy.indexOf("Re-check CI gate immediately before deploy");
  const deployStep = deploy.indexOf("- name: Deploy\n");
  const verify = deploy.indexOf("Verify exact Cloudflare production release");
  assert.ok(deploy.indexOf("- name: Build") < recheck && recheck < deployStep && deployStep < verify);
  assert.match(block(deploy, "Re-check CI gate", "- name: Deploy\n"), /require-ci-success\.mjs/);
  assert.doesNotMatch(deploy, /: write/);
  const acceptance = block(wf, "  trusted-release-acceptance:");
  assert.match(acceptance, /permissions:\n\s+actions: write\n\s+steps:/, "only the dispatch job may write, and only actions");
  for (const uses of wf.match(/uses: \S+/g) || []) assert.match(uses, /@[0-9a-f]{40}$/, `${uses} must be pinned to a full commit SHA`);
});

test("FM-06 CI no longer waits on production; exact-release acceptance is dispatched after deploy", async () => {
  const [ci, deploy, browser, canary, prepare] = await Promise.all([
    text(".github/workflows/ci.yml"),
    text(".github/workflows/production-deploy.yml"),
    text(".github/workflows/browser-acceptance.yml"),
    text(".github/workflows/first-evidence-canary.yml"),
    text("scripts/prepare-worker-config.mjs"),
  ]);
  for (const script of ["production-auth-smoke.mjs", "production-inngest-sync.mjs", "production-inngest-smoke.mjs"]) {
    assert.doesNotMatch(ci, new RegExp(script.replace(".", "\\.")), `${script} must not run inside CI`);
    assert.match(deploy, new RegExp(script.replace(".", "\\.")));
  }
  assert.doesNotMatch(browser, /^\s*push:/m);
  assert.doesNotMatch(canary, /^\s*push:/m);
  assert.match(deploy, /gh workflow run browser-acceptance\.yml --ref main/);
  assert.match(deploy, /gh workflow run first-evidence-canary\.yml --ref main/);
  // The CI-gated SHA wins over GITHUB_SHA for the served buildCommit.
  assert.ok(prepare.indexOf("FOREMENTION_RELEASE_SHA") < prepare.indexOf("process.env.GITHUB_SHA"));
});

// ------------------------------------------------- FM-07 production-only migrations
// sha256 of supabase_migrations.schema_migrations.statements[0] read from
// production (read-only Management API query, 2026-10-19).
const PRODUCTION_ONLY = {
  "20260814002421_placement_events_org_fk_index_20260814.sql": "d887d39cbebc281acdf1da499aa79c763fba3fda6ab8912cb1819fc4e2de7f19",
  "20260915185110_qualified_paid_pilot_evidence_view.sql": "6369f5ba87437e9945d2461117ea35f2a85e59b75875105594f8a3a27cc4dfba",
  "20260915185158_customer_value_validation_evidence_compat.sql": "44a1573df9b4878472be6e0cc1aadb52a94b525f52428669777a49ce8d076d85",
};

test("FM-07 the three production-only migrations are committed verbatim under their production versions", async () => {
  const files = await readdir(new URL("supabase/migrations/", root));
  for (const [file, digest] of Object.entries(PRODUCTION_ONLY)) {
    assert.ok(files.includes(file), `missing ${file}`);
    const sql = await text(`supabase/migrations/${file}`);
    assert.ok(sql.endsWith("\n") && !sql.endsWith("\n\n"), "exactly one terminal LF is appended");
    assert.equal(createHash("sha256").update(sql.slice(0, -1)).digest("hex"), digest, `${file} differs from production`);
  }
});

// ------------------------------------------------------------- FM-08 / #351
const MATERIAL_KEYS = ["locale", "market", "buyerStage", "promptVersion", "parserVersion",
  "retrievalVersion", "policyVersion", "schemaVersion", "evaluationVersion"];

test("#351 follow-up trigger requires the full material measurement context, matching the app comparator", async () => {
  const [migration, comparator, verify, ci] = await Promise.all([
    text("supabase/migrations/20261019093510_fm08_351_follow_up_measurement_context.sql"),
    text("lib/intelligence-comparability.ts"),
    text("scripts/verify-351-follow-up-measurement-context.sql"),
    text(".github/workflows/ci.yml"),
  ]);
  assert.match(migration, /create or replace function public\.validate_resolution_follow_up\(\) returns trigger/);
  assert.match(migration, /security invoker set search_path = ''/);
  for (const key of MATERIAL_KEYS) {
    assert.match(comparator, new RegExp(`"${key}"`), `app comparator lost ${key}`);
    assert.match(migration, new RegExp(`'${key}'`), `DB trigger ignores ${key}`);
    assert.ok((migration.match(new RegExp(`measurement_context_json ->> '${key}'`, "g")) || []).length >= 4, `${key} must be compared both ways`);
  }
  assert.match(migration, /jsonb_typeof\(answer\.measurement_context_json -> material\.key\) is distinct from 'string'/);
  assert.match(migration, /new\.status := 'incomparable'/);
  assert.match(migration, /does not establish that the applied resolution caused the change/);
  assert.doesNotMatch(migration, /\bupdate public\.resolution_follow_ups\b/i, "historic follow-ups are not rewritten");
  for (const label of ["retrievalVersion changed", "parserVersion changed", "evaluationVersion changed",
    "policyVersion changed", "legacy answer missing retrievalVersion", "legacy answer with no measurement context", "identical context"]) {
    assert.ok(verify.includes(label), `verify script lacks case: ${label}`);
  }
  assert.match(verify, /^rollback;$/m);
  assert.match(ci, /psql -v ON_ERROR_STOP=1 -U postgres -d postgres < scripts\/verify-351-follow-up-measurement-context\.sql/);
});

// ------------------------------------------------------- FM-10 observability
test("FM-10 Workers Logs are enabled in both the root and generated Worker config", async () => {
  const [jsonc, prepare] = await Promise.all([text("wrangler.jsonc"), text("scripts/prepare-worker-config.mjs")]);
  const config = JSON.parse(jsonc.split("\n").filter((line) => !/^\s*\/\//.test(line)).join("\n"));
  assert.equal(config.observability?.enabled, true);
  assert.equal(config.observability?.logs?.enabled, true);
  assert.equal(config.observability?.logs?.invocation_logs, true);
  assert.equal(config.observability?.head_sampling_rate, 1);
  assert.match(prepare, /config\.observability = \{\s*enabled: true,\s*head_sampling_rate: 1,\s*logs: \{ enabled: true, invocation_logs: true \},\s*\};/);
});

test("FM-10 browser Sentry DSN is injected from a repository variable and allowed by CSP", async () => {
  const [deploy, client, worker] = await Promise.all([
    text(".github/workflows/production-deploy.yml"),
    text("components/sentry-client.tsx"),
    text("worker/index.ts"),
  ]);
  assert.match(block(deploy, "- name: Build", "- name: Re-check"), /NEXT_PUBLIC_SENTRY_DSN: \$\{\{ vars\.NEXT_PUBLIC_SENTRY_DSN \}\}/);
  assert.match(client, /const dsn = process\.env\.NEXT_PUBLIC_SENTRY_DSN;\s*\n\s*if \(!dsn\) return;/);
  assert.match(client, /sendDefaultPii: false/);
  for (const host of ["*.ingest.sentry.io", "*.ingest.us.sentry.io", "*.ingest.de.sentry.io"]) {
    assert.ok(worker.includes(`https://${host}`), `CSP connect-src lacks ${host}`);
  }
});

// ------------------------------------------------------------ performance
test("hashed build assets get long-lived immutable caching despite a custom public/_headers", async () => {
  const headers = await text("public/_headers");
  assert.match(headers, /^\/assets\/\*\n  Cache-Control: public, max-age=31536000, immutable$/m);
  // vinext skips its own immutable rule whenever public/_headers exists.
  assert.doesNotMatch(headers, /^\/\*\n\s+Cache-Control/m, "no catch-all cache rule may override hashed assets");
});

test("canonical fonts are requested from <head> with display=swap and preconnects", async () => {
  const [layout, font, globals] = await Promise.all([text("app/layout.tsx"), text("lib/font-stylesheet.ts"), text("app/globals.css")]);
  const head = block(layout, "<head>", "</head>");
  assert.ok(head.indexOf('rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"') < head.indexOf("CANONICAL_FONT_STYLESHEET_URL"));
  assert.match(font, /&display=swap"/);
  assert.doesNotMatch(globals, /@import\s+url\(/, "no render-blocking CSS @import chain");
});

// ---------------------------------------------------- PostHog cookie consent
test("analytics consent parsing is fail-closed and keeps earlier choices", () => {
  const store = (values) => ({ getItem: (key) => (key in values ? values[key] : null) });
  assert.equal(parseAnalyticsConsent(store({ [ANALYTICS_CONSENT_KEY]: "accepted" })), "accepted");
  assert.equal(parseAnalyticsConsent(store({ [ANALYTICS_CONSENT_KEY]: "declined" })), "declined");
  assert.equal(parseAnalyticsConsent(store({ [LEGACY_ANALYTICS_CONSENT_KEY]: "accepted" })), "accepted");
  assert.equal(parseAnalyticsConsent(store({ [ANALYTICS_CONSENT_KEY]: "yes" })), null);
  assert.equal(parseAnalyticsConsent(store({})), null);
  assert.equal(parseAnalyticsConsent(null), null);
  assert.equal(parseAnalyticsConsent({ getItem() { throw new Error("blocked"); } }), null);
  assert.equal(ANALYTICS_CONSENT_KEY, "foremention:experience-analytics-consent");
});

test("hasAnalyticsConsent is false on the server and until the browser stores accepted", () => {
  assert.equal(hasAnalyticsConsent(), false);
  const previous = globalThis.window;
  try {
    const values = {};
    globalThis.window = { localStorage: { getItem: (key) => values[key] ?? null } };
    assert.equal(hasAnalyticsConsent(), false);
    values[ANALYTICS_CONSENT_KEY] = "declined";
    assert.equal(hasAnalyticsConsent(), false);
    values[ANALYTICS_CONSENT_KEY] = "accepted";
    assert.equal(hasAnalyticsConsent(), true);
  } finally {
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous;
  }
});

test("PostHog never initialises before consent and clears its storage on decline", async () => {
  const [analytics, component, settings] = await Promise.all([
    text("lib/product-analytics.ts"),
    text("components/posthog-analytics.tsx"),
    text("components/contentsquare-analytics.tsx"),
  ]);
  const init = block(analytics, "export function initializeProductAnalytics()", "posthog.init(");
  assert.match(init, /if \(!hasAnalyticsConsent\(\)\) return false;/);
  assert.equal((analytics.match(/posthog\.init\(/g) || []).length, 1);
  assert.match(component, /if \(consent !== "accepted"\) return;\s*\n\s*initialized\.current = initializeProductAnalytics\(\);/);
  assert.match(component, /if \(demo \|\| consent !== "accepted"\) return;/);
  assert.match(analytics, /export function clearProductAnalyticsStorage\(\)/);
  assert.match(settings, /if \(next === "declined"\) clearProductAnalyticsStorage\(\);/);
});

// ------------------------------------------------------------ FM-02 backups
test("FM-02 nightly backup is encrypted, read-only, short-retention and never uploads plaintext", async () => {
  const [wf, backup] = await Promise.all([
    text(".github/workflows/nightly-db-backup.yml"),
    text("scripts/backup/create-encrypted-backup.sh"),
  ]);
  assert.match(wf, /schedule:\s*\n\s*- cron: '23 19 \* \* \*'/);
  assert.match(wf, /SUPABASE_DB_URL: \$\{\{ secrets\.SUPABASE_DB_URL \}\}/);
  assert.match(wf, /BACKUP_AGE_RECIPIENT: \$\{\{ secrets\.BACKUP_AGE_RECIPIENT \}\}/);
  assert.match(wf, /postgresql-client-17 age/);
  assert.match(wf, /retention-days: 7/);
  const upload = block(wf, "- name: Upload encrypted backup");
  assert.match(upload, /path: \|\s*\n\s*backup-out\/\*\.age\s*\n\s*backup-out\/SHA256SUMS/);
  assert.doesNotMatch(wf, /permissions:\s*\n\s*contents: write/);
  assert.match(backup, /default_transaction_read_only=on/);
  assert.match(backup, /\| age "\$\{recipients\[@\]\}" -o "\$\{base\}\.dump\.age"/);
  assert.match(backup, /\^age1\[0-9a-z\]\{58\}\$/);
  assert.doesNotMatch(backup, /pg_restore|psql[^\n]*-c "(?:insert|update|delete|drop|alter|create)/i);
});

test("FM-02 restore drill refuses the production project before touching anything", () => {
  const result = spawnSync("bash", ["scripts/backup/restore-test.sh", "/nonexistent/foremention-db-x.dump.age"], {
    cwd: new URL(".", root).pathname,
    env: { ...process.env, AGE_IDENTITY_FILE: "/nonexistent", RESTORE_DB_URL: "postgres://postgres.vuujwdxivjsdikdstwib:x@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres" },
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Refusing: RESTORE_DB_URL points at the production project/);
});

// ------------------------------------------------------------ FM-09 Brave key
test("FM-09 Brave key is read from process.env, so a Worker secret and a plain var behave the same", () => {
  const previous = process.env.BRAVE_SEARCH_API_KEY;
  try {
    process.env.BRAVE_SEARCH_API_KEY = "  test-brave-key  ";
    assert.equal(braveSearchApiKey(), "test-brave-key");
    process.env.BRAVE_SEARCH_API_KEY = "   ";
    assert.equal(braveSearchApiKey(), null);
    delete process.env.BRAVE_SEARCH_API_KEY;
    assert.equal(braveSearchApiKey(), null);
  } finally {
    if (previous === undefined) delete process.env.BRAVE_SEARCH_API_KEY; else process.env.BRAVE_SEARCH_API_KEY = previous;
  }
});
