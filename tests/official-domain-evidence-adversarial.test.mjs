// A08 / #345: an irrelevant source never substantiates an official-domain
// finding, on either retrieval provider (Brave Search API or Bing RSS), in
// bulk review, or in the production canary gate. Missing evidence stays
// unknown. Offline only: fetch is replaced; no network or paid calls.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessOfficialSourceAnswer,
  citationMatchesScope,
  isAbstentionAnswer,
  partitionOfficialSourceReview,
  sourceDomainScopeFromPrompt,
} from "../lib/official-source-relevance.mjs";
import {
  retrieveFreeWebEvidence,
  SourceScopeUnavailableError,
  sourceDomainScopeFromPrompt as retrievalScope,
} from "../lib/free-web-retrieval.ts";

const pinned = "Use web search now. According to the official OpenAI website, what is the title and publication date of the most recently published post on openai.com/news at the time you answer? Cite the exact openai.com source URL you used. If you cannot verify it with current web evidence, say so rather than answering from memory.";
const scope = sourceDomainScopeFromPrompt(pinned);

const adversarialUrls = [
  "https://www.dictionary.com/browse/recent",
  "https://support.microsoft.com/en-us/help",
  "https://openai.com.evil.example/news/post",
  "https://notopenai.com/news/post",
  "https://openai.co/news/post",
  "https://xn--openi-7ta.com/news/post", // punycode lookalike
  "http://openai.com/news/plaintext",
  "https://openai.com:8443/news/port",
  "https://openai.com/index/wrong-section",
  "https://openai.com/news%2f..%2fadmin",
  "https://openai.com/newsroom-fake/post",
];

function bingRss(urls) {
  return `<rss><channel>${urls.map((url, index) =>
    `<item><title>Result ${index}</title><link>${url}</link><description>snippet ${index}</description></item>`).join("")}</channel></rss>`;
}

function braveJson(urls) {
  return JSON.stringify({ web: { results: urls.map((url, index) => ({ url, title: `Result ${index}`, description: `snippet ${index}` })) } });
}

async function withProvider(provider, urls, action) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.BRAVE_SEARCH_API_KEY;
  if (provider === "brave") process.env.BRAVE_SEARCH_API_KEY = "test-key-offline";
  else delete process.env.BRAVE_SEARCH_API_KEY;
  const calls = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    calls.push(url);
    if (provider === "brave") {
      assert.equal(url.hostname, "api.search.brave.com", "Bing must never be called when Brave is configured");
      return new Response(braveJson(urls), { status: 200, headers: { "content-type": "application/json" } });
    }
    assert.equal(url.hostname, "www.bing.com");
    return new Response(bingRss(urls), { status: 200, headers: { "content-type": "application/rss+xml" } });
  };
  try {
    return await action(calls);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.BRAVE_SEARCH_API_KEY;
    else process.env.BRAVE_SEARCH_API_KEY = originalKey;
  }
}

test("pinned canary question scopes to openai.com/news; retrieval and policy share one parser", () => {
  assert.deepEqual(scope, { domain: "openai.com", pathPrefix: "/news" });
  assert.deepEqual(retrievalScope(pinned), scope);
  assert.equal(sourceDomainScopeFromPrompt("Which CRM is best for a 50-person SaaS team?"), null);
  assert.equal(sourceDomainScopeFromPrompt("Compare hubspot.com and salesforce.com; cite the exact source URL."), null);
  assert.deepEqual(
    sourceDomainScopeFromPrompt("From the official site, what is on openai.com/news and openai.com/research? Cite the exact URL."),
    { domain: "openai.com", pathPrefix: null },
    "conflicting paths fall back to domain scope rather than guessing",
  );
});

test("every adversarial/off-domain URL is rejected by the strict matcher; genuine official URLs pass", () => {
  for (const url of adversarialUrls) assert.equal(citationMatchesScope(url, scope), false, url);
  assert.equal(citationMatchesScope("https://user:pw@openai.com/news/x", scope), false);
  assert.equal(citationMatchesScope("https://openai.com/news/real-post", scope), true);
  assert.equal(citationMatchesScope("https://www.openai.com/news", scope), true);
  assert.equal(citationMatchesScope("https://openai.com/news/real-post", null), false);
});

for (const provider of ["brave", "bing"]) {
  test(`${provider}: all-adversarial results fail closed as unavailable evidence (unknown), nothing reaches the model`, async () => {
    await withProvider(provider, adversarialUrls, async (calls) => {
      await assert.rejects(retrieveFreeWebEvidence("site:openai.com/news latest post", undefined, scope), (error) =>
        error instanceof SourceScopeUnavailableError && error.retrievedCount > 0 && /withheld/.test(error.message));
      assert.equal(calls.length, 1, "no fallback provider or retry");
    });
  });

  test(`${provider}: zero results under an official scope are unavailable evidence, not a generic retryable error`, async () => {
    await withProvider(provider, [], async () => {
      await assert.rejects(retrieveFreeWebEvidence("site:openai.com/news latest post", undefined, scope), (error) =>
        error instanceof SourceScopeUnavailableError && error.retrievedCount === 0);
    });
  });

  test(`${provider}: an official result ranked after many off-domain hits survives; only it is passed on`, async () => {
    const urls = [...adversarialUrls, "https://openai.com/news/genuine-post"];
    await withProvider(provider, urls, async (calls) => {
      const evidence = await retrieveFreeWebEvidence("site:openai.com/news latest post", undefined, scope);
      assert.deepEqual(evidence.citations.map((c) => c.url), ["https://openai.com/news/genuine-post"]);
      assert.equal(evidence.retrievalProvider, provider === "brave" ? "brave-search" : "bing-rss");
      for (const bad of ["dictionary.com", "evil.example", "notopenai", "openai.co/", "/index/"]) {
        assert.equal(evidence.content.includes(bad), false, bad);
      }
      assert.ok(Number(calls[0].searchParams.get("count")) > 8, "scoped requests read deeper before filtering");
    });
  });

  test(`${provider}: ordinary unscoped questions keep the multi-vendor path and existing cap`, async () => {
    const urls = Array.from({ length: 12 }, (_, i) => `https://vendor${i}.example/page`);
    await withProvider(provider, urls, async (calls) => {
      const evidence = await retrieveFreeWebEvidence("best CRM tools for B2B SaaS");
      assert.equal(evidence.citations.length, 8);
      assert.equal(calls[0].searchParams.get("count"), "8");
    });
  });
}

test("answer qualification: irrelevant, mixed, empty or abstaining answers never substantiate an official finding", () => {
  const good = [{ url: "https://openai.com/news/genuine-post" }];
  assert.deepEqual(assessOfficialSourceAnswer("The newest post is “X”, 1 Oct 2026.", good, scope), { ok: true, reason: null });
  assert.equal(assessOfficialSourceAnswer("The newest post is X.", adversarialUrls.map((url) => ({ url })), scope).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialSourceAnswer("The newest post is X.", [...good, { url: "https://www.dictionary.com/browse/recent" }], scope).reason, "UNQUALIFIED_CITATIONS_PRESENT");
  assert.equal(assessOfficialSourceAnswer("The newest post is X.", [], scope).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialSourceAnswer("The newest post is X.", "not-an-array", scope).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
  assert.equal(assessOfficialSourceAnswer("I can’t verify the most recent post from the retrieved evidence.", good, scope).reason, "ABSTENTION_NOT_VERIFIED_EVIDENCE");
  assert.equal(assessOfficialSourceAnswer("The newest post is X.", good, null).ok, false);
  for (const refusal of [
    "I cannot verify this with current web evidence.",
    "I was unable to confirm the latest post.",
    "Unable to determine the newest article.",
    "There is not enough current evidence to answer.",
    "No reliable evidence was retrieved.",
    "The retrieved evidence does not contain the latest post.",
    "  \"I don't know.\"",
    "",
  ]) assert.equal(isAbstentionAnswer(refusal), true, refusal);
  assert.equal(isAbstentionAnswer("The most recent post is “Introducing X” (1 Oct 2026)."), false);
});

test("bulk review withholds non-qualifying official-source answers and leaves ordinary answers in the human workflow", () => {
  const rows = [
    { id: "a", prompt_text: pinned, answer_text: "I cannot verify this.", citations_json: [{ url: "https://www.dictionary.com/browse/recent" }] },
    { id: "b", prompt_text: pinned, answer_text: "The newest post is X.", citations_json: [{ url: "https://openai.com.evil.example/news/x" }] },
    { id: "c", prompt_text: pinned, answer_text: "The newest post is X.", citations_json: [{ url: "https://openai.com/news/x" }] },
    { id: "d", prompt_text: "Which CRM is best for a SaaS team?", answer_text: "HubSpot.", citations_json: [{ url: "https://www.dictionary.com/" }] },
    { id: "e", prompt_text: null, answer_text: "x", citations_json: null },
  ];
  const { verifiable, withheld } = partitionOfficialSourceReview(rows);
  assert.deepEqual(verifiable, ["c", "d", "e"]);
  assert.deepEqual(withheld, [
    { id: "a", reason: "NO_OFFICIAL_DOMAIN_CITATIONS" },
    { id: "b", reason: "NO_OFFICIAL_DOMAIN_CITATIONS" },
  ]);
});

test("review route applies the gate before any VERIFIED write and excludes withheld answers", async () => {
  const route = await readFile(new URL("../app/api/runs/[id]/review/route.ts", import.meta.url), "utf8");
  assert.match(route, /run_answers\?select=id,prompt_text,answer_text,citations_json/);
  const gate = route.indexOf("partitionOfficialSourceReview(answerRows)");
  const firstWrite = route.indexOf('body: { review_status: "verified" }');
  assert.ok(gate > 0 && gate < firstWrite, "gate must precede bulk verified writes");
  assert.match(route, /&id=in\.\(\$\{answerIds\.join\(","\)\}\)/, "VERIFIED write is limited to qualifying answers");
  assert.match(route, /review_status: "excluded"/);
  assert.match(route, /status: 422/);
});

test("production canary qualifies official evidence before it publishes the synthetic review", async () => {
  const canary = await readFile(new URL("../scripts/first-evidence-production-canary.mjs", import.meta.url), "utf8");
  const gate = canary.indexOf("if (!officialAssessment.ok)");
  const review = canary.indexOf("sameOriginFetch(page, `/api/runs/${run.id}/review`");
  assert.ok(canary.includes("sourceDomainScopeFromPrompt(freshWebEvidenceQuestion)"));
  assert.ok(gate > 0 && review > gate, "qualification must run before review publication");
  assert.doesNotMatch(canary, /CITATION_QUALITY_BYPASS|assumeOfficialEvidence/i);
});
