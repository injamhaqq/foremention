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

test("competitor mentions match whole brand terms, not fragments of other words", async () => {
  const { answerMentionsName } = await import("../lib/competitor-evidence-gate.mjs");
  assert.equal(answerMentionsName("Check your inbox and Dropbox", "Box"), false);
  assert.equal(answerMentionsName("A notional budget", "Notion"), false);
  assert.equal(answerMentionsName("Box is a solid choice.", "Box"), true);
  assert.equal(answerMentionsName("Try Notion, Linear, or Asana", "notion"), true);
  assert.equal(answerMentionsName("Rival's pricing is lower", "Rival"), true);
  assert.equal(answerMentionsName("(Acme Cloud)", "Acme Cloud"), true);
  assert.equal(answerMentionsName("Use Monday.com for tracking", "Monday.com"), true);
  assert.equal(answerMentionsName("Préférez Zoé.", "Zoé"), true);
  assert.equal(answerMentionsName("Zoéline est différent", "Zoé"), false);
  assert.equal(answerMentionsName("Rival", " "), false);
  assert.equal(answerMentionsName(null, "Rival"), false);
});

test("competitor delta no longer counts substring false positives", () => {
  const answers = [a("earlier", "Box leads"), a("earlier", "Box again"), a("later", "Check your inbox"), a("later", "Box wins")];
  assert.equal(competitorPairDelta(answers, pair, "Box"), -50);
});

test("all competitor frequency paths use whole-term matching", () => {
  for (const file of ["lib/evidence-integrity-data.ts", "lib/data.ts"]) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.match(source, /answerMentionsName\(/, file);
    assert.doesNotMatch(source, /answer_text\.toLocaleLowerCase\(\)\.includes\(normalizedName\)/, file);
  }
});
