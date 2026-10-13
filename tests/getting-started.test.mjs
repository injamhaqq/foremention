import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Overview and Attention reuse one persisted baseline guide", async () => {
  for (const path of ["app/app/page.tsx", "app/api/retention/attention/route.ts"]) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /buildBaselineGuidance/);
    assert.match(source, /prompts.filter\(\(prompt\) => prompt.approved\).length/);
    assert.match(source, /sources.filter\(\(source\) => Boolean\(source.reviewedAt\)\).length/);
  }
});
