// Offline evidence-trust evaluation harness (fix track "evidence", 2026-10-19).
//
// Runs the REAL grounded Cloudflare path (Brave retrieval parse -> relevance
// gate -> sanitisation -> model -> labelling -> claim check) over synthetic
// fixtures. fetch and the Workers AI binding are fakes: any request to a host
// other than the fixture Brave endpoint fails the case, so the suite can never
// reach the network or spend money. Used by `pnpm eval:evidence` and by
// tests/evidence-trust-offline-eval.test.mjs.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = new URL("../", import.meta.url);

export async function loadEvidenceTrustDataset(path = new URL("evals/evidence-trust/fixtures.json", root)) {
  return JSON.parse(await readFile(path, "utf8"));
}

/** Import lib/providers/cloudflare.ts with its "@/lib/..." aliases resolved to file URLs. */
export async function loadGroundedAdapter() {
  const scratch = await mkdtemp(join(tmpdir(), "fm-evidence-trust-"));
  const source = await readFile(new URL("lib/providers/cloudflare.ts", root), "utf8");
  const resolved = source.replace(/from "@\/lib\/([^"]+)"/g, (_match, target) =>
    `from "${new URL(`lib/${target}${/\.(m?js|ts)$/.test(target) ? "" : ".ts"}`, root).href}"`);
  const file = join(scratch, "cloudflare.ts");
  await writeFile(file, resolved);
  return import(pathToFileURL(file).href);
}

async function runCase(adapter, testCase) {
  const previousKey = process.env.BRAVE_SEARCH_API_KEY;
  const originalFetch = globalThis.fetch;
  const network = [];
  process.env.BRAVE_SEARCH_API_KEY = "offline-fixture-key";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    network.push(url.hostname);
    if (url.hostname !== "api.search.brave.com") throw new Error(`Offline evaluation blocked a network request to ${url.hostname}.`);
    return new Response(JSON.stringify(testCase.search), { status: 200, headers: { "content-type": "application/json" } });
  };
  const modelCalls = [];
  const binding = { async run(model, body) { modelCalls.push({ model, body }); return testCase.model; } };
  try {
    const value = await adapter.runGroundedCloudflareWithBinding({ binding, model: "@cf/fixture/offline", prompt: testCase.question, maxOutputTokens: 300 });
    return { ok: true, value, modelCalls, network };
  } catch (error) {
    return { ok: false, error, modelCalls, network };
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
    else process.env.BRAVE_SEARCH_API_KEY = previousKey;
  }
}

function check(failures, condition, message) {
  if (!condition) failures.push(message);
}

/**
 * @param {{ cases: any[] }} dataset
 * @param {{ partitionOfficialSourceReview: Function }} review  shared review policy
 */
export async function runEvidenceTrustEvaluation(dataset, review) {
  const adapter = await loadGroundedAdapter();
  const results = [];
  for (const testCase of dataset.cases) {
    const outcome = await runCase(adapter, testCase);
    const failures = [];
    const expect = testCase.expect || {};
    check(failures, outcome.network.every((host) => host === "api.search.brave.com"), "a non-fixture network host was requested");
    if (!outcome.ok) {
      failures.push(`grounded path failed: ${outcome.error?.message || outcome.error}`);
      results.push({ id: testCase.id, category: testCase.category, passed: false, failures });
      continue;
    }
    const value = outcome.value;
    const modelInput = outcome.modelCalls.map((call) => call.body.messages.map((message) => message.content).join("\n")).join("\n");
    const support = value.evidenceSupport;
    const flagCount = value.injectionFlagCount;
    const flaggedRules = new Set(value.retrievedSources.flatMap((entry) => entry.injectionFlags));
    if (expect.referenceOrigin) check(failures, value.citations.every((citation) => citation.origin === expect.referenceOrigin && citation.retrievedBy === "foremention"), `citations are not all labelled ${expect.referenceOrigin}`);
    if (expect.countsAsModelCitation === false) check(failures, value.citations.every((citation) => citation.countsAsModelCitation === false), "a retrieved result is counted as a model citation");
    if (expect.savedSnippets !== undefined) check(failures, value.retrievedSources.length === expect.savedSnippets && value.retrievedSources.every((entry) => typeof entry.snippet === "string" && entry.snippet.length > 0), `expected ${expect.savedSnippets} saved snippets`);
    if (expect.supportStatus) check(failures, support.status === expect.supportStatus, `support status ${support.status} != ${expect.supportStatus}`);
    if (expect.unsupportedAtLeast !== undefined) check(failures, support.unsupportedCount >= expect.unsupportedAtLeast, `unsupported claims ${support.unsupportedCount} < ${expect.unsupportedAtLeast}`);
    for (const reason of expect.unsupportedReasons || []) check(failures, support.claims.some((claim) => !claim.supported && claim.reason === reason), `no unsupported claim with reason ${reason}`);
    if (expect.verificationBlocked !== undefined) check(failures, support.verificationBlocked === expect.verificationBlocked, `verificationBlocked ${support.verificationBlocked} != ${expect.verificationBlocked}`);
    if (expect.reviewWithheld !== undefined) {
      const partition = review.partitionOfficialSourceReview([{ id: testCase.id, prompt_text: testCase.question, answer_text: value.answer, citations_json: value.citations, verification_blocked: support.verificationBlocked }]);
      const withheld = partition.withheld.some((entry) => entry.id === testCase.id);
      check(failures, withheld === expect.reviewWithheld, `bulk review withheld=${withheld}, expected ${expect.reviewWithheld}`);
    }
    if (expect.minInjectionFlags !== undefined) check(failures, flagCount >= expect.minInjectionFlags, `injection flags ${flagCount} < ${expect.minInjectionFlags}`);
    if (expect.maxInjectionFlags !== undefined) check(failures, flagCount <= expect.maxInjectionFlags, `injection flags ${flagCount} > ${expect.maxInjectionFlags} (false positive)`);
    for (const rule of expect.flaggedRules || []) check(failures, flaggedRules.has(rule), `rule ${rule} was not flagged`);
    // Exclusions apply to the retrieved-data section only (the system prompt
    // legitimately names the markers it explains).
    const userInput = outcome.modelCalls.map((call) => call.body.messages.filter((message) => message.role === "user").map((message) => message.content).join("\n")).join("\n");
    const dataSection = userInput.slice(userInput.indexOf("BEGIN RETRIEVED DATA"));
    for (const text of expect.modelInputExcludes || []) check(failures, !dataSection.includes(text), `model input still contains ${JSON.stringify(text)}`);
    for (const text of expect.modelInputIncludes || []) check(failures, modelInput.includes(text), `model input is missing ${JSON.stringify(text)}`);
    if (expect.modelInputEndMarkerCount !== undefined) check(failures, dataSection.split("END RETRIEVED DATA").length - 1 === expect.modelInputEndMarkerCount, "retrieved data spoofed the END RETRIEVED DATA marker");
    results.push({ id: testCase.id, category: testCase.category, passed: failures.length === 0, failures, supportStatus: support.status, injectionFlagCount: flagCount });
  }
  const passed = results.filter((result) => result.passed).length;
  return { version: dataset.version, total: results.length, passed, failed: results.length - passed, results };
}

export function formatEvidenceTrustReport(summary) {
  const lines = [
    `# Evidence-trust offline evaluation (${summary.version})`,
    "",
    `${summary.passed}/${summary.total} cases passed. Offline: fetch and the model binding are fixtures; no network or paid call.`,
    "",
    "| Case | Category | Result | Support status | Injection flags |",
    "| --- | --- | --- | --- | --- |",
    ...summary.results.map((result) => `| ${result.id} | ${result.category} | ${result.passed ? "pass" : `FAIL: ${result.failures.join("; ")}`} | ${result.supportStatus || "-"} | ${result.injectionFlagCount ?? "-"} |`),
    "",
  ];
  return lines.join("\n");
}
