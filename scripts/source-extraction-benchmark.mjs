import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import path from "node:path";
import process from "node:process";

const inspection = await import("../lib/source-inspection.ts");
const runtimeRequire = createRequire(path.join(process.cwd(), ".source-benchmark-runtime", "package.json"));
const { Readability } = runtimeRequire("@mozilla/readability");
const { JSDOM } = runtimeRequire("jsdom");

const root = process.cwd();
const benchmarkDir = path.join(root, "benchmarks", "source-extraction");
const outputDir = path.join(root, "source-extraction-benchmark-results");
const cases = JSON.parse(await readFile(path.join(benchmarkDir, "cases.json"), "utf8"));

function normalize(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function materializeFixture(html, testCase) {
  if (!testCase.generatedTargetBytes) return html;
  const marker = "<!-- FOREMENTION_BENCHMARK_REPEAT -->";
  if (!html.includes(marker)) throw new Error(`missing deterministic expansion marker for ${testCase.id}`);
  const requiredBytes = Math.max(testCase.generatedTargetBytes, testCase.maxBytes + 1);
  const chunkFor = (index) => `<div>Large boilerplate noise marker ${String(index).padStart(4, "0")} navigation legal cookie newsletter repeated filler text.</div>`;
  let filler = "";
  let index = 0;
  while (Buffer.byteLength(html.replace(marker, filler), "utf8") < requiredBytes) {
    filler += chunkFor(index);
    index += 1;
  }
  return html.replace(marker, filler);
}

function containsPhrase(text, phrase) {
  return normalize(text).toLocaleLowerCase().includes(normalize(phrase).toLocaleLowerCase());
}

function qualityMetrics(text, testCase) {
  const normalized = normalize(text);
  const required = testCase.requiredPhrases || [];
  const forbidden = testCase.forbiddenPhrases || [];
  const requiredMatched = required.filter((phrase) => containsPhrase(normalized, phrase));
  const forbiddenMatched = forbidden.filter((phrase) => containsPhrase(normalized, phrase));
  const relevantPhraseRecall = required.length ? requiredMatched.length / required.length : 1;
  const boilerplateRejection = forbidden.length ? 1 - (forbiddenMatched.length / forbidden.length) : 1;
  const qualityScore = (relevantPhraseRecall * 0.75) + (boilerplateRejection * 0.25);
  return {
    outputChars: normalized.length,
    requiredMatched,
    requiredTotal: required.length,
    relevantPhraseRecall,
    forbiddenMatched,
    forbiddenTotal: forbidden.length,
    boilerplateRejection,
    qualityScore,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function measure(run, repeats = 3) {
  if (global.gc) global.gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const latencies = [];
  let value;
  for (let index = 0; index < repeats; index += 1) {
    const started = performance.now();
    value = await run();
    latencies.push(performance.now() - started);
  }
  if (global.gc) global.gc();
  const heapAfter = process.memoryUsage().heapUsed;
  return {
    value,
    medianLatencyMs: median(latencies),
    minLatencyMs: Math.min(...latencies),
    maxLatencyMs: Math.max(...latencies),
    heapDeltaBytes: heapAfter - heapBefore,
  };
}

function boundedHtml(html, testCase) {
  if (!testCase.allowTruncatedBody) return html;
  return Buffer.from(html, "utf8").subarray(0, testCase.maxBytes).toString("utf8");
}

async function runNative(testCase, html) {
  return inspection.inspectSourceUrl(testCase.url, {
    fetcher: async () => new Response(html, {
      status: testCase.status,
      headers: {
        "content-type": testCase.contentType,
        "content-length": String(Buffer.byteLength(html, "utf8")),
      },
    }),
    resolver: async () => ["93.184.216.34"],
    includePageText: true,
    maxExtractedTextChars: 40_000,
    maxBytes: testCase.maxBytes,
    allowTruncatedBody: testCase.allowTruncatedBody,
    now: () => new Date("2026-08-14T00:00:00.000Z"),
  });
}

async function runReadability(testCase, html) {
  if (testCase.status < 200 || testCase.status >= 300 || !testCase.contentType.startsWith("text/html")) {
    return { applicable: false, reason: "network_or_content_policy_outside_readability", article: null };
  }
  const input = boundedHtml(html, testCase);
  const dom = new JSDOM(input, { url: testCase.url });
  try {
    const article = new Readability(dom.window.document, { maxElemsToParse: 20_000 }).parse();
    return {
      applicable: true,
      reason: article ? null : "readability_returned_null",
      article: article ? {
        title: normalize(article.title),
        excerpt: normalize(article.excerpt),
        textContent: normalize(article.textContent),
        length: article.length,
        byline: normalize(article.byline),
        siteName: normalize(article.siteName),
      } : null,
    };
  } finally {
    dom.window.close();
  }
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}

const results = [];
for (const testCase of cases) {
  const fixtureTemplate = await readFile(path.join(benchmarkDir, testCase.file), "utf8");
  const html = materializeFixture(fixtureTemplate, testCase);
  const nativeMeasured = await measure(() => runNative(testCase, html));
  const native = nativeMeasured.value;
  const nativeQuality = qualityMetrics(native.pageText || "", testCase);

  let readabilityMeasured;
  let readabilityQuality = null;
  if (testCase.status >= 200 && testCase.status < 300 && testCase.contentType.startsWith("text/html")) {
    readabilityMeasured = await measure(() => runReadability(testCase, html));
    readabilityQuality = qualityMetrics(readabilityMeasured.value.article?.textContent || "", testCase);
  } else {
    readabilityMeasured = {
      value: await runReadability(testCase, html),
      medianLatencyMs: null,
      minLatencyMs: null,
      maxLatencyMs: null,
      heapDeltaBytes: null,
    };
  }

  results.push({
    id: testCase.id,
    category: testCase.category,
    inputBytes: Buffer.byteLength(html, "utf8"),
    boundedInputBytes: Buffer.byteLength(boundedHtml(html, testCase), "utf8"),
    inputTruncated: testCase.allowTruncatedBody && Buffer.byteLength(html, "utf8") > testCase.maxBytes,
    native: {
      access: native.access,
      status: native.httpStatus,
      title: native.pageTitle,
      description: native.pageDescription || null,
      titleMatch: testCase.expectedTitle ? normalize(native.pageTitle) === normalize(testCase.expectedTitle) : null,
      descriptionMatch: testCase.expectedDescription ? normalize(native.pageDescription) === normalize(testCase.expectedDescription) : null,
      metrics: nativeQuality,
      medianLatencyMs: rounded(nativeMeasured.medianLatencyMs),
      minLatencyMs: rounded(nativeMeasured.minLatencyMs),
      maxLatencyMs: rounded(nativeMeasured.maxLatencyMs),
      heapDeltaBytes: nativeMeasured.heapDeltaBytes,
    },
    readability: {
      applicable: readabilityMeasured.value.applicable,
      reason: readabilityMeasured.value.reason,
      title: readabilityMeasured.value.article?.title || null,
      excerpt: readabilityMeasured.value.article?.excerpt || null,
      titleMatch: testCase.expectedTitle && readabilityMeasured.value.article
        ? normalize(readabilityMeasured.value.article.title) === normalize(testCase.expectedTitle)
        : null,
      metrics: readabilityQuality,
      medianLatencyMs: readabilityMeasured.medianLatencyMs === null ? null : rounded(readabilityMeasured.medianLatencyMs),
      minLatencyMs: readabilityMeasured.minLatencyMs === null ? null : rounded(readabilityMeasured.minLatencyMs),
      maxLatencyMs: readabilityMeasured.maxLatencyMs === null ? null : rounded(readabilityMeasured.maxLatencyMs),
      heapDeltaBytes: readabilityMeasured.heapDeltaBytes,
    },
  });
}

const contentResults = results.filter((item) => item.readability.applicable);
const articleLikeIds = new Set(["article", "documentation", "navigation-heavy", "sidebar-footer-noise", "structured-article"]);
const articleResults = contentResults.filter((item) => articleLikeIds.has(item.id));

function avg(items, select) {
  const values = items.map(select).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

const nativeAverageQuality = avg(contentResults, (item) => item.native.metrics.qualityScore);
const readabilityAverageQuality = avg(contentResults, (item) => item.readability.metrics?.qualityScore ?? 0);
const nativeArticleQuality = avg(articleResults, (item) => item.native.metrics.qualityScore);
const readabilityArticleQuality = avg(articleResults, (item) => item.readability.metrics?.qualityScore ?? 0);
const readabilityArticleRecall = avg(articleResults, (item) => item.readability.metrics?.relevantPhraseRecall ?? 0);
const materialWins = contentResults
  .filter((item) => (item.readability.metrics?.qualityScore ?? 0) - item.native.metrics.qualityScore >= 0.15)
  .map((item) => item.id);
const materialRegressions = contentResults
  .filter((item) => item.native.metrics.qualityScore - (item.readability.metrics?.qualityScore ?? 0) >= 0.15)
  .map((item) => item.id);
const nullExtractions = contentResults.filter((item) => item.readability.reason === "readability_returned_null").map((item) => item.id);

let qualityDecision = "do-not-adopt";
if ((readabilityArticleQuality - nativeArticleQuality) >= 0.15 && readabilityArticleRecall >= 0.85) {
  qualityDecision = materialRegressions.length
    ? "selective-readability-candidate-with-native-fallback"
    : "readability-default-candidate";
}

const summary = {
  generatedAt: new Date().toISOString(),
  corpusCases: results.length,
  methodology: {
    qualityScore: "0.75 * relevantPhraseRecall + 0.25 * boilerplateRejection",
    relevantPhraseRecall: "required phrases present / required phrases defined",
    boilerplateRejection: "1 - (forbidden boilerplate phrases present / forbidden phrases defined)",
    latency: "median of three end-to-end extraction runs per extractor per fixture",
    memory: "heapUsed after three runs minus heapUsed before; GC requested when available; informational only",
    inputFairness: "Readability receives the same bounded HTML prefix that Foremention allows the native inspector to inspect for truncation fixtures.",
  },
  averages: {
    nativeQuality: rounded(nativeAverageQuality),
    readabilityQuality: rounded(readabilityAverageQuality),
    nativeArticleQuality: rounded(nativeArticleQuality),
    readabilityArticleQuality: rounded(readabilityArticleQuality),
    readabilityArticleRecall: rounded(readabilityArticleRecall),
  },
  materialWins,
  materialRegressions,
  nullExtractions,
  qualityDecision,
  productionDecisionBoundary: "Benchmark quality alone is insufficient for production adoption. A Worker-compatible DOM implementation, bundle/runtime cost, security review, and workerd dry-run must also pass.",
};

const failures = [];
if (results.length !== 12) failures.push(`expected 12 benchmark cases, got ${results.length}`);
const blocked = results.find((item) => item.id === "blocked");
if (!blocked || blocked.native.access !== "blocked" || blocked.native.status !== 403) {
  failures.push("native inspector no longer preserves the simulated HTTP 403 blocked state");
}
for (const item of results.filter((entry) => entry.id !== "blocked")) {
  if (item.native.metrics.relevantPhraseRecall < 1) {
    failures.push(`native extraction lost required benchmark phrases for ${item.id}`);
  }
}
const malformed = results.find((item) => item.id === "malformed");
if (malformed?.native.metrics.forbiddenMatched.includes("script noise marker")) {
  failures.push("native extraction leaked script content from malformed HTML");
}
const dynamic = results.find((item) => item.id === "dynamic-snapshot");
if (dynamic?.native.metrics.forbiddenMatched.includes("Dynamic script noise marker")) {
  failures.push("native extraction leaked executable script content from a rendered snapshot");
}

await mkdir(outputDir, { recursive: true });
await writeFile(path.join(outputDir, "results.json"), `${JSON.stringify({ summary, results, failures }, null, 2)}\n`);

const markdown = [
  "# Foremention source extraction benchmark",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "## Methodology",
  "",
  `- Corpus: ${summary.corpusCases} deterministic checked-in fixtures.`,
  `- Quality score: ${summary.methodology.qualityScore}.`,
  `- Latency: ${summary.methodology.latency}.`,
  "- Mozilla Readability runs in a benchmark-only Node/JSDOM environment; this does not prove Cloudflare Worker compatibility.",
  "- Readability does not fetch URLs, validate DNS, control redirects, or replace Foremention SSRF/network policy.",
  "",
  "## Aggregate result",
  "",
  `- Native average quality: ${summary.averages.nativeQuality}`,
  `- Readability average quality: ${summary.averages.readabilityQuality}`,
  `- Native article-like quality: ${summary.averages.nativeArticleQuality}`,
  `- Readability article-like quality: ${summary.averages.readabilityArticleQuality}`,
  `- Readability article-like required-phrase recall: ${summary.averages.readabilityArticleRecall}`,
  `- Material Readability wins: ${summary.materialWins.join(", ") || "none"}`,
  `- Material Readability regressions: ${summary.materialRegressions.join(", ") || "none"}`,
  `- Readability null extractions: ${summary.nullExtractions.join(", ") || "none"}`,
  `- Quality decision: **${summary.qualityDecision}**`,
  "",
  "## Per-case results",
  "",
  "| Case | Native quality | Readability quality | Native ms | Readability ms | Readability state |",
  "|---|---:|---:|---:|---:|---|",
  ...results.map((item) => `| ${item.id} | ${rounded(item.native.metrics.qualityScore)} | ${item.readability.metrics ? rounded(item.readability.metrics.qualityScore) : "n/a"} | ${item.native.medianLatencyMs} | ${item.readability.medianLatencyMs ?? "n/a"} | ${item.readability.reason || "parsed"} |`),
  "",
  "## Production boundary",
  "",
  summary.productionDecisionBoundary,
  "",
  ...(failures.length ? ["## Benchmark contract failures", "", ...failures.map((failure) => `- ${failure}`), ""] : []),
].join("\n");

await writeFile(path.join(outputDir, "summary.md"), `${markdown}\n`);

console.log(markdown);
if (failures.length) {
  console.error(`Benchmark contract failed with ${failures.length} issue(s).`);
  process.exit(1);
}
