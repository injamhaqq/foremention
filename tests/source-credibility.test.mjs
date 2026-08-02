import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("credibility scoring uses observed signals and exposes missing evidence", async () => {
  const source = await readFile(new URL("../lib/source-credibility.ts", import.meta.url), "utf8");
  assert.match(source, /source\.evidenceCount \* 5/);
  assert.match(source, /new Set\(source\.engines\)\.size \* 7/);
  assert.match(source, /source\.crawlerAccess === "open"/);
  assert.match(source, /source\.reviewedAt/);
  assert.match(source, /independent domain-authority measurement/);
  assert.match(source, /page publication date/);
  assert.match(source, /verified update frequency/);
  assert.match(source, /Math\.min\(100, score\)/);
});

test("source page labels heuristic limits", async () => {
  const page = await readFile(new URL("../app/app/sources/[id]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /not a third-party domain-authority score/);
  assert.match(page, /Still unknown/);
});
