/**
 * Scoped buyer decision packet formatting. This is not authorization:
 * callers must verify the project, human actor, source and comparison receipts
 * in the server loader. Do not pass client-supplied trusted fields.
 */
export type ReportOrigin = "synthetic_fixture" | "internal_test" | "workspace_unverified" | "external_customer";
export type ReportEvidence = {
  id: string; runId: string | null;
  reviewStatus: "verified" | "rejected" | "unreviewed";
  accessStatus: "open" | "partial" | "blocked" | "unknown";
  origin: "provider_citation" | "independent_retrieval" | "model_written_link" | "unknown";
};
export type ReportCollection = {
  id: string; organizationId: string; projectId: string;
  collectedAt: string; provider: string; model: string | null; method: string | null;
  reviewedAnswers: number; totalAnswers: number;
};
export type ReportDecision = {
  id: string; organizationId: string; projectId: string; baselineRunId: string;
  evidenceIds: string[];
  kind: "change_specification" | "no_action" | "reviewer_disagreement";
  disposition: "approved" | "rejected" | "deferred" | "no_change" | "pending_review" | "disagreement";
  decidedAt: string; reviewerRole: string; rationale: string;
  decisionState: "DO_NOW" | "TEST_FIRST" | "DO_NOT_DO" | "MONITOR_ONLY" | "INSUFFICIENT_EVIDENCE";
  changeSpecificationId?: string | null; ownerRole?: string | null;
  action?: string | null; dueDate?: string | null;
  successCriteria?: string | null; reversalCriteria?: string | null;
};
export type ReportFollowUp = ReportCollection & {
  comparison: { eligible: boolean; reasons: string[] };
  observation?: { label: string; baselineCount: number; laterCount: number; baselineTotal: number; laterTotal: number };
  customerReportedOutcome?: string | null;
};
export type DecisionReviewReportInput = {
  origin: ReportOrigin; generatedAt: string; organizationId: string; projectId: string;
  brand: string; questions: string[]; baseline: ReportCollection;
  evidence: ReportEvidence[]; decision: ReportDecision; followUp?: ReportFollowUp | null;
};

const validTime = (s: string) => Boolean(s) && Number.isFinite(Date.parse(s));
const validCount = (n: number, d: number) => Number.isInteger(n) && Number.isInteger(d) && d > 0 && n >= 0 && n <= d;
const safe = (s: string | null | undefined) => (s || "").replace(/[\u0000-\u001f\u007f]/g, " ")
  .replace(/\s+/g, " ").trim().slice(0, 2500)
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
  .replace(/\b(?:sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{16,})\b/gi, "[credential redacted]")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/[\\`*_{}\[\]()#+!|]/g, (c) => "\\" + c);
const stamp = (s: string) => new Date(s).toISOString();
const refuse = (reason: string): never => { throw new Error("Decision report unavailable: " + reason); };

/** Renders no raw answers, source URLs, secrets, internal actor IDs or economic ROI. */
export function buildPortableDecisionReviewMarkdown(input: DecisionReviewReportInput): string {
  if (!input.organizationId || !input.projectId || !input.brand.trim() || !validTime(input.generatedAt)) refuse("missing report scope");
  if (!Array.isArray(input.questions) || !input.questions.length || input.questions.length > 20 ||
      input.questions.some((q) => !q.trim())) refuse("approved question scope missing");
  const sameScope = (v: { organizationId: string; projectId: string }) =>
    v.organizationId === input.organizationId && v.projectId === input.projectId;
  if (!sameScope(input.baseline) || !sameScope(input.decision) || input.decision.baselineRunId !== input.baseline.id)
    refuse("broken or cross-project decision reference");
  if (!validTime(input.baseline.collectedAt) || !validTime(input.decision.decidedAt) ||
      !validCount(input.baseline.reviewedAnswers, input.baseline.totalAnswers)) refuse("baseline evidence count or chronology unavailable");
  if (Date.parse(input.decision.decidedAt) < Date.parse(input.baseline.collectedAt)) refuse("decision predates baseline collection");
  if (!["DO_NOW", "TEST_FIRST", "DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"].includes(input.decision.decisionState))
    refuse("canonical decision state missing");
  if (input.decision.kind === "no_action" &&
      !["DO_NOT_DO", "MONITOR_ONLY", "INSUFFICIENT_EVIDENCE"].includes(input.decision.decisionState))
    refuse("no-action decision cannot be actionable");
    const evidence = new Map(input.evidence.map((x) => [x.id, x]));
  if (evidence.size !== input.evidence.length) refuse("duplicate source identities");
  if (input.evidence.some((x) => x.runId && x.runId !== input.baseline.id)) refuse("source from unrelated Record");
  for (const id of input.decision.evidenceIds) {
    const item = evidence.get(id);
    if (!item || item.reviewStatus !== "verified" || !["open", "partial"].includes(item.accessStatus) ||
        item.origin === "model_written_link") refuse("unsupported/broken source reference");
  }
  // The persisted domain requires an owner/action/date for approved actionable
  // DO_NOW and TEST_FIRST decisions. Reversal criteria may be unrecorded and
  // must be labelled unknown, not treated as proof of an action or export denial.
  if (input.decision.kind === "change_specification" && input.decision.disposition === "approved" &&
      (!input.decision.changeSpecificationId || !input.decision.evidenceIds.length ||
       ((input.decision.decisionState === "DO_NOW" || input.decision.decisionState === "TEST_FIRST") &&
        (!input.decision.ownerRole || !input.decision.action || !input.decision.dueDate))))
    refuse("approved action incomplete");
  const next = input.followUp;
  if (next) {
    if (!sameScope(next) || next.id === input.baseline.id || !validTime(next.collectedAt) ||
        Date.parse(next.collectedAt) <= Date.parse(input.baseline.collectedAt) ||
        !validCount(next.reviewedAnswers, next.totalAnswers)) refuse("invalid follow-up scope/chronology/review");
    if (next.comparison.eligible && (!next.observation ||
        !validCount(next.observation.baselineCount, next.observation.baselineTotal) ||
        !validCount(next.observation.laterCount, next.observation.laterTotal) ||
        next.observation.baselineTotal !== input.baseline.totalAnswers ||
        next.observation.laterTotal !== next.totalAnswers)) refuse("eligible comparison missing trustworthy denominators");
  }
  const origin = input.origin === "synthetic_fixture" ? "SYNTHETIC FIXTURE — NOT A CUSTOMER" :
    input.origin === "internal_test" ? "INTERNAL TEST — NOT A CUSTOMER" :
    input.origin === "external_customer" ? "EXTERNAL CUSTOMER — REQUIRES SERVER-VERIFIED IDENTITY" :
    "PERSISTED WORKSPACE RECORD — EXTERNAL CUSTOMER STATUS UNVERIFIED";
  const lines: string[] = [
    "# Foremention · Human Decision and Follow-Up Review",
    "**Data classification:** " + origin,
    "**Generated UTC:** " + stamp(input.generatedAt),
    "**Brand:** " + safe(input.brand),
    "**Buyer questions (" + input.questions.length + "):**",
    ...input.questions.map((q, i) => (i + 1) + ". " + safe(q)),
    "## Baseline Recommendation Record",
    "**Collection UTC:** " + stamp(input.baseline.collectedAt),
    "**Observed provider / model / method:** " + safe(input.baseline.provider) + " / " + safe(input.baseline.model || "unknown") + " / " + safe(input.baseline.method || "unknown"),
    "**Human-reviewed answers:** " + input.baseline.reviewedAnswers + "/" + input.baseline.totalAnswers + " (not a population estimate)",
    "**Source references:** " + input.evidence.length + " (review, access and origin independently labelled)",
    ...input.evidence.map((x) => "- " + safe(x.id) + ": " + safe(x.origin) + "; access " + safe(x.accessStatus) + "; review " + safe(x.reviewStatus) +
      (x.runId ? "" : "; external Record linkage unverified")),
    "## Human Decision",
    "**Disposition:** " + safe(input.decision.kind) + " / " + safe(input.decision.disposition),
    "**Change Specification:** " + safe(input.decision.changeSpecificationId || "not linked"),
    "**Decision UTC / role:** " + stamp(input.decision.decidedAt) + " / " + safe(input.decision.reviewerRole || "unknown"),
    "**Basis:** " + (input.decision.evidenceIds.length ? input.decision.evidenceIds.map(safe).join(", ") : "none verified; no-action, deferral or disagreement remains possible"),
    "**Reason:** " + safe(input.decision.rationale),
    "**Owner / action / date:** " + safe(input.decision.ownerRole || "not assigned") + " / " +
      safe(input.decision.action || "no action") + " / " + safe(input.decision.dueDate || "not scheduled"),
    "**Success criteria:** " + safe(input.decision.successCriteria || "not recorded"),
    "**Reversal criteria:** " + safe(input.decision.reversalCriteria || "not recorded"),
    "## Later Review and Outcomes",
  ];
  if (!next) lines.push("No later reviewed cycle is attached. Comparison and customer outcome remain unknown.");
  else {
    lines.push("**Later collection UTC:** " + stamp(next.collectedAt));
    lines.push("**Later provider / model / method:** " + safe(next.provider) + " / " +
      safe(next.model || "unknown") + " / " + safe(next.method || "unknown"));
    lines.push("**Later reviewed answers:** " + next.reviewedAnswers + "/" + next.totalAnswers);
    lines.push("**Comparison:** " + (next.comparison.eligible ? "ELIGIBLE — verify canonical server receipt" : "WITHHELD — not comparable or not verified"));
    if (!next.comparison.eligible) lines.push("**Mismatch reasons:** " + (next.comparison.reasons.map(safe).join("; ") || "No eligible comparison receipt"));
    else if (next.observation) lines.push("**Observed only:** " + safe(next.observation.label) + " " +
      next.observation.baselineCount + "/" + next.observation.baselineTotal + " → " +
      next.observation.laterCount + "/" + next.observation.laterTotal);
    lines.push("**Customer-reported outcome (not verified causal proof):** " + safe(next.customerReportedOutcome || "unknown / not provided"));
  }
  lines.push("## Limits");
  lines.push("Measured movement is not causation or verified revenue. A returned hyperlink is not necessarily a native provider citation or independent support. Unknown is not zero. Model API observations do not prove consumer-app behavior.");
  lines.push("No raw answers, source page text, personally identifying actors, credentials, or direct source URLs are included. Server-side organization/project permission, canonical comparison validation, source freshness and retention/redaction rules are mandatory before export.");
  if (input.origin !== "external_customer") lines.push("**Not external activation, a verified paid pilot, a confirmed customer outcome, or a real customer second-cycle receipt.**");
  return lines.join("\n\n") + "\n";
}
