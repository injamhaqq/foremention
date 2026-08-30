import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  REPORT_TYPES,
  buildExecutiveVisualizations,
  buildReportSnapshot,
  validateReportTruth,
} from "../lib/reporting.ts";
import {
  exportReportCsv,
  exportReportEmail,
  exportReportHtml,
  exportReportJson,
  exportReportPdf,
  exportReportPresentation,
} from "../lib/report-export.ts";
import { computeNextReportRun, reportDeliveryReadiness } from "../lib/report-scheduling.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const sampleSource = {
  recordId: "record-1",
  measurementRunId: "run-1",
  title: "Recommendation Record 1",
  measuredAt: "2026-08-29T10:00:00.000Z",
  measurementEnvironment: {
    source: "live",
    schedule: "manual",
    methodology: "browser-search-v1",
    locale: "en-US",
    market: "US",
  },
  questions: [{ id: "q-1", text: "What is the best payroll software for a 100-person SaaS company?" }],
  providerModels: [{ provider: "groq", model: "openai/gpt-oss-120b" }],
  evidenceState: { claimCount: 4, citedClaimCount: 3, unsupportedClaimCount: 1, coveragePct: 75 },
  comparisonEligibility: { eligible: true, reason: "Exact reviewed environment matches baseline." },
  uncertainty: { state: "bounded", notes: ["One claim lacks returned citation evidence."] },
  customerReview: { required: true, state: "reviewed", reviewedAt: "2026-08-29T12:00:00.000Z" },
  summary: "One reviewed recommendation record with bounded uncertainty.",
  actions: [{ id: "action-1", title: "Improve pricing comparison page", status: "in_progress", owner: "Growth", dueAt: null }],
  outcomes: [{ id: "outcome-1", label: "Brand presence", before: 30, after: 40, delta: 10, limitation: "Observed association only; causality is not established." }],
  competitors: [{ name: "Example competitor", before: 50, after: 45, delta: -5 }],
};

const snapshot = buildReportSnapshot({
  id: "report-1",
  organizationId: "org-1",
  type: "executive_digest",
  title: "Executive digest",
  generatedAt: "2026-08-30T06:00:00.000Z",
  periodStart: "2026-08-23T00:00:00.000Z",
  periodEnd: "2026-08-30T00:00:00.000Z",
  sources: [sampleSource],
});

test("reporting exposes exactly the nine canonical report types", () => {
  assert.deepEqual(REPORT_TYPES, [
    "recommendation_record",
    "weekly_operator_summary",
    "executive_digest",
    "monthly_review",
    "quarterly_business_review",
    "competitor_intelligence_brief",
    "action_outcome_report",
    "board_ready_summary",
    "agency_client_report",
  ]);
});

test("every report snapshot preserves the canonical truth envelope and source traceability", () => {
  assert.equal(snapshot.schemaVersion, "foremention.report_snapshot.v1");
  assert.equal(snapshot.generatedAt, "2026-08-30T06:00:00.000Z");
  assert.deepEqual(snapshot.sourceRecordIds, ["record-1"]);
  assert.deepEqual(snapshot.sourceRunIds, ["run-1"]);
  assert.equal(snapshot.truth.measurementEnvironments.length, 1);
  assert.equal(snapshot.truth.questions[0].text, sampleSource.questions[0].text);
  assert.equal(snapshot.truth.providerModels[0].model, "openai/gpt-oss-120b");
  assert.equal(snapshot.truth.evidenceStates[0].unsupportedClaimCount, 1);
  assert.equal(snapshot.truth.comparisonEligibility[0].eligible, true);
  assert.equal(snapshot.truth.uncertainty[0].state, "bounded");
  assert.equal(snapshot.truth.customerReview[0].state, "reviewed");
  assert.deepEqual(validateReportTruth(snapshot), []);
  assert.match(snapshot.causalityBoundary, /does not establish causation/i);
});

test("executive visualizations are data-first, semantic, and include accessible tabular fallbacks", () => {
  const visuals = buildExecutiveVisualizations(snapshot);
  const kinds = new Set(visuals.map((visual) => visual.kind));
  for (const kind of ["longitudinal_change", "competitive_difference", "evidence_coverage", "action_status", "outcomes", "risk_opportunity"]) assert.ok(kinds.has(kind));
  for (const visual of visuals) {
    assert.ok(visual.title.length > 0);
    assert.ok(visual.description.length > 0);
    assert.ok(visual.table.columns.length > 0);
    assert.ok(visual.table.rows.length >= 0);
    assert.notEqual(visual.kind, "decorative");
  }
});

test("report exports are deterministic, traceable, print-ready, and email/presentation ready", () => {
  const json = exportReportJson(snapshot);
  assert.equal(JSON.parse(json).id, "report-1");

  const csv = exportReportCsv(snapshot);
  assert.match(csv, /report_id,report_type,generated_at,source_record_id,source_run_id/);
  assert.match(csv, /evidence_coverage_pct,comparison_eligible,uncertainty_state,customer_review_state/);

  const html = exportReportHtml(snapshot);
  assert.match(html, /<main[^>]+data-report-id="report-1"/);
  assert.match(html, /@media print/);
  assert.match(html, /<table/);
  assert.match(html, /<caption/);
  assert.doesNotMatch(html, /<canvas/i);

  const pdf = exportReportPdf(snapshot);
  assert.ok(Buffer.from(pdf).subarray(0, 8).toString("latin1").startsWith("%PDF-1."));
  assert.match(Buffer.from(pdf).toString("latin1"), /report-1/);

  const email = exportReportEmail(snapshot);
  assert.match(email.subject, /Executive digest/);
  assert.match(email.text, /observed/i);
  assert.doesNotMatch(email.text, /caused by/i);

  const presentation = exportReportPresentation(snapshot);
  assert.equal(presentation.schemaVersion, "foremention.presentation_ready.v1");
  assert.ok(presentation.slides.length >= 3);
});

test("scheduling supports safe cadences while external delivery stays gated by real provider configuration", () => {
  assert.equal(reportDeliveryReadiness({ enabled: false, provider: null, fromAddress: null }).ready, false);
  assert.equal(reportDeliveryReadiness({ enabled: true, provider: null, fromAddress: "reports@example.com" }).ready, false);
  assert.equal(reportDeliveryReadiness({ enabled: true, provider: "resend", fromAddress: "reports@example.com" }).ready, true);

  const base = new Date("2026-08-30T06:00:00.000Z");
  assert.equal(computeNextReportRun("weekly", base).toISOString(), "2026-09-06T06:00:00.000Z");
  assert.equal(computeNextReportRun("monthly", base).toISOString(), "2026-09-30T06:00:00.000Z");
  assert.equal(computeNextReportRun("quarterly", base).toISOString(), "2026-11-30T06:00:00.000Z");
  assert.equal(computeNextReportRun("manual", base), null);
});

test("reporting persistence, sharing, and delivery contracts enforce tenant security and auditable access", async () => {
  const migration = await text("supabase/migrations/20260830001300_reporting_executive_communication.sql");
  for (const relation of ["report_snapshots", "report_schedules", "report_recipients", "report_delivery_log", "report_shares", "report_share_access_log"]) assert.match(migration, new RegExp(`create table if not exists public\\.${relation}`));
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /is_org_member\(organization_id\)/);
  assert.match(migration, /unsubscribed_at timestamptz/);
  assert.match(migration, /source_record_ids uuid\[\]/);
  assert.match(migration, /source_run_ids uuid\[\]/);
  assert.match(migration, /integrity_sha256 text/);

  const sharing = await text("lib/report-sharing.ts");
  assert.match(sharing, /randomBytes\(32\)/);
  assert.match(sharing, /createHash\("sha256"\)/);
  assert.match(sharing, /report_share_access_log/);
  assert.doesNotMatch(sharing, /insert\([^)]*token:/s);

  const publicPage = await text("app/share/report/[token]/page.tsx");
  assert.match(publicPage, /index: false/);
  assert.match(publicPage, /nocache: true/);
  assert.match(publicPage, /Raw provider transcripts are not included/i);

  const exportRoute = await text("app/api/reports/[id]/export/route.ts");
  assert.match(exportRoute, /private, no-store/);
  assert.match(exportRoute, /X-Robots-Tag/);
  assert.match(exportRoute, /pdf/);
  assert.match(exportRoute, /presentation/);
});
