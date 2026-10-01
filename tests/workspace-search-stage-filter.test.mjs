import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../lib/workspace-search.ts", import.meta.url), "utf8");

test("placement search never applies ILIKE to the enum stage column", () => {
  assert.doesNotMatch(source, /stage\.ilike/);
  assert.match(source, /const stage = item\.stage\.replaceAll\(" ", "_"\)\.toLowerCase\(\)/);
  assert.match(source, /PLACEMENT_STAGES\.has\(normalizedStage\) && stage === normalizedStage/);
});

test("human-readable placement stages normalize to enum-safe values", () => {
  assert.match(source, /query\.toLowerCase\(\)\.replace\(\/\\s\+\/g, "_"\)/);
  assert.match(source, /"first_cited"/);
  assert.match(source, /"repeatedly_cited"/);
});
