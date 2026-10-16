// Chat 02: preserve lexical-name truth in both answer scoring and page inspection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { firstBoundedNameIndex, assessObservedPagePresence } from "../lib/source-page-presence.ts";

test("substrings inside different brand names do not count as mentions", () => {
  for (const [answer, brand] of [
    ["NotAcme is recommended.", "Acme"],
    ["Use AcmePlus for reporting.", "Acme"],
    ["SuperContosoWorks is discussed.", "Contoso"],
    ["The team is going to market.", "Go"],
    ["préAcme is not the intended product.", "Acme"],
    ["A\u{1F642}SuperAcme is not the intended product.", "Acme"],
  ]) {
    assert.equal(firstBoundedNameIndex(answer, brand), -1, answer);
  }
});

test("Unicode, punctuation, case and multiple-word exact mentions remain recognized", () => {
  for (const [answer, brand] of [
    ["We evaluated (Acme) last week.", "Acme"],
    ["MÜNCHEN is listed.", "München"],
    ["Beta Labs, followed by competitors.", "Beta Labs"],
    ["Visit https://acme.ai/docs for the product.", "Acme.ai"],
    ["Acme — evidence only.", "Acme"],
  ]) assert.notEqual(firstBoundedNameIndex(answer, brand), -1, answer);
  assert.equal(firstBoundedNameIndex("Acme.aiPlus", "Acme.ai"), -1);
  assert.equal(firstBoundedNameIndex("Anything", ""), -1);
});

test("first real mention decides brand-versus-competitor ordering", () => {
  const text = "NotAcme is unrelated. Contoso first; then Acme is named.";
  const brand = firstBoundedNameIndex(text, "Acme");
  const competitor = firstBoundedNameIndex(text, "Contoso");
  assert.ok(brand > competitor);
  assert.ok(competitor >= 0);
  assert.equal(firstBoundedNameIndex("NotContoso followed by Acme", "Contoso"), -1);
});

test("source page measurement continues to distinguish partial unknown from complete absence", () => {
  const inspection = (access, pageText, pageTextCoverage) => ({
    access,
    pageTitle: null,
    pageDescription: null,
    pageText,
    pageTextCoverage,
  });
  assert.deepEqual(
    assessObservedPagePresence(inspection("partial", "NotAcme", "partial"), "Acme").pagePresenceState,
    "unknown",
  );
  assert.equal(
    assessObservedPagePresence(inspection("open", "NotAcme", "complete"), "Acme").pagePresenceState,
    "absent",
  );
  assert.equal(
    assessObservedPagePresence(inspection("partial", "Acme", "partial"), "Acme").pagePresenceState,
    "present",
  );
});

test("persisted answer, competitor position and run denominator use the same bounded matcher", async () => {
  const jobs = await readFile(new URL("../lib/jobs/inngest.ts", import.meta.url), "utf8");
  assert.match(jobs, /const brandIndex = firstBoundedNameIndex\(answer\.answer, identity\.brand\)/);
  assert.match(jobs, /firstBoundedNameIndex\(answer\.answer, name\)/);
  assert.match(jobs, /brand_present: brandIndex >= 0/);
  assert.match(jobs, /results\.filter\(\(result\) => firstBoundedNameIndex\(result\.answer\.answer, identity\.brand\) >= 0\)/);
  assert.doesNotMatch(jobs, /\bconst includesName\s*=/);
});
