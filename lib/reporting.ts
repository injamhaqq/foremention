export const REPORT_TYPES = [
  "recommendation_record",
  "weekly_operator_summary",
  "executive_digest",
  "monthly_review",
  "quarterly_business_review",
  "competitor_intelligence_brief",
  "action_outcome_report",
  "board_ready_summary",
  "agency_client_report",
] as const;

export type ReportType = typeof REPORT_TYPES[number];
export type ReportCadence = "manual" | "weekly" | "monthly" | "quarterly";

export type ReportMeasurementEnvironment = {
  source: string;
  schedule: string;
  methodology: string;
  locale: string;
  market: string;
};

export type ReportQuestion = { id: string; text: string };
export type ReportProviderModel = { provider: string; model: string | null };
export type ReportEvidenceState = {
  claimCount: number;
  citedClaimCount: number;
  unsupportedClaimCount: number;
  coveragePct: number;
};
export type ReportComparisonEligibility = { eligible: boolean; reason: string };
export type ReportUncertainty = { state: string; notes: string[] };
export type ReportCustomerReview = { required: boolean; state: string; reviewedAt: string | null };
export type ReportAction = { id: string; title: string; status: string; owner: string | null; dueAt: string | null };
export type ReportOutcome = {
  id: string;
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  limitation: string;
};
export type ReportCompetitor = { name: string; before: number | null; after: number | null; delta: number | null };

export type ReportSource = {
  recordId: string;
  measurementRunId: string | null;
  title: string;
  measuredAt: string;
  measurementEnvironment: ReportMeasurementEnvironment;
  questions: ReportQuestion[];
  providerModels: ReportProviderModel[];
  evidenceState: ReportEvidenceState;
  comparisonEligibility: ReportComparisonEligibility;
  uncertainty: ReportUncertainty;
  customerReview: ReportCustomerReview;
  summary: string;
  actions: ReportAction[];
  outcomes: ReportOutcome[];
  competitors: ReportCompetitor[];
};

export type ReportTruthEnvelope = {
  measurementEnvironments: ReportMeasurementEnvironment[];
  questions: ReportQuestion[];
  providerModels: ReportProviderModel[];
  evidenceStates: ReportEvidenceState[];
  comparisonEligibility: ReportComparisonEligibility[];
  uncertainty: ReportUncertainty[];
  customerReview: ReportCustomerReview[];
};

export type ReportSnapshot = {
  schemaVersion: "foremention.report_snapshot.v1";
  id: string;
  organizationId: string;
  projectId: string | null;
  type: ReportType;
  title: string;
  generatedAt: string;
  dataAsOf: string;
  periodStart: string | null;
  periodEnd: string | null;
  sourceRecordIds: string[];
  sourceRunIds: string[];
  sources: ReportSource[];
  truth: ReportTruthEnvelope;
  executiveSummary: string;
  causalityBoundary: string;
};

export type ReportVisualizationKind =
  | "longitudinal_change"
  | "competitive_difference"
  | "evidence_coverage"
  | "action_status"
  | "outcomes"
  | "risk_opportunity";

export type ReportVisualization = {
  kind: ReportVisualizationKind;
  title: string;
  description: string;
  table: { columns: string[]; rows: Array<Array<string | number>> };
};

const CAUSALITY_BOUNDARY = "Reported changes are observed associations. Foremention does not establish causation or claim that an action caused a provider, ranking, traffic, lead, pipeline, or revenue outcome.";

const uniqueBy = <T>(values: T[], key: (value: T) => string) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const identity = key(value);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

const validIso = (value: string | null | undefined) => Boolean(value && Number.isFinite(Date.parse(value)));
const finitePct = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;

export function buildReportSnapshot(input: {
  id: string;
  organizationId: string;
  projectId?: string | null;
  type: ReportType;
  title: string;
  generatedAt?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  sources: ReportSource[];
}): ReportSnapshot {
  if (!REPORT_TYPES.includes(input.type)) throw new Error("Unsupported report type.");
  if (!input.id.trim() || !input.organizationId.trim() || !input.title.trim()) throw new Error("Report id, organization and title are required.");
  const generatedAt = input.generatedAt || new Date().toISOString();
  if (!validIso(generatedAt)) throw new Error("Report generatedAt must be an ISO-compatible timestamp.");

  const sourceRecordIds = uniqueBy(input.sources.map((source) => source.recordId).filter(Boolean), (value) => value);
  const sourceRunIds = uniqueBy(input.sources.map((source) => source.measurementRunId).filter((value): value is string => Boolean(value)), (value) => value);
  const measured = input.sources.map((source) => source.measuredAt).filter(validIso).sort();
  const dataAsOf = measured.at(-1) || generatedAt;

  const questions = uniqueBy(input.sources.flatMap((source) => source.questions), (question) => `${question.id}\u0000${question.text}`);
  const providerModels = uniqueBy(input.sources.flatMap((source) => source.providerModels), (item) => `${item.provider}\u0000${item.model || ""}`);
  const measurementEnvironments = uniqueBy(input.sources.map((source) => source.measurementEnvironment), (item) => JSON.stringify(item));

  const reviewed = input.sources.filter((source) => source.customerReview.state === "reviewed").length;
  const comparable = input.sources.filter((source) => source.comparisonEligibility.eligible).length;
  const evidenceClaims = input.sources.reduce((sum, source) => sum + Math.max(0, source.evidenceState.claimCount || 0), 0);
  const citedClaims = input.sources.reduce((sum, source) => sum + Math.max(0, source.evidenceState.citedClaimCount || 0), 0);
  const evidencePhrase = evidenceClaims > 0 ? `${citedClaims} of ${evidenceClaims} recorded claims have returned citation evidence` : "No claim-level evidence coverage denominator is available";

  return {
    schemaVersion: "foremention.report_snapshot.v1",
    id: input.id,
    organizationId: input.organizationId,
    projectId: input.projectId || null,
    type: input.type,
    title: input.title.trim(),
    generatedAt,
    dataAsOf,
    periodStart: input.periodStart || null,
    periodEnd: input.periodEnd || null,
    sourceRecordIds,
    sourceRunIds,
    sources: input.sources,
    truth: {
      measurementEnvironments,
      questions,
      providerModels,
      evidenceStates: input.sources.map((source) => source.evidenceState),
      comparisonEligibility: input.sources.map((source) => source.comparisonEligibility),
      uncertainty: input.sources.map((source) => source.uncertainty),
      customerReview: input.sources.map((source) => source.customerReview),
    },
    executiveSummary: `${input.sources.length} source Recommendation Record${input.sources.length === 1 ? "" : "s"}; ${reviewed} customer-reviewed; ${comparable} comparison-eligible. ${evidencePhrase}.`,
    causalityBoundary: CAUSALITY_BOUNDARY,
  };
}

export function validateReportTruth(report: ReportSnapshot) {
  const issues: string[] = [];
  if (!REPORT_TYPES.includes(report.type)) issues.push("Unsupported report type.");
  if (!validIso(report.generatedAt)) issues.push("Generated timestamp is missing or invalid.");
  if (!validIso(report.dataAsOf)) issues.push("Data-as-of timestamp is missing or invalid.");
  if (!report.sourceRecordIds.length) issues.push("At least one source Recommendation Record is required.");
  if (!report.truth.measurementEnvironments.length) issues.push("Measurement environment is missing.");
  if (!report.truth.questions.length) issues.push("Buyer questions are missing.");
  if (!report.truth.providerModels.length) issues.push("Provider/model context is missing.");
  if (!report.truth.evidenceStates.length) issues.push("Evidence state is missing.");
  if (!report.truth.comparisonEligibility.length) issues.push("Comparison eligibility is missing.");
  if (!report.truth.uncertainty.length) issues.push("Uncertainty state is missing.");
  if (!report.truth.customerReview.length) issues.push("Customer review state is missing.");
  for (const evidence of report.truth.evidenceStates) if (!finitePct(evidence.coveragePct)) issues.push("Evidence coverage must be between 0 and 100.");
  for (const source of report.sources) {
    if (!validIso(source.measuredAt)) issues.push(`Source ${source.recordId} has an invalid measurement date.`);
    if (!source.comparisonEligibility.reason.trim()) issues.push(`Source ${source.recordId} is missing a comparison eligibility reason.`);
    if (!source.uncertainty.state.trim()) issues.push(`Source ${source.recordId} is missing an uncertainty state.`);
    for (const outcome of source.outcomes) if (!/caus|association|observed/i.test(outcome.limitation)) issues.push(`Outcome ${outcome.id} is missing an explicit causal limitation.`);
  }
  return uniqueBy(issues, (issue) => issue);
}

const metric = (value: number | null) => value === null || !Number.isFinite(value) ? "—" : value;

export function buildExecutiveVisualizations(report: ReportSnapshot): ReportVisualization[] {
  const longitudinalRows = report.sources
    .flatMap((source) => source.outcomes.map((outcome) => [source.measuredAt, outcome.label, metric(outcome.before), metric(outcome.after), metric(outcome.delta)] as Array<string | number>));
  const competitorRows = report.sources.flatMap((source) => source.competitors.map((item) => [item.name, metric(item.before), metric(item.after), metric(item.delta)] as Array<string | number>));
  const evidenceRows = report.sources.map((source) => [source.title, source.evidenceState.claimCount, source.evidenceState.citedClaimCount, source.evidenceState.unsupportedClaimCount, source.evidenceState.coveragePct]);
  const actionCounts = new Map<string, number>();
  for (const action of report.sources.flatMap((source) => source.actions)) actionCounts.set(action.status, (actionCounts.get(action.status) || 0) + 1);
  const actionRows = Array.from(actionCounts.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([status, count]) => [status, count]);
  const outcomeRows = report.sources.flatMap((source) => source.outcomes.map((outcome) => [outcome.label, metric(outcome.before), metric(outcome.after), metric(outcome.delta), outcome.limitation] as Array<string | number>));
  const riskRows = report.sources.map((source) => {
    const reviewRisk = source.customerReview.state === "reviewed" ? "reviewed" : "review required";
    const comparisonRisk = source.comparisonEligibility.eligible ? "comparable" : "comparison withheld";
    const evidenceRisk = source.evidenceState.unsupportedClaimCount > 0 ? `${source.evidenceState.unsupportedClaimCount} unsupported claim(s)` : "no unsupported claims recorded";
    return [source.title, reviewRisk, comparisonRisk, evidenceRisk, source.uncertainty.state];
  });

  return [
    { kind: "longitudinal_change", title: "Longitudinal changes", description: longitudinalRows.length ? "Observed before-and-after values across sourced records. These values do not establish causality." : "No validated before-and-after outcome values are available for this report.", table: { columns: ["Measured at", "Metric", "Before", "After", "Delta"], rows: longitudinalRows } },
    { kind: "competitive_difference", title: "Competitive differences", description: competitorRows.length ? "Comparable competitor observations from the report sources." : "No competitor delta data is available in the selected source records.", table: { columns: ["Competitor", "Before", "After", "Delta"], rows: competitorRows } },
    { kind: "evidence_coverage", title: "Evidence coverage", description: "Returned citation evidence coverage by Recommendation Record. Missing evidence remains visible rather than estimated.", table: { columns: ["Record", "Claims", "Cited", "Unsupported", "Coverage %"], rows: evidenceRows } },
    { kind: "action_status", title: "Action status", description: actionRows.length ? "Count of recorded actions by persisted status." : "No actions are attached to the selected records.", table: { columns: ["Status", "Actions"], rows: actionRows } },
    { kind: "outcomes", title: "Observed outcomes", description: outcomeRows.length ? "Recorded before-and-after observations with their causal limitations." : "No observed outcome comparisons are attached to the selected records.", table: { columns: ["Metric", "Before", "After", "Delta", "Limitation"], rows: outcomeRows } },
    { kind: "risk_opportunity", title: "Risk and opportunity review", description: "Evidence, review, comparability and uncertainty signals are shown directly instead of collapsed into an invented score.", table: { columns: ["Record", "Review", "Comparison", "Evidence", "Uncertainty"], rows: riskRows } },
  ];
}
