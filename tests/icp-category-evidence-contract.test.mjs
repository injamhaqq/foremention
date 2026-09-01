import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
async function text(path) {
  try { return await readFile(new URL(path, root), "utf8"); }
  catch { return ""; }
}

const [migration, state, icp, category, operations] = await Promise.all([
  text("supabase/migrations/20260901000100_icp_category_evidence.sql"),
  text("docs/company-evidence/AUTONOMOUS-EXECUTION-STATE.md"),
  text("docs/company-evidence/ICP-EVIDENCE.md"),
  text("docs/company-evidence/CATEGORY-EVIDENCE.md"),
  text("docs/company-evidence/RESEARCH-OPERATIONS.md"),
]);

test("market evidence migration repairs the commercial research event union", () => {
  assert.match(migration, /alter table public\.commercial_events/i);
  for (const kind of [
    "qualification_completed",
    "proposal_sent",
    "payment_verified",
    "customer_interview",
    "objection_recorded",
    "lost_deal_recorded",
    "feature_request_recorded",
    "use_case_validated",
    "referral_verified",
  ]) assert.match(migration, new RegExp(`'${kind}'`));
});

test("market evidence ledger is service-only and evidence-linked", () => {
  for (const table of [
    "market_research_interviews",
    "market_evidence_items",
    "market_confidence_assessments",
    "market_confidence_evidence_links",
    "market_experiments",
    "market_experiment_observations",
  ]) assert.match(migration, new RegExp(`public\\.${table}`));

  for (const state of ["no_evidence", "weak", "emerging", "moderate", "strong", "contradicted"]) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
  for (const dimension of [
    "icp_confidence",
    "problem_confidence",
    "buyer_confidence",
    "category_comprehension",
    "urgency",
    "willingness_to_trial",
    "willingness_to_pay",
    "activation",
    "repeat_usage",
    "retention",
    "expansion_potential",
  ]) assert.match(migration, new RegExp(`'${dimension}'`));

  assert.match(migration, /primary_evidence_item_id uuid references public\.market_evidence_items/i);
  assert.match(migration, /confidence_state = 'no_evidence'.*primary_evidence_item_id is null|primary_evidence_item_id is not null.*confidence_state <> 'no_evidence'/is);
  assert.match(migration, /revoke all[\s\S]+from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete[\s\S]+to service_role/i);
  assert.doesNotMatch(migration, /insert into public\.(market_|commercial_)/i);
});

test("structured evidence dimensions cover ICP, buyer language, commercial proof, and retention", () => {
  for (const dimension of [
    "company_size",
    "industry",
    "geography",
    "maturity",
    "team_structure",
    "current_workaround",
    "trigger_event",
    "champion_role",
    "economic_buyer_role",
    "budget_owner",
    "procurement_path",
    "problem_frequency",
    "consequence_of_inaction",
    "willingness_to_change",
    "willingness_to_pay",
    "category_unaided_language",
    "category_comprehension",
    "category_differentiation",
    "pilot_interest",
    "validated_use_case",
    "lost_reason",
    "payment",
    "renewal",
    "expansion",
    "churn",
    "second_cycle",
  ]) assert.match(migration, new RegExp(`'${dimension}'`));
});

test("durable evidence docs preserve hypothesis boundaries and continuation protocol", () => {
  assert.match(state, /2c306677e7e7b318c955d4ec81e99679129bf6c7/);
  assert.match(state, /PRODUCTION FACT/i);
  assert.match(state, /FIRST-PARTY CUSTOMER EVIDENCE/i);
  assert.match(state, /EXTERNAL BLOCKER/i);
  assert.match(state, /Recover Foremention reality from GitHub and production\. Do not trust this handoff until verified\./);

  assert.match(icp, /DEFINED[^\n]*NOT PROVEN/i);
  assert.match(icp, /CMO/);
  assert.match(icp, /VP Marketing/);
  assert.match(icp, /VP Growth/);
  assert.match(icp, /Head\/Director of SEO/);
  assert.match(icp, /Head\/Director Organic Growth/);
  assert.match(icp, /Product Marketing/);
  assert.match(icp, /ChatGPT\/manual checks/i);
  assert.match(icp, /NO EVIDENCE/);
  assert.match(icp, /KEEP/);
  assert.match(icp, /REFINE/);
  assert.match(icp, /PIVOT/);
  assert.match(icp, /KILL/);

  assert.match(category, /Recommendation Intelligence/);
  assert.match(category, /What would you expect a product called Recommendation Intelligence to do\?/);
  assert.match(category, /problem-first/i);
  assert.match(category, /outcome-first/i);
  assert.match(category, /competitive-intelligence/i);
  assert.match(category, /recommendation-evidence/i);
  assert.match(category, /insufficient sample/i);

  assert.match(operations, /Tell me about the last time/i);
  assert.match(operations, /What did you do\?/i);
  assert.match(operations, /Who approved spending\?/i);
  assert.match(operations, /Do not send/i);
  assert.match(operations, /target account/i);
  assert.match(operations, /objection taxonomy/i);
  assert.match(operations, /win\/loss taxonomy/i);
});
