import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workspaceSetupState, workspaceStatusLabel } from "../lib/workspace-setup-status.ts";
import { collectingRunIds, withLiveCollectionCounts } from "../lib/live-collection-counts.ts";
import { sourceMapEmptyState } from "../lib/source-map-empty-state.ts";
import { autoScheduleCadence } from "../lib/product-limits.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// 1) /pricing meta description reflects live self-serve billing.
test("pricing meta description no longer says self-serve billing is being validated", () => {
  const pricing = read("app/pricing/page.tsx");
  const description = pricing.match(/const PRICING_LIVE_DESCRIPTION =\s*"([^"]+)"/)?.[1] || "";
  assert.match(description, /Paddle/);
  assert.match(description, /7-day Core trial with no card/);
  assert.match(description, /7-day money-back guarantee, once per company/);
  assert.doesNotMatch(pricing, /self-serve billing is being validated/i);
  assert.match(pricing, /export function generateMetadata\(\)/);
  assert.match(pricing, /selfServeCheckoutLive\(\) \? PRICING_LIVE_DESCRIPTION : PRICING_FOUNDER_LED_DESCRIPTION/);
});

// 2) Cadence copy matches what the scheduler actually creates.
test("pricing cadence copy matches the automatic schedule each plan receives", () => {
  const future = new Date(Date.now() + 86_400_000).toISOString();
  assert.equal(autoScheduleCadence({ status: "active", package_key: "core", billing_source: "paddle" }), "monthly");
  assert.equal(autoScheduleCadence({ status: "active", package_key: "core", billing_source: "trial", expires_at: future }), "weekly");
  assert.equal(autoScheduleCadence({ status: "active", package_key: "signal", billing_source: "paddle" }), "weekly");
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /"Automatic monthly re-measurement \(weekly during the 7-day trial\)"/);
  assert.match(pricing, /"Automatic weekly re-measurement"/);
  assert.doesNotMatch(pricing, /"Monthly measurement cadence"|"Weekly measurement cadence"/);
});

// 3) Signed-in header on /pricing and /pay.
test("pricing and pay render the signed-in header when a session exists", () => {
  const shell = read("components/public-shell.tsx");
  assert.match(shell, /account \? <SignedInSiteHeader account=\{account\} \/> : <PublicHeader \/>/);
  const header = read("components/signed-in-site-header.tsx");
  assert.match(header, /Open workspace/);
  assert.doesNotMatch(header, /href="\/login"|>Request a pilot/);
  for (const path of ["app/pricing/page.tsx", "app/pay/page.tsx"]) {
    const page = read(path);
    assert.match(page, /getSiteHeaderAccount\(\)/, path);
    assert.doesNotMatch(page, /<PublicShell>/, path);
  }
  const auth = read("lib/auth.ts");
  assert.match(auth, /export async function getSiteHeaderAccount/);
});

test("signed-in pricing CTAs go straight to billing instead of signup", () => {
  const pricing = read("app/pricing/page.tsx");
  assert.match(pricing, /href: account \? signedInHref\(offer\.href\) : offer\.href/);
});

// 4) "Setup required" only when the workspace is confirmed missing.
test("workspace badge never claims setup is required on a failed lookup", () => {
  assert.equal(workspaceSetupState({ summaryProjectId: "p1", summaryFailed: false, knownProjectCount: 1 }), "ready");
  assert.equal(workspaceSetupState({ summaryProjectId: null, summaryFailed: false, knownProjectCount: 0 }), "missing");
  assert.equal(workspaceSetupState({ summaryProjectId: null, summaryFailed: true, knownProjectCount: 1 }), "ready");
  assert.equal(workspaceSetupState({ summaryProjectId: null, summaryFailed: true, knownProjectCount: 0 }), "unavailable");
  assert.equal(workspaceStatusLabel("ready", false), "Customer data");
  assert.equal(workspaceStatusLabel("missing", false), "Setup required");
  assert.equal(workspaceStatusLabel("unavailable", false), "Workspace");
  assert.equal(workspaceStatusLabel("missing", true), "Fictional demo");
});

test("onboarding announces the saved workspace so the shell drops 'Setup required'", () => {
  const wizard = read("components/onboarding-wizard.tsx");
  assert.match(wizard, /window\.dispatchEvent\(new CustomEvent\(WORKSPACE_CREATED_EVENT/);
  const badge = read("components/workspace-status-badge.tsx");
  assert.match(badge, /addEventListener\(WORKSPACE_CREATED_EVENT/);
  const nav = read("components/workspace-navigation.tsx");
  assert.match(nav, /addEventListener\(WORKSPACE_CREATED_EVENT/);
  const layout = read("app/app/layout.tsx");
  assert.match(layout, /failed: true/);
  assert.match(layout, /setupState=\{setupState\}/);
});

// 5) Collecting runs show persisted answers; Source Map explains the review gate.
test("collecting runs show answers already persisted instead of 0", () => {
  const runs = [
    { id: "r1", status: "running", answers: 0, citations: 0 },
    { id: "r2", status: "review", answers: 1, citations: 4 },
    { id: "r3", status: "queued", answers: 0, citations: 0 },
  ];
  assert.deepEqual(collectingRunIds(runs), ["r1", "r3"]);
  const rows = [
    { run_id: "r1", citations_json: [{ url: "https://a.example" }, { url: "" }] },
    { run_id: "r1", citations_json: null },
    { run_id: "r2", citations_json: [{ url: "https://ignored.example" }] },
  ];
  const result = withLiveCollectionCounts(runs, rows);
  assert.deepEqual(result[0], { id: "r1", status: "running", answers: 2, citations: 1 });
  assert.deepEqual(result[1], runs[1]);
  assert.deepEqual(result[2], runs[2]);
  assert.equal(withLiveCollectionCounts(runs, []), runs);
});

test("empty Source Map points at the collection awaiting review, even behind a failed newer run", () => {
  const failed = { id: "new", status: "failed", citations: 0, errorSummary: "interrupted" };
  const awaiting = { id: "old", status: "review", citations: 8 };
  const empty = sourceMapEmptyState({ latest: failed, state: "FAILED_RECOVERABLE", runs: [failed, awaiting] });
  assert.equal(empty.href, "/app/runs/old");
  assert.match(empty.title, /8 returned citations are waiting for your review/);
  assert.match(empty.body, /approve that collection/);
  const onlyFailed = sourceMapEmptyState({ latest: failed, state: "FAILED_RECOVERABLE", runs: [failed] });
  assert.equal(onlyFailed.title, "The latest collection did not produce source evidence.");
  const collecting = sourceMapEmptyState({ latest: { id: "c", status: "running", citations: 0 }, state: "COLLECTING", runs: [awaiting] });
  assert.equal(collecting.title, "Sources are not ready yet.");
  const none = sourceMapEmptyState({ latest: null, state: "READY_TO_COLLECT", runs: [] });
  assert.equal(none.href, "/app/runs");
});

// 6) Prompt Check keeps the prefilled "Track this question" handoff.
test("prompt check result offers the prefilled Track this question link", () => {
  const checker = read("components/prompt-coverage-checker.tsx");
  assert.match(checker, /Track this question over time/);
  assert.match(checker, /foremention:track-question/);
  assert.match(checker, /\/signup\?next=%2Fapp%2Fonboarding%3Ftrack%3D1/);
});
