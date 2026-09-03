import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const migrationPath = "supabase/migrations/20260902000200_next_best_design_partner_learning_v1.sql";

test("Next Best Company Change persists explainable immutable ordering without a composite score", async () => {
  const [sql, engine] = await Promise.all([
    text(migrationPath),
    text("lib/next-best-company-change.ts"),
  ]);

  for (const table of ["next_best_change_batches", "next_best_change_evaluations"]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /priority_band[^\n]*NOW[^\n]*NEXT[^\n]*WATCH[^\n]*BLOCKED[^\n]*INSUFFICIENT_EVIDENCE/i);
  assert.match(sql, /reason_codes_json/i);
  assert.match(sql, /factor_snapshot_json/i);
  assert.match(sql, /Next Best evaluation history is immutable/i);
  assert.doesNotMatch(sql, /\b(weighted_score|leadership_score|success_probability|win_probability|expected_lift|causal_effect)\b/i);

  assert.match(engine, /NEXT_BEST_PRIORITY_BANDS/);
  assert.match(engine, /NOW.*NEXT.*WATCH.*BLOCKED.*INSUFFICIENT_EVIDENCE/s);
  assert.match(engine, /reasonCodes/);
  assert.match(engine, /humanPriorityRank/);
  assert.match(engine, /unresolvedDependencies/);
  assert.match(engine, /STRUCTURALLY_INELIGIBLE/);
  assert.match(engine, /DO_NOT_DO/);
  assert.match(engine, /humanDecision:\s*candidate\.decisionState/i);
  assert.doesNotMatch(engine, /\bscore\b|probability|weighted/i);
  assert.doesNotMatch(engine, /decisionState:\s*(?:candidate|result)\./i);
});

test("Design-partner execution can start only from explicit verified external first-party evidence", async () => {
  const sql = await text(migrationPath);

  assert.match(sql, /create table public\.design_partner_execution_cycles/i);
  assert.match(sql, /alter table public\.design_partner_execution_cycles enable row level security/i);
  assert.match(sql, /classification\s+in\s*\('design_partner','customer'\)/i);
  assert.match(sql, /included_in_company_kpis\s*=\s*true/i);
  assert.match(sql, /commercial_accounts/i);
  assert.match(sql, /customer_organization_id\s*=\s*new\.organization_id/i);
  assert.match(sql, /Design-partner execution requires explicit external classification and commercial linkage/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.company_organization_classifications/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.commercial_accounts/i);
  assert.doesNotMatch(sql, /@foremention|acceptance-|demo partner/i);

  assert.match(sql, /create or replace view public\.design_partner_program_scorecard/i);
  assert.match(sql, /grant select on table public\.design_partner_program_scorecard to service_role/i);
  assert.match(sql, /revoke all on table public\.design_partner_program_scorecard from anon, authenticated/i);
});

test("Verification refinement is append-only, canonical, comparable-first, and never causal", async () => {
  const [sql, verifier] = await Promise.all([
    text(migrationPath),
    text("lib/change-verification.ts"),
  ]);

  assert.match(sql, /create table public\.change_verification_assessments/i);
  assert.match(sql, /alter table public\.change_verification_assessments enable row level security/i);
  assert.match(sql, /verification_state[^\n]*IMPROVED[^\n]*UNCHANGED[^\n]*WORSENED[^\n]*INSUFFICIENT_EVIDENCE/i);
  assert.match(sql, /causal_attribution[^\n]*not_claimed/i);
  assert.match(sql, /Change verification assessments are append-only/i);
  assert.match(sql, /create table public\.change_verification_cross_business_evidence/i);
  assert.match(sql, /verification_state\s*=\s*'verified'/i);

  assert.match(verifier, /IMPROVED/);
  assert.match(verifier, /UNCHANGED/);
  assert.match(verifier, /WORSENED/);
  assert.match(verifier, /INSUFFICIENT_EVIDENCE/);
  assert.match(verifier, /brandPresencePct/);
  assert.match(verifier, /firstMentionPct/);
  assert.match(verifier, /mixed_direction/i);
  assert.match(verifier, /causalAttribution:\s*"not_claimed"/i);
  assert.doesNotMatch(verifier, /caused|causalAttribution:\s*"(?:claimed|proven)"/i);
});

test("Learning summaries are descriptive only and require persisted assessment evidence", async () => {
  const sql = await text(migrationPath);
  assert.match(sql, /create or replace view public\.change_learning_summaries/i);
  assert.match(sql, /comparable_assessment_count/i);
  assert.match(sql, /improved_count/i);
  assert.match(sql, /unchanged_count/i);
  assert.match(sql, /worsened_count/i);
  assert.match(sql, /insufficient_evidence_count/i);
  assert.doesNotMatch(sql, /success_probability|win_probability|expected_lift|causal_effect/i);
});

test("Next Best API exposes the execution and learning loop without mutating company decisions", async () => {
  const [api, component, detailPage] = await Promise.all([
    text("app/api/next-best-change/route.ts"),
    text("components/next-best-change-context.tsx"),
    text("app/app/change-specifications/[id]/page.tsx"),
  ]);

  for (const action of [
    "evaluate_next_best_changes",
    "start_design_partner_cycle",
    "refresh_design_partner_cycle",
    "assess_change_verification",
  ]) assert.match(api, new RegExp(action));

  assert.match(api, /viewer\.mode\s*===\s*"demo"/);
  assert.match(api, /latest eligibility/i);
  assert.match(api, /verified cross-business/i);
  assert.doesNotMatch(api, /body:\s*\{[^}]*decision_state[^}]*\}/s);
  assert.doesNotMatch(api, /body:\s*\{[^}]*truth_state[^}]*\}/s);
  assert.doesNotMatch(api, /body:\s*\{[^}]*confidence_state[^}]*\}/s);
  assert.doesNotMatch(api, /body:\s*\{[^}]*priority_rank[^}]*\}/s);

  assert.match(component, /Next Best Company Change is an explainable ordering aid\. It does not approve a company change\./);
  assert.match(component, /Observed before-and-after association only\. This record does not establish that the applied change caused the result\./);
  assert.doesNotMatch(component, /0\s*[-–]\s*100|Leadership Score|Recommendation Engineering Score/i);
  assert.match(detailPage, /NextBestChangeContext/);
});
