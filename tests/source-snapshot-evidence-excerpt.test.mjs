import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("saved source observations retain a bounded readable evidence excerpt without archiving full pages", async () => {
  const [runtime, sourceMap, evidence] = await Promise.all([
    text("lib/source-snapshots.ts"),
    text("lib/source-map-generation.ts"),
    text("components/recommendation-source-evidence.tsx"),
  ]);

  assert.match(runtime, /MAX_SOURCE_EVIDENCE_EXCERPT_CHARS\s*=\s*4_000/);
  assert.match(runtime, /buildBoundedEvidenceExcerpt/);
  assert.match(runtime, /evidence_excerpt:\s*evidenceExcerpt/);
  assert.match(runtime, /evidenceExcerpt:\s*row\.evidence_excerpt/);
  assert.match(sourceMap, /buildBoundedEvidenceExcerpt/);
  assert.match(sourceMap, /evidenceExcerpt/);
  assert.match(evidence, /Historical evidence excerpt/);
  assert.match(evidence, /snapshot\.evidenceExcerpt/);
  assert.match(evidence, /not the full page/i);
});
