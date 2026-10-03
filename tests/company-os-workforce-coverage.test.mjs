import assert from "node:assert/strict";
import test from "node:test";

import { COMPANY_AGENT_SPECS } from "../lib/company-os/agents.ts";
import { COMPANY_SKILL_IDS } from "../lib/company-os/skills.ts";
import { COMPANY_WORKFLOWS } from "../lib/company-os/workflows.ts";
import {
  FUNDING_SOURCE_TYPES,
  FUNDING_AUTONOMY_RULES,
  CAPITAL_SUBSYSTEMS,
} from "../lib/company-os/funding.ts";

test("workforce covers core company brains and specialist capital agents", () => {
  const ids = new Set(COMPANY_AGENT_SPECS.map((a) => a.id));
  for (const id of [
    "chief_of_staff","product_brain","engineering_brain","security_brain",
    "sales_brain","customer_success_brain","capital_brain","finance_brain",
    "distribution_brain","resource_hunter_agent","evolution_brain",
    "enterprise_value_agent","accelerator_agent","fellowship_agent",
    "grant_agent","competition_agent","startup_credit_agent",
  ]) assert.ok(ids.has(id), id);
});

test("skill catalog covers engineering, funding, security, customer, distribution and evolution", () => {
  const ids = new Set(COMPANY_SKILL_IDS);
  for (const id of [
    "architecture-rfc","code-implementation","release-management",
    "accelerator-application","fellowship-application","grant-application",
    "competition-application","startup-credit-discovery","fundraising-outreach",
    "prompt-injection-scan","customer-success","social-scheduling",
    "resource-hunting","agent-evaluation","billion-dollar-scoreboard",
  ]) assert.ok(ids.has(id), id);
});

test("capital OS covers equity, non-dilutive, credits and debt classes", () => {
  for (const source of [
    "venture_capital","angel","accelerator","founder_fellowship",
    "startup_competition","government_grant","startup_credit",
    "cloud_credit","ai_credit","customer_funded_pilot","venture_debt",
  ]) assert.ok(FUNDING_SOURCE_TYPES.includes(source));
  assert.ok(CAPITAL_SUBSYSTEMS.length >= 20);
});

test("capital autonomy never allows binding finance or equity actions", () => {
  for (const action of [
    "sign_safe_or_term_sheet","issue_equity","change_cap_table",
    "accept_debt","move_funds","accept_binding_legal_terms",
  ]) assert.ok(FUNDING_AUTONOMY_RULES.neverAutonomous.includes(action));
});

test("critical company loops exist", () => {
  const ids = new Set(COMPANY_WORKFLOWS.map((w) => w.id));
  for (const id of [
    "company_constraint_loop","founder_decision_rounds","customer_activation_loop",
    "prospect_to_meeting","funding_radar_loop","grant_application",
    "investor_outreach_loop","resource_hunter_loop","oss_quarantine_pipeline",
    "engineering_change_pipeline","release_pipeline","security_incident_loop",
    "social_content_loop","world_radar_loop","agent_evolution_loop",
    "coverage_audit_loop","backup_restore_loop","enterprise_value_review",
  ]) assert.ok(ids.has(id), id);
});
