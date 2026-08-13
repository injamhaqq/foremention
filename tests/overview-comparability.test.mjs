import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Overview movement uses the exact-question-safe intelligence pair instead of chronological neighbors", async () => {
  const page = await text("app/app/page.tsx");

  assert.match(page, /loadSafeWeeklyIntelligence\(viewer\)/);
  assert.match(page, /const comparisonLatest = intelligence\.latest/);
  assert.match(page, /const comparisonPrevious = intelligence\.previous/);
  assert.doesNotMatch(page, /const previous = observedRuns\[1\]/);
  assert.match(page, /same exact persisted buyer-question text, provider, exact model, and methodology gate/);
  assert.match(page, /cross-collection movement is withheld/i);
  assert.match(page, /it does not claim what caused it/i);
});

test("Overview can still show the latest observed run while keeping unreviewed evidence out of movement", async () => {
  const page = await text("app/app/page.tsx");

  assert.match(page, /const latest = observedRuns\[0\] \|\| null/);
  assert.match(page, /Latest observed answer · awaiting review/);
  assert.match(page, /Observed brand presence/);
  assert.match(page, /comparisonLatest && comparisonPrevious/);
});
