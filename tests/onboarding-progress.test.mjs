import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("first audit exposes four truthful progress stages", async () => {
  const wizard = await readFile(new URL("../components/onboarding-wizard.tsx", import.meta.url), "utf8");
  for (const label of ["Scraping your website", "Generating questions", "Running AI audit", "Building your Source Map"]) {
    assert.match(wizard, new RegExp(label));
  }
  assert.match(wizard, /setAuditStage\(5\)/);
  assert.match(wizard, /\["review", "complete", "partial"\]/);
  assert.match(wizard, /aria-label="First audit progress"/);
});
