import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildResolutionProposal } from "../lib/resolution-engine.ts";

const migration = new URL("../supabase/migrations/20260813163000_resolution_evidence_snapshot_provenance.sql", import.meta.url);

const problem = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "Reviewed source gap",
  nextAction: "Use a legitimate reviewed route.",
  sourceId: "00000000-0000-4000-8000-000000000020",
  sourceTitle: "Reviewed source",
  sourceUrl: "https://publisher.example/source",
};

const mutableQuestionSentinel = "MUTABLE CURRENT QUESTION MUST NOT ENTER THE DRAFT";
const evidence = [{
  id: "00000000-0000-4000-8000-000000000030",
  kind: "source_observation",
  title: "Reviewed source",
  url: "https://publisher.example/source",
  observedAt: "2026-08-13T00:00:00.000Z",
  provider: "groq",
  model: "groq/compound-mini",
  question: mutableQuestionSentinel,
  excerpt: "Reviewed answer excerpt.",
  runId: "00000000-0000-4000-8000-000000000040",
  verification: "verified",
}];

test("deterministic proposal text never copies a mutable question value supplied by the caller", () => {
  for (const type of ["comparison_brief", "faq_evidence_brief", "source_page_brief"]) {
    const generated = buildResolutionProposal({ type, problem, evidence });
    assert.doesNotMatch(JSON.stringify(generated), new RegExp(mutableQuestionSentinel));
    assert.match(generated.proposal.evidenceBoundary, /persisted historical observation/i);
  }
});

test("database canonicalizes source-observation evidence from the persisted run answer", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /answer\.prompt_text/);
  assert.match(sql, /answer\.provider/);
  assert.match(sql, /answer\.model/);
  assert.match(sql, /answer\.run_id/);
  assert.match(sql, /observation\.observed_at/);
  assert.match(sql, /'question', historical_question/);
  assert.match(sql, /'provider', answer_provider/);
  assert.match(sql, /'model', answer_model/);
  assert.match(sql, /'runId', answer_run_id/);
  assert.match(sql, /answer\.review_status = 'verified'/);
  assert.match(sql, /run\.project_id = asset\.project_id/);
});

test("database also canonicalizes verified evidence-item snapshots instead of trusting supplied JSON", async () => {
  const sql = await readFile(migration, "utf8");

  assert.match(sql, /from public\.evidence_items evidence/);
  assert.match(sql, /evidence\.verification_status = 'verified'/);
  assert.match(sql, /nullif\(trim\(evidence\.usage_rights\), ''\) is not null/);
  assert.match(sql, /'kind', 'evidence_item'/);
  assert.match(sql, /'title', item_title/);
  assert.match(sql, /'url', item_url/);
});
