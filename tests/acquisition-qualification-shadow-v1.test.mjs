import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("acquisition qualification is deterministic, evidence-gated, and bounded", async () => {
  const source = await text("lib/acquisition-qualification.ts");

  assert.match(source, /ACQUISITION_QUALIFICATION_THRESHOLD\s*=\s*75/);
  for (const [dimension, max] of [
    ["buyerQuestionCommercialFit", 20],
    ["competitiveDensity", 15],
    ["interventionCapability", 15],
    ["aiDiscoveryUrgency", 15],
    ["evidenceSensitivity", 10],
    ["measurementFit", 10],
    ["budgetAuthorityPath", 10],
    ["thirtyDayActionability", 5],
  ]) {
    assert.match(source, new RegExp(`${dimension}:\\s*${max}`));
  }

  assert.match(source, /sourceCount\s*>\s*0/);
  assert.match(source, /Boolean\(whyNow\)/);
  assert.match(source, /disqualifiers\.length\s*===\s*0/);
  assert.match(source, /PUBLIC_EVIDENCE_PRESENT/);
  assert.match(source, /WHY_NOW_PRESENT/);
  assert.match(source, /DISQUALIFIED/);
});

test("shadow qualification does not send outreach or promote lifecycle truth", async () => {
  const source = await text("lib/acquisition-qualification.ts");

  assert.doesNotMatch(source, /resend|sendgrid|postmark|smtp|fetch\s*\(|email\.send|sequence.*enroll/i);
  assert.doesNotMatch(source, /design_partner|customer|commercial_accounts|company_organization_classifications/i);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\./i);
});
