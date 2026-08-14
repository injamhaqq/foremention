import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("first evidence exposes four truthful progress stages", async () => {
  const wizard = await readFile(new URL("../components/onboarding-wizard.tsx", import.meta.url), "utf8");
  for (const label of ["Workspace saved", "Buyer question frozen", "Running AI observation", "Mapping returned evidence"]) {
    assert.match(wizard, new RegExp(label));
  }
  assert.match(wizard, /setAuditStage\(5\)/);
  assert.match(wizard, /\["review", "complete", "partial"\]/);
  assert.match(wizard, /aria-label="First evidence progress"/);
  assert.match(wizard, /one real answer is being collected/i);
  assert.doesNotMatch(wizard, /takes about 2 minutes/i);
});
