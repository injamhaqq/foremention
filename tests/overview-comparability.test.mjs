import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Overview never treats the chronologically previous reviewed run as automatically comparable", async () => {
  const page = await text("app/app/page.tsx");

  assert.match(page, /loadSafeWeeklyIntelligence/);
  assert.match(page, /const comparableLatest = intelligence\.latest/);
  assert.match(page, /const comparablePrevious = intelligence\.previous/);
  assert.doesNotMatch(page, /const previous = observedRuns\[1\]/);
  assert.match(page, /persisted buyer-question text, provider, exact model, and methodology all match/i);
  assert.match(page, /Foremention records the change; it does not claim what caused it/i);
});

test("Overview withholds cross-collection movement when Safe Intelligence has only one exact baseline", async () => {
  const page = await text("app/app/page.tsx");

  assert.match(page, /Cross-collection movement is withheld until an identical comparison exists/);
  assert.match(page, /Other reviewed collections can remain valid evidence on their own/);
  assert.match(page, /const exactMovement = comparableLatest && comparablePrevious/);
});
