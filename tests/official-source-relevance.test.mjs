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
    { url: "http://openai.com/news/plaintext" },
    { url: "https://attacker.invalid@openai.com/news/credential-bait" },
    { url: "https://openai.com:8443/news/unverified-service" },
    { url: "https://notopenai.com/news" },
    { url: "javascript:alert(1)" },
  ];
  assert.deepEqual(filterOfficialDomainCitations(refs, req), [refs[4]]);
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

test("an official-looking URL cannot upgrade common explicit abstentions into VERIFIED evidence", () => {
  const cited = [{ url: "https://openai.com/news/real-but-not-independently-checked" }];
  for (const answer of [
    "I don't know which post was published latest.",
    "I cannot confirm the publication date.",
    "I couldn't find the latest post on the website.",
    "I could not access the original page.",
    "I am unable to locate that article.",
    "I was unable to verify the title.",
    "I am not able to confirm the exact publication date.",
    "Unable to determine which result is most recent.",
    "There is insufficient current evidence for the date.",
    "There isn't enough reliable information to establish the title.",
    "No verifiable information was retrieved.",
    "The available evidence does not confirm that article.",
    '"I cannot verify the title or date from the live website."',
  ]) {
    assert.deepEqual(assessExplicitOfficialSourceAnswer(answer,cited,req),{
      ok:false,reason:"ABSTENTION_NOT_VERIFIED_EVIDENCE",
    },answer);
  }
  assert.deepEqual(assessExplicitOfficialSourceAnswer(
    "A specific official article is observed in the results, but freshness still requires independent inspection.",cited,req,
  ),{ok:true,reason:null});
});


test("an explicitly required official /news section rejects same-host wrong paths and encoded-path ambiguity", () => {
  const refs = [
    { url: "https://openai.com/news" },
    { url: "https://www.openai.com/news/" },
    { url: "https://openai.com/news/approved-article" },
    { url: "https://openai.com/newsroom/unrelated" },
    { url: "https://openai.com/index/news-like" },
    { url: "https://openai.com/NEWS/uppercase-route" },
    { url: "https://openai.com/news/%2fadmin" },
    { url: "https://openai.com/news%2Fshould-not-be-trusted" },
    { url: "https://openai.com.news.attacker.example/news/foo" },
    { url: "http://openai.com/news/plaintext" },
  ];
  assert.deepEqual(filterOfficialDomainCitations(refs, req), refs.slice(0, 3));
  assert.deepEqual(
    filterOfficialDomainCitations([{url:"https://openai.com/other/page"}],{host:"openai.com",pathHint:""}),
    [{url:"https://openai.com/other/page"}],
    "host-only explicitly required citations may reference other paths",
  );
  assert.deepEqual(
    filterOfficialDomainCitations(refs,{host:"openai.com",pathHint:"../news"}),
    [],
    "unvalidated injected path constraints never match anything",
  );
});
test("a mixed response with one official result and one irrelevant link cannot receive bulk VERIFIED status", () => {
  const official = {url:"https://openai.com/news/synthetic-source"};
  const offSection = {url:"https://openai.com/index/unrelated"};
  const offDomain = {url:"https://dictionary.example/not-the-announcement"};
  const substantive="The synthetic announcement is dated 1 January 2026.";
  assert.deepEqual(assessExplicitOfficialSourceAnswer(substantive,[official],req),
    {ok:true,reason:null});
  for(const other of [offSection,offDomain,{url:"not-a-url"}]){
    assert.deepEqual(assessExplicitOfficialSourceAnswer(substantive,[official,other],req),
      {ok:false,reason:"UNQUALIFIED_CITATIONS_PRESENT"});
  }
  assert.equal(assessExplicitOfficialSourceAnswer(substantive,[offSection],req).reason,
    "NO_OFFICIAL_DOMAIN_CITATIONS");
});
