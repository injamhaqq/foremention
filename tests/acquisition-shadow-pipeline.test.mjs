import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("scheduled shadow pipeline advances at most one qualified candidate into contact resolution and a draft", async () => {
  const source = await text("lib/jobs/acquisition-discovery.ts");
  assert.match(source, /MAX_CONTACTED_CANDIDATES_PER_RUN\s*=\s*1/);
  assert.match(source, /MAX_CONTACT_CREDITS_PER_CANDIDATE\s*=\s*5/);
  assert.match(source, /scrapeGraphAcquisitionContactProvider/);
  assert.match(source, /selectBestAcquisitionContact/);
  assert.match(source, /persistResolvedAcquisitionContact/);
  assert.match(source, /createAcquisitionOutreachDraft/);
  assert.doesNotMatch(source, /approveAcquisitionOutreachDraft|sendApprovedAcquisitionOutreach|sendAcquisitionOutreachEmail/);
});

test("scheduled provider spending remains bounded to 100 credits per run", async () => {
  const source = await text("lib/jobs/acquisition-discovery.ts");
  assert.match(source, /maxCredits:\s*50/);
  assert.match(source, /MAX_RESEARCHED_CANDIDATES_PER_RUN\s*=\s*3/);
  assert.match(source, /MAX_RESEARCH_CREDITS_PER_CANDIDATE\s*=\s*15/);
  assert.match(source, /MAX_CONTACTED_CANDIDATES_PER_RUN\s*=\s*1/);
  assert.match(source, /MAX_CONTACT_CREDITS_PER_CANDIDATE\s*=\s*5/);
});
