import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { answerMentionsName, buildMentionMatcher } from "../lib/answer-mention.mjs";
import { competitorPairDelta } from "../lib/competitor-evidence-gate.mjs";

test("a competitor name inside another word is not a mention", () => {
  assert.equal(answerMentionsName("Check your inbox daily.", "Box"), false);
  assert.equal(answerMentionsName("Dropbox is popular for file sharing.", "Box"), false);
  assert.equal(answerMentionsName("The notional value is high.", "Notion"), false);
  assert.equal(answerMentionsName("Reply ASAP please.", "SAP"), false);
  assert.equal(answerMentionsName("Deeloper tools", "Deel"), false);
});

test("whole-term mentions still match with case, punctuation, possessives and spacing", () => {
  assert.equal(answerMentionsName("Box is a strong option.", "Box"), true);
  assert.equal(answerMentionsName("Teams often pick box.", "Box"), true);
  assert.equal(answerMentionsName("Box's pricing is simple.", "Box"), true);
  assert.equal(answerMentionsName("Options (Notion, Coda) work.", "Notion"), true);
  assert.equal(answerMentionsName("Try Monday.com for boards.", "Monday.com"), true);
  assert.equal(answerMentionsName("Try monday-com for boards.", "Monday.com"), false);
  assert.equal(answerMentionsName("Google   Workspace\nis fine.", "Google Workspace"), true);
  assert.equal(answerMentionsName("C++ tooling", "C++"), true);
  assert.equal(answerMentionsName("Rippling-based payroll", "Rippling"), true);
});

test("non-Latin and accented names use Unicode letter boundaries", () => {
  assert.equal(answerMentionsName("Use Ткань for this.", "Ткань"), true);
  assert.equal(answerMentionsName("Use Тканьпро for this.", "Ткань"), false);
  assert.equal(answerMentionsName("Écrire avec Écrivain.", "Écrivain"), true);
  assert.equal(answerMentionsName("পাঠাও ভালো সেবা দেয়।", "পাঠাও"), true);
});

test("unusable names fail closed instead of matching everything", () => {
  assert.equal(buildMentionMatcher(""), null);
  assert.equal(buildMentionMatcher("   "), null);
  assert.equal(buildMentionMatcher("a\nb"), null);
  assert.equal(buildMentionMatcher("x".repeat(121)), null);
  assert.equal(buildMentionMatcher(undefined), null);
  assert.equal(answerMentionsName("anything", ""), false);
  assert.equal(answerMentionsName(null, "Box"), false);
});

test("competitor pair delta no longer counts substring matches (Box vs inbox/Dropbox)", () => {
  const pair = { latestId: "later", previousId: "earlier" };
  const a = (runId, answerText) => ({ runId, answerText });
  const answers = [
    a("earlier", "Box is good"),
    a("earlier", "Use Dropbox or check your inbox"),
    a("later", "Dropbox wins"),
    a("later", "Inbox zero tips"),
  ];
  // Old substring logic: earlier 100%, later 100% => 0. Whole-term: 50% -> 0% => -50.
  assert.equal(competitorPairDelta(answers, pair, "Box"), -50);
});

test("competitor tracking and evidence integrity use the shared whole-term matcher", () => {
  const read = (file) => fs.readFileSync(path.join(import.meta.dirname, "..", file), "utf8");
  for (const file of ["lib/data.ts", "lib/evidence-integrity-data.ts", "lib/competitor-evidence-gate.mjs"]) {
    const source = read(file);
    assert.match(source, /answer-mention\.mjs/, `${file} imports the shared matcher`);
    assert.doesNotMatch(source, /toLocaleLowerCase\(\)\.includes\((normalizedName|name|context\.projectBrand)/, `${file} has no substring mention counting`);
  }
});
