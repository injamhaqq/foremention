import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const migrationPath = "supabase/migrations/20260902000100_decision_intelligence_v1.sql";

test("Decision Intelligence v1 keeps Company Truth, Eligibility, and Cross-business Evidence as separate tenant-safe domains", async () => {
  const sql = await text(migrationPath);

  for (const table of [
    "company_truth_entities",
    "company_truth_assertions",
    "eligibility_requirements",
    "eligibility_evaluations",
    "cross_business_evidence",
    "change_specification_cross_business_evidence",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }

  assert.doesNotMatch(sql, /insert\s+into\s+public\.company_truth_assertions\s+select/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.cross_business_evidence\s+select/i);
  assert.match(sql, /public\.is_org_member\(organization_id\)/i);
  assert.match(sql, /public\.has_org_role\(organization_id,[\s\S]*owner[\s\S]*admin/i);
});

test("Company Truth verification is evidence-backed, historical, and cannot be fabricated by typing", async () => {
  const [sql, domain] = await Promise.all([
    text(migrationPath),
    text("lib/company-truth.ts"),
  ]);

  assert.match(sql, /verification_state[^\n]*unverified[^\n]*verified[^\n]*rejected[^\n]*superseded[^\n]*expired/i);
  assert.match(sql, /verification_status\s*=\s*'verified'/i);
  assert.match(sql, /source_url\s+is\s+not\s+null/i);
  assert.match(sql, /nullif\(trim\(usage_rights\),\s*''\)\s+is\s+not\s+null/i);
  assert.match(sql, /new\.source_snapshot\s*:=\s*jsonb_build_object/i);
  assert.match(sql, /Company Truth verified assertion body is immutable/i);
  assert.match(sql, /unique[\s\S]*entity_id[\s\S]*attribute_key/i);

  assert.match(domain, /COMPANY_TRUTH_ENTITY_TYPES/);
  assert.match(domain, /COMPANY_TRUTH_VERIFICATION_STATES/);
  assert.match(domain, /isCurrentVerifiedTruth/);
  assert.match(domain, /selectCurrentVerifiedTruth/);
  assert.doesNotMatch(domain, /confidencePercent|probability|score\s*:/i);
});

test("Eligibility Engine v1 uses verified requirements plus verified truth and never chooses a company decision", async () => {
  const [sql, engine] = await Promise.all([
    text(migrationPath),
    text("lib/eligibility-engine.ts"),
  ]);

  assert.match(sql, /EXISTS.*EQUALS.*INCLUDES.*NOT_EQUALS/s);
  assert.match(sql, /REQUIRED.*SUPPORTING/s);
  assert.match(sql, /review_status[^\n]*draft[^\n]*verified[^\n]*rejected/i);
  assert.match(sql, /source_observation/i);
  assert.match(sql, /answer\.provider/i);
  assert.match(sql, /answer\.model/i);
  assert.match(sql, /answer\.prompt_text/i);
  assert.match(sql, /engine_version[^\n]*decision-intelligence-v1/i);

  assert.match(engine, /STRUCTURALLY_INELIGIBLE/);
  assert.match(engine, /PARTIALLY_ELIGIBLE/);
  assert.match(engine, /UNKNOWN/);
  assert.match(engine, /ELIGIBLE/);
  assert.match(engine, /MATCH.*MISMATCH.*UNKNOWN/s);
  assert.match(engine, /requiredMismatch/);
  assert.match(engine, /requiredUnknown/);
  assert.match(engine, /supportingGap/);
  assert.doesNotMatch(engine, /DO_NOW|DO_NOT_DO|decisionState|decision_state/);
  assert.doesNotMatch(engine, /\bscore\b|percentage|probability/i);
});

test("Cross-business Evidence v1 reuses explicitly linked first-party commercial records without exposing contact PII", async () => {
  const [sql, domain, api] = await Promise.all([
    text(migrationPath),
    text("lib/cross-business-evidence.ts"),
    text("app/api/decision-intelligence/route.ts"),
  ]);

  assert.match(sql, /sales_win_loss.*customer_interview.*support.*product_analytics.*feature_request.*churn_retention.*review.*pricing_commercial.*customer_success.*revenue/s);
  assert.match(sql, /change_specification_cross_business_evidence/i);
  assert.match(sql, /verification_state\s*=\s*'verified'/i);
  assert.match(sql, /Cross-business evidence links require verified evidence in the same workspace/i);

  assert.match(domain, /sanitizeCommercialEvidenceSnapshot/);
  assert.doesNotMatch(domain, /\bemail\b|full_name|job_title|message_body|phone/i);

  assert.match(api, /import_commercial_evidence/);
  assert.match(api, /customer_organization_id=eq\.\$\{encodeURIComponent\(context\.organizationId\)\}/);
  assert.doesNotMatch(api, /select=\*[^\n]*commercial_contacts/i);
});

test("Decision Intelligence API and Change Specification UI preserve the human approval boundary", async () => {
  const [api, changePage, contextUi] = await Promise.all([
    text("app/api/decision-intelligence/route.ts"),
    text("app/app/change-specifications/[id]/page.tsx"),
    text("components/decision-intelligence-context.tsx"),
  ]);

  for (const action of [
    "create_truth_entity",
    "create_truth_assertion",
    "verify_truth_assertion",
    "supersede_truth_assertion",
    "create_eligibility_requirement",
    "verify_eligibility_requirement",
    "evaluate_eligibility",
    "create_cross_business_evidence",
    "verify_cross_business_evidence",
    "link_cross_business_evidence",
    "import_commercial_evidence",
  ]) assert.match(api, new RegExp(action));

  assert.match(api, /viewer\.mode\s*===\s*"demo"/);
  assert.match(api, /eligibility_state/);
  assert.doesNotMatch(api, /body:\s*\{[^}]*decision_state[^}]*\}/s);
  assert.doesNotMatch(api, /body:\s*\{[^}]*truth_state[^}]*\}/s);
  assert.doesNotMatch(api, /body:\s*\{[^}]*confidence_state[^}]*\}/s);

  assert.match(changePage, /DecisionIntelligenceContext/);
  assert.match(changePage, /<DecisionIntelligenceContext changeSpecificationId=\{id\}/);
  assert.match(contextUi, /Decision intelligence informs human review\. It does not authorize a company change or prove causality\./);
  assert.doesNotMatch(contextUi, /Category Leadership Score|Recommendation Engineering Score|0–100/i);
});