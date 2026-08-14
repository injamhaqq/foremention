import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const doc = await readFile(new URL("../docs/authenticated-first-evidence-canary.md", import.meta.url), "utf8");

test("canary documentation keeps live-provider spend and human source review explicit", () => {
  assert.match(doc, /No real provider call occurs until both the canary enable switch and the provider-spend approval switch are explicitly true/);
  assert.match(doc, /does \*\*not\*\* auto-save a source review or create an opportunity/);
  assert.match(doc, /ordinary `\/api\/onboarding` customer endpoint/);
  assert.match(doc, /acceptance:<exact-git-sha>/);
  assert.match(doc, /does not archive the acceptance email\/password, prompt text, provider answer text, citation URLs/);
});
