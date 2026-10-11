import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { competitorPairDelta } from "../lib/competitor-evidence-gate.mjs";

const pair = { latestId: "later", previousId: "earlier" };
const a = (runId, answerText) => ({ runId, answerText });

test("competitor delta is computed from the exact independently verified pair", () => {
  const answers = [a("earlier", "Acme and Rival"), a("earlier", "Only Acme"), a("later", "Rival leads"), a("later", "rival again")];
  assert.equal(competitorPairDelta(answers, pair, "Rival"), 50);
  assert.equal(competitorPairDelta(answers, pair, "Acme"), -100);
});

test("competitor delta fails closed on missing side, foreign rows, or invalid pair", () => {
  assert.equal(competitorPairDelta([a("later", "Rival")], pair, "Rival"), null);
  assert.equal(competitorPairDelta([a("later", "Rival"), a("earlier", "x"), a("third", "Rival")], pair, "Rival"), null);
  assert.equal(competitorPairDelta([a("later", "Rival")], { latestId: "later", previousId: "later" }, "Rival"), null);
  assert.equal(competitorPairDelta([a("later", "Rival"), a("earlier", "x")], pair, " "), null);
});

test("competitor tracking re-verifies the exact pair before computing a delta (#387)", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/evidence-integrity-data.ts"), "utf8");
  const start = source.indexOf("export async function loadTruthfulCompetitorTracking");
  const block = source.slice(start, source.indexOf("function buildDecisionActions", start));
  assert.match(block, /assessWorkspaceRunPairComparability\(viewer, comparablePair\.previousId, comparablePair\.latestId\)/);
  assert.match(block, /competitorPairDelta\(pairEvidence\.answers/);
  assert.doesNotMatch(block, /latestPoint\.frequencyPct - previousPoint\.frequencyPct/);
});
