import assert from "node:assert/strict";
import test from "node:test";
import { reviewedOpportunityBridge } from "../lib/reviewed-opportunity.ts";

test("a reviewed missing-brand source becomes an actionable persisted opportunity without an invented score", () => {
  const result = reviewedOpportunityBridge({
    pageTitle: "Best accounting software for teams",
    canonicalUrl: "https://example.com/accounting",
    route: "expert contribution",
    clientPresent: false,
  });

  assert.equal(result.actionable, true);
  assert.equal(result.title, "Reviewed source gap: Best accounting software for teams");
  assert.match(result.nextAction, /linked reviewed evidence/);
  assert.match(result.nextAction, /expert contribution/);
  assert.match(result.nextAction, /permission/);
  assert.equal(result.influenceScore, 0);
  assert.equal(result.feasibilityScore, 0);
});

test("brand-present review archives the bridge instead of manufacturing an opportunity", () => {
  const result = reviewedOpportunityBridge({
    pageTitle: null,
    canonicalUrl: "https://www.example.org/review",
    route: "legitimate review",
    clientPresent: true,
  });

  assert.equal(result.actionable, false);
  assert.equal(result.title, "Reviewed source gap: example.org");
  assert.match(result.nextAction, /Archived/);
  assert.equal(result.influenceScore, 0);
  assert.equal(result.feasibilityScore, 0);
});
