import assert from "node:assert/strict";
import test from "node:test";
import {
  citationMatchesScope,
  domainScopedQuery,
  parseBingSearchRss,
  restrictResultsToScope,
  SourceScopeUnavailableError,
  sourceDomainScopeFromPrompt,
} from "../lib/free-web-retrieval.ts";

// The exact pinned synthetic canary question from #345.
const officialQuestion = "Use web search now. According to the official OpenAI website, what is the title and publication date of the most recently published post on openai.com/news at the time you answer? Cite the exact openai.com source URL you used. If you cannot verify it with current web evidence, say so rather than answering from memory.";

const offDomainRss = `<rss><channel>
  <item><title>Dictionary: recent</title><link>https://www.dictionary.com/browse/recent</link><description>definition</description></item>
  <item><title>Microsoft Support</title><link>https://support.microsoft.com/en-us/help</link><description>help</description></item>
  <item><title>Lookalike</title><link>https://openai.com.evil.example/news/post</link><description>spoof</description></item>
  <item><title>Messaging docs</title><link>https://developers.example.org/messaging</link><description>docs</description></item>
</channel></rss>`;

test("the exact official-domain canary question yields an explicit domain scope", () => {
  const scope = sourceDomainScopeFromPrompt(officialQuestion);
  assert.ok(scope);
  assert.equal(scope.domain, "openai.com");
});

test("ordinary comparison questions are never site-scoped", () => {
  assert.equal(sourceDomainScopeFromPrompt("What are the best CRM tools for a 50-person B2B SaaS sales team?"), null);
  assert.equal(sourceDomainScopeFromPrompt("Compare hubspot.com and salesforce.com for mid-market teams."), null);
  assert.equal(sourceDomainScopeFromPrompt("Cite the exact source URL comparing hubspot.com and salesforce.com"), null);
});

test("domain-scoped query is concise, bounded and site-qualified", () => {
  const scope = sourceDomainScopeFromPrompt(officialQuestion);
  const query = domainScopedQuery(officialQuestion, scope);
  assert.match(query, /^site:openai\.com /);
  assert.ok(query.length <= 200);
  assert.ok(query.split(" ").length <= 9);
  assert.doesNotMatch(query, /\b(the|according|official|memory)\b/);
  const pathScoped = domainScopedQuery("x", { domain: "openai.com", pathPrefix: "/news" });
  assert.equal(pathScoped, "site:openai.com/news");
});

test("off-domain RSS results are never passed on as official evidence", () => {
  const scope = sourceDomainScopeFromPrompt(officialQuestion);
  const results = parseBingSearchRss(offDomainRss);
  assert.equal(results.length, 4);
  assert.throws(() => restrictResultsToScope(results, scope), (error) =>
    error instanceof SourceScopeUnavailableError && error.retrievedCount === 4 && /withheld/.test(error.message));
});

test("only matching official-domain results survive, with provenance preserved", () => {
  const scope = { domain: "openai.com", pathPrefix: "/news" };
  const mixed = [
    { url: "https://openai.com/news/real-post/", title: "Real" },
    { url: "https://www.openai.com/news", title: "Index" },
    { url: "https://openai.com/research/other", title: "Wrong path" },
    { url: "https://notopenai.com/news/x", title: "Suffix spoof" },
    { url: "https://openai.com.evil.example/news/x", title: "Prefix spoof" },
  ];
  assert.deepEqual(restrictResultsToScope(mixed, scope).map((r) => r.title), ["Real", "Index"]);
  assert.equal(citationMatchesScope("https://help.openai.com/x", { domain: "openai.com", pathPrefix: null }), true);
  assert.equal(citationMatchesScope("not a url", { domain: "openai.com", pathPrefix: null }), false);
  assert.deepEqual(restrictResultsToScope(mixed, null), mixed);
});

test("Cloudflare grounded adapter applies the scope and fails closed as unavailable evidence", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../lib/providers/cloudflare.ts", import.meta.url), "utf8");
  assert.match(source, /sourceDomainScopeFromPrompt\(input\.prompt\)/);
  assert.match(source, /retrieveFreeWebEvidence\(query, input\.signal, scope\)/);
  assert.match(source, /SourceScopeUnavailableError[\s\S]*ProviderRequestError\([^)]*422/);
});
