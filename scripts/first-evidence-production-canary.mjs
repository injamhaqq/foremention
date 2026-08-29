#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const toolRequire = createRequire(new URL("../.ci-tools/package.json", import.meta.url));
const { chromium } = toolRequire("playwright");

const baseUrl = new URL((process.env.FOREMENTION_BROWSER_BASE_URL || process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, ""));
const expectedBuildCommit = (process.env.FOREMENTION_EXPECTED_BUILD_COMMIT || "").trim().toLowerCase();
const acceptanceEmail = (process.env.FOREMENTION_ACCEPTANCE_EMAIL || "").trim();
const acceptancePassword = process.env.FOREMENTION_ACCEPTANCE_PASSWORD || "";
const enabled = (process.env.FOREMENTION_ACCEPTANCE_CANARY_ENABLED || "").trim().toLowerCase() === "true";
const spendApproved = (process.env.FOREMENTION_ACCEPTANCE_PROVIDER_SPEND_APPROVED || "").trim().toLowerCase() === "true";
const canaryRequired = (process.env.FOREMENTION_ACCEPTANCE_CANARY_REQUIRED || "").trim().toLowerCase() === "true";
const provider = (process.env.FOREMENTION_ACCEPTANCE_PROVIDER || "").trim().toLowerCase();
const maxCostUsd = Number(process.env.FOREMENTION_ACCEPTANCE_MAX_COST_USD || "");
const timeoutMs = Math.max(60_000, Math.min(Number(process.env.FOREMENTION_ACCEPTANCE_CANARY_TIMEOUT_MS || 600_000), 900_000));
const outputRoot = resolve(process.env.FOREMENTION_BROWSER_OUTPUT || "browser-acceptance");
const outputPath = resolve(outputRoot, "first-evidence-production-canary.json");
const liveProviders = new Set(["openai", "gemini", "anthropic", "perplexity", "groq", "cloudflare", "openrouter", "zenmux", "omnirouters"]);
const expectedAcceptanceFixtureFingerprint = "10387d827457605531a1a2c469385f2adbd158206a50f7dd5d566bdc65dcdedd";

const summary = {
  checkedAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  expectedBuildCommit: expectedBuildCommit || null,
  enabled,
  spendApproved,
  required: canaryRequired,
  provider: provider || null,
  maxCostUsd: Number.isFinite(maxCostUsd) && maxCostUsd > 0 ? maxCostUsd : null,
  skipped: false,
  skipReason: null,
  stages: [],
  evidence: {
    approvedQuestionCount: null,
    acceptanceFixtureFingerprint: null,
    runStatus: null,
    answerCount: null,
    citationCount: null,
    providerSearchUsed: null,
    providerSearchResultCount: null,
    duplicateRequestConfirmed: false,
    runReviewPublished: false,
    evidenceInspectionOpened: false,
    sourceReviewFormVisible: false,
    opportunityMutationAttempted: false,
  },
  failure: null,
};

function stage(name, detail = {}) {
  summary.stages.push({ name, at: new Date().toISOString(), ...detail });
  console.log(`[first-evidence-canary] ${name}`);
}

async function persist() {
  await mkdir(outputRoot, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function fail(message) {
  throw new Error(message);
}

async function sameOriginFetch(page, path, options = {}) {
  return page.evaluate(async ({ path, options }) => {
    const response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
    });
    const text = await response.text();
    let body = null;
    if (text.trim()) {
      try { body = JSON.parse(text); }
      catch { body = { parseError: true }; }
    }
    return { ok: response.ok, status: response.status, body };
  }, { path, options });
}

async function ensureExactHealth(page) {
  if (!/^[0-9a-f]{40}$/.test(expectedBuildCommit)) fail("FOREMENTION_EXPECTED_BUILD_COMMIT must be the exact 40-character production SHA.");
  const result = await sameOriginFetch(page, `/api/health?first_evidence_canary=${Date.now()}`);
  const observed = typeof result.body?.buildCommit === "string" ? result.body.buildCommit.trim().toLowerCase() : "";
  if (!result.ok) fail(`Production health failed with status ${result.status}.`);
  if (observed !== expectedBuildCommit) fail(`Production SHA mismatch: expected ${expectedBuildCommit}, observed ${observed || "missing"}.`);
  stage("exact-production-sha-verified");
}

const freshWebEvidenceQuestion = "Use web search now. According to the official OpenAI website, what is the title and publication date of the most recently published post on openai.com/news at the time you answer? Cite the exact openai.com source URL you used. If you cannot verify it with current web evidence, say so rather than answering from memory.";

const syntheticOnboarding = {
  companyName: "Foremention Acceptance Fixture",
  domain: "https://example.com",
  market: "Global",
  category: "Synthetic recommendation evidence acceptance testing",
  categoryDescription: "Synthetic production acceptance workspace used only to verify Foremention evidence flow boundaries.",
  competitors: ["Synthetic Alpha", "Synthetic Beta"],
  goal: "Verify the authenticated first-evidence production path",
  constraint: "Synthetic production acceptance data only. Do not infer customer outcomes or causal lift.",
  prompts: [
    freshWebEvidenceQuestion,
    "What should a synthetic buyer verify before trusting an AI recommendation monitoring platform?",
    "Which evidence should a synthetic buyer inspect when an AI system cites a source?",
    "How should a synthetic buyer compare repeated AI recommendation observations safely?",
    "What makes a recommendation evidence platform trustworthy for a synthetic evaluation?",
  ],
  locale: "en-US",
};

async function ensureCanaryWorkspace(page) {
  let prompts = await sameOriginFetch(page, "/api/prompts");
  if (!prompts.ok) fail(`Buyer-question read failed with status ${prompts.status}.`);
  let approved = Array.isArray(prompts.body?.data) ? prompts.body.data.filter((item) => item?.approved) : [];

  if (approved.length === 0) {
    stage("bootstrap-synthetic-onboarding");
    const onboarding = await sameOriginFetch(page, "/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(syntheticOnboarding),
    });
    if (!onboarding.ok) fail(`Synthetic onboarding failed with status ${onboarding.status}: ${onboarding.body?.error || "unknown error"}`);
    prompts = await sameOriginFetch(page, "/api/prompts");
    if (!prompts.ok) fail(`Buyer-question re-read failed with status ${prompts.status}.`);
    approved = Array.isArray(prompts.body?.data) ? prompts.body.data.filter((item) => item?.approved) : [];
  }

  summary.evidence.approvedQuestionCount = approved.length;
  if (approved.length !== 5) fail(`The dedicated canary workspace must contain exactly five approved baseline questions; observed ${approved.length}.`);
  stage("five-question-baseline-verified", { count: approved.length });

  const workspace = await sameOriginFetch(page, "/api/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(syntheticOnboarding),
  });
  if (!workspace.ok || workspace.body?.existing !== true) {
    fail(`Dedicated canary workspace identity lookup failed with status ${workspace.status}; refusing to mutate or spend.`);
  }
  const organizationId = typeof workspace.body?.organizationId === "string" ? workspace.body.organizationId.trim().toLowerCase() : "";
  if (!/^[0-9a-f-]{36}$/i.test(organizationId)) fail("Dedicated canary workspace identity lookup returned an invalid organization identifier; refusing to mutate or spend.");

  const canarySlot = approved[0];
  if (!canarySlot?.id || !/^[0-9a-f-]{36}$/i.test(canarySlot.id)) fail("The historical canary buyer question is missing a valid ID.");
  const observedFingerprint = createHash("sha256")
    .update(`${organizationId}:${canarySlot.id}`)
    .digest("hex");
  if (!/^[0-9a-f]{64}$/.test(observedFingerprint)) fail("Acceptance fixture fingerprint derivation failed; refusing to mutate or spend.");
  summary.evidence.acceptanceFixtureFingerprint = observedFingerprint;
  stage("acceptance-fixture-fingerprint-observed");

  if (!expectedAcceptanceFixtureFingerprint) {
    fail("Acceptance fixture fingerprint is not pinned; refusing to mutate or spend");
  }
  if (observedFingerprint !== expectedAcceptanceFixtureFingerprint) {
    fail("Acceptance fixture fingerprint did not match the pinned synthetic fixture; refusing to mutate or spend.");
  }
  stage("acceptance-fixture-fingerprint-verified");

  let freshQuestion = canarySlot.text === freshWebEvidenceQuestion ? canarySlot : null;
  if (!freshQuestion) {
    const update = await sameOriginFetch(page, "/api/prompts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: canarySlot.id, text: freshWebEvidenceQuestion }),
    });
    if (!update.ok) fail(`Fresh web-evidence buyer-question update failed with status ${update.status}: ${update.body?.error || "unknown error"}`);
    stage("fresh-web-evidence-question-updated");

    prompts = await sameOriginFetch(page, "/api/prompts");
    if (!prompts.ok) fail(`Buyer-question verification read failed with status ${prompts.status}.`);
    approved = Array.isArray(prompts.body?.data) ? prompts.body.data.filter((item) => item?.approved) : [];
    if (approved.length !== 5) fail(`Fresh-question reconciliation changed the five-question canary baseline; observed ${approved.length}.`);
    freshQuestion = approved.find((item) => item?.id === canarySlot.id && item?.text === freshWebEvidenceQuestion);
  }

  if (!freshQuestion?.id || !/^[0-9a-f-]{36}$/i.test(freshQuestion.id)) fail("The fresh web-evidence canary buyer question is missing a valid ID.");
  stage("fresh-web-evidence-question-verified");
  return freshQuestion.id;
}

async function queueOneQuestionRun(page, promptId) {
  const idempotencyKey = `acceptance:${expectedBuildCommit}`;
  const request = {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify({ promptIds: [promptId], providers: [provider] }),
  };
  const first = await sameOriginFetch(page, "/api/runs", request);
  if (!first.ok || !first.body?.id) fail(`First-evidence collection was not queued (status ${first.status}): ${first.body?.error || "unknown error"}`);
  const estimated = Number(first.body?.estimatedMaximumCostUsd);
  if (Number.isFinite(estimated) && estimated > maxCostUsd) fail(`Server estimated maximum cost $${estimated} above approved canary ceiling $${maxCostUsd}. Disable the canary and lower the production run ceiling before another release.`);

  const duplicate = await sameOriginFetch(page, "/api/runs", request);
  if (!duplicate.ok || duplicate.body?.id !== first.body.id || duplicate.body?.duplicate !== true) {
    fail("Release-scoped idempotency did not return the same first-evidence run on a repeated request.");
  }
  summary.evidence.duplicateRequestConfirmed = true;
  stage("one-question-run-queued-idempotently");
  return first.body.id;
}

async function waitForRun(page, runId) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await sameOriginFetch(page, "/api/runs");
    if (!result.ok) fail(`Run polling failed with status ${result.status}.`);
    const run = Array.isArray(result.body?.data) ? result.body.data.find((item) => item?.id === runId) : null;
    if (run) {
      summary.evidence.runStatus = run.status || null;
      summary.evidence.answerCount = Number.isFinite(Number(run.answers)) ? Number(run.answers) : null;
      summary.evidence.citationCount = Number.isFinite(Number(run.citations)) ? Number(run.citations) : null;
      if (["review", "complete", "partial", "failed", "cancelled"].includes(run.status)) return run;
    }
    await page.waitForTimeout(3_000);
  }
  fail(`First-evidence run did not reach a reviewable terminal state within ${timeoutMs}ms.`);
}

async function verifyRunEvidenceAndPublish(page, run) {
  if (["failed", "cancelled"].includes(run.status)) fail(`First-evidence collection terminated with status ${run.status}.`);
  if (!Number.isFinite(Number(run.answers)) || Number(run.answers) < 1) fail("The real provider run persisted no answer observations.");

  await page.goto(new URL(`/app/runs/${run.id}?first_evidence=1`, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
  if (await page.getByText("Your first real evidence", { exact: false }).count() === 0) fail("The first-evidence guidance was not rendered on the exact run.");
  if (await page.getByText("Recorded model", { exact: true }).count() > 0) fail("The persisted provider answer is missing its exact model identifier.");
  if (await page.getByText(provider, { exact: false }).count() === 0) fail("The run detail did not expose the configured canary provider identifier.");

  if (provider === "groq") {
    const providerDiagnostics = page.locator("[data-provider-search-used][data-provider-search-result-count]").first();
    if (await providerDiagnostics.count() === 0) fail("The Groq answer is missing sanitized provider-search diagnostics.");
    const searchUsedValue = await providerDiagnostics.getAttribute("data-provider-search-used");
    const searchResultCountValue = await providerDiagnostics.getAttribute("data-provider-search-result-count");
    if (searchUsedValue !== "true" && searchUsedValue !== "false") fail("The Groq answer did not record whether web search executed on this release.");
    const parsedSearchResultCount = Number(searchResultCountValue);
    if (!Number.isInteger(parsedSearchResultCount) || parsedSearchResultCount < 0) fail("The Groq answer did not record a valid structured search-result count.");
    summary.evidence.providerSearchUsed = searchUsedValue === "true";
    summary.evidence.providerSearchResultCount = parsedSearchResultCount;
    stage("provider-search-diagnostics-recorded", { searchUsed: summary.evidence.providerSearchUsed, searchResultCount: parsedSearchResultCount });
  }

  stage("persisted-provider-answer-verified", { answers: Number(run.answers), citations: Number(run.citations || 0) });

  if (run.status === "review") {
    const review = await sameOriginFetch(page, `/api/runs/${run.id}/review`, { method: "POST" });
    if (!review.ok) fail(`Run review publication failed with status ${review.status}: ${review.body?.error || "unknown error"}`);
    summary.evidence.runReviewPublished = true;
    stage("human-review-publication-gate-exercised");
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: "domcontentloaded" });
  } else {
    summary.evidence.runReviewPublished = true;
    stage("run-was-already-published", { status: run.status });
  }

  if (Number(run.citations || 0) < 1) {
    stage("contained-evidence-not-required-no-provider-citations");
    return;
  }

  const evidenceDetails = page.locator("details.canonical-contained-evidence").first();
  if (await evidenceDetails.count() === 0) fail("The reviewed Recommendation Record has provider citations but no contained mapped-source evidence inspection.");
  const evidenceSummary = evidenceDetails.locator("summary").first();
  if ((await evidenceSummary.count()) === 0 || !/Evidence inspection/i.test(await evidenceSummary.innerText())) {
    fail("The contained Recommendation Record evidence inspector did not expose its inspection boundary.");
  }
  await evidenceSummary.click();
  summary.evidence.evidenceInspectionOpened = true;
  stage("contained-evidence-inspection-opened-from-exact-run-citation");

  const reviewForm = evidenceDetails.locator("form.source-review-form").first();
  if ((await reviewForm.count()) === 0 || !await reviewForm.isVisible().catch(() => false)) {
    fail("Contained Recommendation Record evidence did not render the analyst review boundary.");
  }
  summary.evidence.sourceReviewFormVisible = true;
  stage("contained-source-review-boundary-visible");
  stage("opportunity-mutation-withheld-without-human-source-facts");
}

async function verifySignOutBoundary(page) {
  const signOut = page.getByRole("button", { name: "Sign out", exact: true });
  if (await signOut.count() === 0 || !await signOut.first().isVisible().catch(() => false)) fail("The authenticated acceptance workspace did not expose the ordinary Sign out control.");
  await signOut.first().click();
  await page.waitForURL((url) => url.pathname === "/login", { timeout: 20_000 });
  const signedOut = new URL(page.url());
  if (signedOut.pathname !== "/login") fail("Ordinary sign-out did not clear the acceptance workspace session.");
  stage("authenticated-session-cleared-after-sign-out");

  await page.goto(new URL("/app", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
  const postLogout = new URL(page.url());
  if (postLogout.pathname !== "/login" || postLogout.searchParams.get("next") !== "/app") fail("Protected workspace access remained available after acceptance sign-out.");
  stage("post-logout-workspace-boundary-verified");
}

async function run() {
  await persist();
  if (!enabled) {
    if (canaryRequired) fail("Exact-release authenticated first-evidence canary is required but is not explicitly enabled.");
    summary.skipped = true;
    summary.skipReason = "FOREMENTION_ACCEPTANCE_CANARY_ENABLED is not explicitly true.";
    stage("skipped-canary-not-enabled");
    await persist();
    return;
  }
  if (!spendApproved) {
    if (canaryRequired) fail("Exact-release authenticated first-evidence canary requires explicit provider-spend approval.");
    summary.skipped = true;
    summary.skipReason = "Real-provider canary spend has not been explicitly approved.";
    stage("skipped-provider-spend-not-approved");
    await persist();
    return;
  }
  if (!acceptanceEmail || !acceptancePassword) fail("Dedicated production acceptance credentials are required when the first-evidence canary is enabled.");
  if (!liveProviders.has(provider)) fail("FOREMENTION_ACCEPTANCE_PROVIDER must name exactly one supported live provider; mock is never allowed in the production canary.");
  if (!Number.isFinite(maxCostUsd) || maxCostUsd <= 0 || maxCostUsd > 1) fail("FOREMENTION_ACCEPTANCE_MAX_COST_USD must be an explicit positive ceiling no greater than $1.00.");
  if (baseUrl.protocol !== "https:" || baseUrl.hostname !== "foremention.com") fail("The authenticated production canary is restricted to https://foremention.com.");

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const page = await context.newPage();
    await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.getByLabel("Email").fill(acceptanceEmail);
    await page.locator('input[name="password"]').fill(acceptancePassword);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL((url) => url.pathname.startsWith("/app") || url.pathname.startsWith("/onboarding"), { timeout: 20_000 });
    stage("authenticated-session-established");

    await ensureExactHealth(page);
    const promptId = await ensureCanaryWorkspace(page);
    const runId = await queueOneQuestionRun(page, promptId);
    const runState = await waitForRun(page, runId);
    await verifyRunEvidenceAndPublish(page, runState);
    await verifySignOutBoundary(page);
    await context.close();
  } finally {
    await browser.close();
  }
}

try {
  await run();
} catch (error) {
  summary.failure = error instanceof Error ? error.message : String(error);
  console.error(`[first-evidence-canary] FAIL: ${summary.failure}`);
  process.exitCode = 1;
} finally {
  await persist();
}
