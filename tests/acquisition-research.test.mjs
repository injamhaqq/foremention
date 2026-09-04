import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveAcquisitionResearchAssessment,
  normalizeAcquisitionResearchFacts,
} from "../lib/acquisition-research.ts";

const at = "2026-09-04T10:00:00.000Z";
const sourceA = "https://example.com/blog/ai-search";
const sourceB = "https://news.example.org/example-launch";
const sourceC = "https://jobs.example.net/example-growth";

function fact(key, value, sourceUrl, confidence = 90) {
  return { key, value, sourceUrl, retrievedAt: at, confidence };
}

test("normalizes and deduplicates traceable research facts", () => {
  const facts = normalizeAcquisitionResearchFacts([
    fact("buyer_question", "How do buyers discover us in AI?", sourceA),
    fact("buyer_question", " How do buyers discover us in AI? ", `${sourceA}#fragment`),
  ]);
  assert.equal(facts.length, 1);
  assert.equal(facts[0].sourceUrl, sourceA);
  assert.equal(facts[0].confidence, 90);
});

test("derives a deterministic qualified shadow assessment from rich multi-source evidence", () => {
  const assessment = deriveAcquisitionResearchAssessment([
    fact("employee_band", "50-500", sourceA),
    fact("buyer_question", "Which platform should our buyer choose?", sourceA),
    fact("buyer_question", "What alternatives are recommended?", sourceB),
    fact("competitor", "Competitor One", sourceA),
    fact("competitor", "Competitor Two", sourceB),
    fact("competitor", "Competitor Three", sourceC),
    fact("intervention_signal", "Public comparison and pricing pages are actively maintained", sourceA),
    fact("intervention_signal", "Documentation is part of the buying journey", sourceB),
    fact("ai_search_motion", "Company published AI-search/GEO content", sourceA),
    fact("recommendation_exposure", "Buyer choice depends on third-party and AI recommendations", sourceB),
    fact("recommendation_exposure", "Competitor comparison content is visible", sourceC),
    fact("measurement_signal", "Public product/category pages can be measured repeatedly", sourceA),
    fact("measurement_signal", "Buyer questions are repeatable across measurement cycles", sourceB),
    fact("buyer_role", "VP Marketing", sourceA),
    fact("buyer_role", "Head of SEO", sourceB),
    fact("recent_trigger", "Launched an AI-search initiative this quarter", sourceC),
  ]);

  assert.equal(assessment.sourceCount, 3);
  assert.equal(assessment.qualification.score, 100);
  assert.equal(assessment.qualification.qualified, true);
  assert.equal(assessment.qualification.whyNow, "Launched an AI-search initiative this quarter");
  assert.deepEqual(assessment.disqualifiers, []);
  assert.equal(assessment.scores.buyerQuestionCommercialFit, 20);
  assert.equal(assessment.scores.competitiveDensity, 15);
  assert.equal(assessment.scores.thirtyDayActionability, 5);
});

test("fails qualification closed when evidence comes from only one independent source", () => {
  const assessment = deriveAcquisitionResearchAssessment([
    fact("buyer_question", "Which platform should our buyer choose?", sourceA),
    fact("competitor", "Competitor One", sourceA),
    fact("intervention_signal", "Comparison pages are public", sourceA),
    fact("ai_search_motion", "AI-search content exists", sourceA),
    fact("recommendation_exposure", "Recommendation exposure exists", sourceA),
    fact("measurement_signal", "Repeatable public measurement surface exists", sourceA),
    fact("buyer_role", "VP Marketing", sourceA),
    fact("recent_trigger", "AI-search initiative launched", sourceA),
  ]);

  assert.equal(assessment.sourceCount, 1);
  assert.equal(assessment.qualification.qualified, false);
  assert.ok(assessment.disqualifiers.includes("INSUFFICIENT_INDEPENDENT_SOURCES"));
});

test("fails qualification closed when public evidence places company outside the initial size hypothesis", () => {
  const assessment = deriveAcquisitionResearchAssessment([
    fact("employee_band", "over-500", sourceA),
    fact("recent_trigger", "New marketing initiative", sourceB),
  ]);

  assert.equal(assessment.qualification.qualified, false);
  assert.ok(assessment.disqualifiers.includes("SIZE_OUTSIDE_INITIAL_ICP"));
});

test("rejects malformed or non-HTTPS evidence instead of manufacturing facts", () => {
  assert.throws(
    () => normalizeAcquisitionResearchFacts([fact("buyer_question", "A real question", "http://example.com")]),
    /ACQUISITION_RESEARCH_MALFORMED_FACT/,
  );
});
