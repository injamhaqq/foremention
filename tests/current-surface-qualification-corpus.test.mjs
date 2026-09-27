import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const corpus = JSON.parse(await readFile(
  new URL("../docs/evidence/PROPOSED-CURRENT-SURFACE-20-QUESTION-CORPUS-2026-09-27.json", import.meta.url), "utf8",
));

test("qualification candidate corpus has twenty independent, explicitly versioned B2B questions", () => {
  assert.equal(corpus.questions.length, 20);
  assert.equal(new Set(corpus.questions.map(x => x.id)).size, 20);
  assert.equal(new Set(corpus.questions.map(x => x.question)).size, 20);
  assert.equal(new Set(corpus.questions.map(x => x.intent)).size, 20);
  assert.deepEqual(
    [...new Set(corpus.questions.map(x => x.persona))].sort(),
    ["marketing", "procurement", "product", "seo"],
  );
  assert.ok(corpus.questions.every(x => x.review_status === "proposed"));
  assert.equal(corpus.surface.question_version, "provider-qual-2026-09-27-v1");
  assert.equal(corpus.status, "proposed_not_human_approved");
});

test("provider surface is exact, visible and not conflated with consumer applications", () => {
  assert.equal(corpus.surface.provider, "cloudflare");
  assert.equal(corpus.surface.model, "@cf/google/gemma-4-26b-a4b-it");
  assert.match(corpus.surface.method, /independently retrieved Bing Search RSS/);
  assert.equal(corpus.surface.consumer_app_equivalent, false);
  assert.match(corpus.limitations.join(" "), /not direct monitoring of ChatGPT, Gemini or Perplexity/i);
  assert.equal(corpus.execution_guard.require_exact_release_sha, true);
  assert.equal(corpus.execution_guard.require_current_surface_identity, true);
});

test("pending qualification cannot trigger unapproved calls, invented source inspection or cost claims", () => {
  assert.equal(corpus.execution_guard.approved_for_live_calls, false);
  assert.equal(corpus.execution_guard.owner_approved_total_spend_ceiling_usd, null);
  assert.equal(corpus.execution_guard.max_parallel_live_calls, 1);
  assert.equal(corpus.execution_guard.never_run_on_the_exposed_synthetic_acceptance_credential, true);
  assert.equal(corpus.source_inspection_template.minimum_distinct_checked_source_urls, 10);
  assert.equal(corpus.source_inspection_template.status, "not_started");
  assert.equal(corpus.source_inspection_template.allow_fabricated_or_inferred_citation, false);
  for (const field of ["question_id", "run_receipt_id", "exact_build_sha", "returned_citation_url", "retrieved_url", "page_claim_support", "reviewer_id", "limitations"]) {
    assert.ok(corpus.source_inspection_template.required_fields.includes(field), field);
  }
  assert.match(corpus.limitations.join(" "), /has never been executed/);
});
