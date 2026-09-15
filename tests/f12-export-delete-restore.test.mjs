import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => access(new URL(path, root));

const canonicalEvidenceDecisionDatasets = [
  "answer_brand_mentions",
  "source_brand_mentions",
  "citation_observations",
  "source_snapshots",
  "source_routes",
  "source_contacts",
  "approvals",
  "record_shares",
  "measurement_schedules",
  "company_truth_entities",
  "company_truth_assertions",
  "change_specifications",
  "change_specification_evidence",
  "change_execution_assets",
  "resolution_assets",
  "resolution_asset_evidence",
  "resolution_follow_ups",
  "change_verification_assessments",
  "design_partner_execution_cycles",
  "cross_business_evidence",
  "change_specification_cross_business_evidence",
  "change_verification_cross_business_evidence",
  "next_best_change_batches",
  "next_best_change_evaluations",
  "outcome_ledger_events",
  "eligibility_requirements",
  "eligibility_evaluations",
  "indexing_checks",
];

test("full workspace export preserves the canonical evidence and decision graph", async () => {
  const exporter = await text("lib/workspace-export.ts");
  for (const dataset of canonicalEvidenceDecisionDatasets) {
    assert.match(exporter, new RegExp(`"${dataset}"`), `workspace export is missing ${dataset}`);
  }
  assert.match(exporter, /source_snapshot_observations/);
  assert.match(exporter, /source_snapshot_id\.asc,source_observation_id\.asc/);
});

test("workspace export uses current persisted composite keys", async () => {
  const exporter = await text("lib/workspace-export.ts");
  assert.match(exporter, /run_prompt_selections:\s*"run_id\.asc,prompt_key\.asc"/);
  assert.doesNotMatch(exporter, /run_prompt_selections:\s*"run_id\.asc,prompt_id\.asc"/);
});

test("disposable delete and documented restore are executable acceptance checks", async () => {
  const workflow = await text(".github/workflows/ci.yml");
  await exists("scripts/verify-workspace-export-delete-restore.sql");
  await exists("docs/WORKSPACE-EXPORT-RESTORE.md");
  assert.match(workflow, /verify-workspace-export-delete-restore\.sql/);
});
