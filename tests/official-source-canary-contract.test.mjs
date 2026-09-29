import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const [canary, retrieval] = await Promise.all([
  readFile(new URL("../scripts/first-evidence-production-canary.mjs", import.meta.url), "utf8"),
  readFile(new URL("../lib/free-web-retrieval.ts", import.meta.url), "utf8"),
]);

test("the exact official-domain acceptance gate runs before the canary publishes synthetic review", () => {
  assert.match(canary, /explicitOfficialSourceRequirement\(freshWebEvidenceQuestion\)/);
  assert.match(canary, /article\.canonical-answer-record/);
  assert.match(canary, /\.canonical-citation-record > a/);
  assert.match(canary, /assessExplicitOfficialSourceAnswer/);
  assert.match(canary, /official-source-provenance-minimum-verified/);
  const requirementAt = canary.indexOf("const requiredOfficialSource =");
  const gateAt = canary.indexOf("if (!officialAssessment.ok)");
  const reviewAt = canary.indexOf('sameOriginFetch(page, `/api/runs/${run.id}/review`');
  assert.ok(requirementAt > 0 && gateAt > requirementAt && reviewAt > gateAt,
    "fail-closed qualification must run before synthetic review publication");
  assert.doesNotMatch(canary, /FOREMENTION_CITATION_QUALITY_BYPASS|assumeOfficialEvidence/i);
});

test("the scoped official-domain filter runs before the paid model is invoked; generic questions stay supported", () => {
  assert.ok(retrieval.includes("explicitOfficialSourceRequirement(originalBuyerQuestion)"));
  assert.ok(retrieval.includes("boundedOfficialSiteQuery(originalBuyerQuestion, officialRequirement)"));
  assert.match(retrieval, /filterOfficialDomainCitations\(unqualifiedResults, officialRequirement\)/);
  const filterAt = retrieval.indexOf("filterOfficialDomainCitations(unqualifiedResults");
  const returnAt = retrieval.indexOf("return {\n    content: evidenceText");
  assert.ok(filterAt > 0 && returnAt > filterAt);
});


test("provider custom search terms cannot bypass the original official-domain requirement", async()=>{
  const adapter=await readFile(new URL("../lib/providers/cloudflare.ts",import.meta.url),"utf8");
  assert.ok(adapter.includes("retrieveFreeWebEvidence(input.searchQuery || input.prompt, input.signal, input.prompt)"));
});