import assert from "node:assert/strict";
import test from "node:test";
import { explicitOfficialSourceRequirement, boundedOfficialSiteQuery, filterOfficialDomainCitations, assessExplicitOfficialSourceAnswer } from "../lib/official-source-relevance.mjs";

const pinned = "Use web search now. According to the official OpenAI website, what is the title and publication date of the most recently published post on openai.com/news at the time you answer? Cite the exact openai.com source URL you used. If you cannot verify it with current web evidence, say so rather than answering from memory.";
const req = { host: "openai.com", pathHint: "news" };

test("pinned official-source canary is recognized without turning ordinary buyer questions into domain restrictions", () => {
  assert.deepEqual(explicitOfficialSourceRequirement(pinned), req);
  assert.equal(explicitOfficialSourceRequirement("How do B2B teams compare vendors?"), null);
  assert.equal(explicitOfficialSourceRequirement("Which tools cite openai.com in a competitive comparison?"), null);
  assert.equal(explicitOfficialSourceRequirement("Official lists might mention a site: which vendor is preferred?"), null);
});

test("official domain search query is bounded and excludes the original instruction preamble", () => {
  const query = boundedOfficialSiteQuery(pinned, req);
  assert.match(query, /^site:openai\.com news /);
  assert.match(query, /title/);
  assert.match(query, /publication/);
  assert.doesNotMatch(query, /Use web search|Cite the exact/i);
  assert.ok(query.length <= 180);
});

test("the domain gate rejects unrelated, tracking and fake suffix hosts instead of counting them as source evidence", () => {
  const refs = [
    { url: "https://dictionary.cambridge.org/dictionary/english/use" },
    { url: "https://openai.com.attacker.invalid/post" },
    { url: "https://www.bing.com/ck/a?url=https://openai.com/news" },
    { url: "https://openai.com/index/example" },
    { url: "https://www.openai.com/news/example" },
    { url: "https://notopenai.com/news" },
    { url: "javascript:alert(1)" },
  ];
  assert.deepEqual(filterOfficialDomainCitations(refs, req), refs.slice(3, 5));
  assert.deepEqual(filterOfficialDomainCitations(refs, null), refs);
  assert.equal(assessExplicitOfficialSourceAnswer("I cannot verify the post", refs.slice(0, 3), req).reason, "NO_OFFICIAL_DOMAIN_CITATIONS");
});

test("abstention plus even an official URL is not a passed freshness answer", () => {
  const official = [{ url: "https://openai.com/news/example" }];
  assert.deepEqual(assessExplicitOfficialSourceAnswer("I cannot verify the latest post.", official, req), {
    ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE",
  });
  assert.deepEqual(assessExplicitOfficialSourceAnswer("A cited official post was observed on the given day.", official, req), {
    ok: true, reason: null,
  });
  assert.deepEqual(assessExplicitOfficialSourceAnswer("", official, req), {
    ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE",
  });
});
