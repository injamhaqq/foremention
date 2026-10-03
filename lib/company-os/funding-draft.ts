export type FundingScalar = string | number | boolean | null;
type Evidence = { id: string; url: string; authority: "official" | "company_record"; observedAt: string; maxAgeDays: number };
type Fact = { key: string; value: FundingScalar; verification: "verified" | "unverified"; evidenceId: string };
type Criterion = { id: string; factKey: string; operator: "eq" | "in" | "gte" | "lte"; expected: Exclude<FundingScalar, null> | Exclude<FundingScalar, null>[] };
type Question = { id: string; prompt: string; factKey?: string; maxChars: number; required: boolean };
type Opportunity = { id: string; name: string; kind: "grant" | "accelerator" | "fellowship" | "credit"; sourceEvidenceId: string; deadlineAt: string | null; criteria: Criterion[]; questions: Question[] };
export type FundingDraftRequest = {
  schemaVersion: 1; organizationId: string; projectId: string; asOf: string; profileRevision: string;
  evidence: Evidence[]; facts: Fact[]; opportunities: Opportunity[];
};
type CriterionResult = { id: string; factKey: string; operator: Criterion["operator"]; expected: Criterion["expected"]; outcome: "pass" | "fail" | "unknown"; reason: string; evidenceId: string | null };
type Answer = { id: string; prompt: string; answer: string | null; evidenceId: string | null; reason: string | null };
export type FundingOpportunityDraft = {
  id: string; name: string; kind: Opportunity["kind"]; eligibility: "eligible" | "ineligible" | "unknown";
  readiness: "review_ready" | "blocked"; criteria: CriterionResult[]; answers: Answer[];
  blockers: string[]; sourceEvidenceId: string; deadlineAt: string | null; reviewDigest: string;
};
export type FundingDraftPack = {
  schemaVersion: 1; packageVersion: "0.1.0"; mode: "internal_draft_only";
  externalEffects: false; submissionAuthorized: false; requiresSubmissionApproval: true;
  organizationId: string; projectId: string; profileRevision: string; asOf: string;
  inputDigest: string; evidence: Evidence[]; facts: Fact[]; opportunities: FundingOpportunityDraft[];
};

function invalid(field: string): never { throw new Error("FUNDING_DRAFT_INVALID:" + field); }
function record(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !keys.includes(key))) invalid(field + ":unknown_property");
  return row;
}
function text(value: unknown, field: string, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(field);
  return value;
}
function identifier(value: unknown, field: string): string {
  const result = text(value, field, 120);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(result)) invalid(field);
  return result;
}
function uuid(value: unknown, field: string): string {
  const result = text(value, field, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) invalid(field);
  return result.toLowerCase();
}
function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid(field);
  return value;
}
function timestamp(value: unknown, field: string): string {
  const result = text(value, field, 40);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(result);
  if (!match) invalid(field);
  const [, y, m, d, h, minute, sec, zone] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate()
    || Number(h) > 23 || Number(minute) > 59 || Number(sec) > 59
    || (zone !== "Z" && (Number(zone.slice(1, 3)) > 14 || Number(zone.slice(4)) > 59 || (Number(zone.slice(1, 3)) === 14 && Number(zone.slice(4)) !== 0)))
    || !Number.isFinite(Date.parse(result))) invalid(field);
  return result;
}
function list<T>(value: unknown, field: string, max: number, parse: (value: unknown, field: string) => T): T[] {
  if (!Array.isArray(value) || value.length > max) invalid(field);
  return value.map((row, index) => parse(row, field + "." + index));
}
function unique(values: string[], field: string): void {
  if (new Set(values).size !== values.length) invalid(field + ":duplicate");
}
function scalar(value: unknown, field: string): FundingScalar {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return text(value, field, 2000);
  return invalid(field);
}
function evidenceUrl(value: unknown, field: string): string {
  const url = text(value, field, 2048);
  let parsed: URL;
  try { parsed = new URL(url); } catch { return invalid(field); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || !parsed.hostname.includes(".")
    || /^[\d.]+$/.test(parsed.hostname) || parsed.hostname.includes(":")
    || /(^|\.)(localhost|local|internal|intranet|lan|home|corp)$/.test(parsed.hostname)) invalid(field);
  return url;
}

/** Parses untrusted JSON shape, not authenticated access or independent source truth.
 * The caller must establish the declared scope and verified provenance. No URL is fetched here.
 */
export function parseFundingDraftRequest(value: unknown): FundingDraftRequest {
  const root = record(value, ["schemaVersion", "organizationId", "projectId", "asOf", "profileRevision", "evidence", "facts", "opportunities"], "request");
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  const asOf = timestamp(root.asOf, "asOf");
  const evidence = list(root.evidence, "evidence", 100, (value, field): Evidence => {
    const row = record(value, ["id", "url", "authority", "observedAt", "maxAgeDays"], field);
    if (row.authority !== "official" && row.authority !== "company_record") invalid(field + ".authority");
    const observedAt = timestamp(row.observedAt, field + ".observedAt");
    if (Date.parse(observedAt) > Date.parse(asOf)) invalid(field + ".future");
    return { id: identifier(row.id, field + ".id"), url: evidenceUrl(row.url, field + ".url"), authority: row.authority, observedAt, maxAgeDays: integer(row.maxAgeDays, field + ".maxAgeDays", 1, 365) };
  });
  unique(evidence.map((row) => row.id), "evidence");
  const evidenceIds = new Set(evidence.map((row) => row.id));
  const reference = (value: unknown, field: string): string => {
    const id = identifier(value, field);
    if (!evidenceIds.has(id)) invalid(field + ":missing_reference");
    return id;
  };
  const facts = list(root.facts, "facts", 100, (value, field): Fact => {
    const row = record(value, ["key", "value", "verification", "evidenceId"], field);
    if (row.verification !== "verified" && row.verification !== "unverified") invalid(field + ".verification");
    return { key: identifier(row.key, field + ".key"), value: scalar(row.value, field + ".value"), verification: row.verification, evidenceId: reference(row.evidenceId, field + ".evidenceId") };
  });
  unique(facts.map((row) => row.key), "facts");
  const opportunities = list(root.opportunities, "opportunities", 10, (value, field): Opportunity => {
    const row = record(value, ["id", "name", "kind", "sourceEvidenceId", "deadlineAt", "criteria", "questions"], field);
    if (!["grant", "accelerator", "fellowship", "credit"].includes(String(row.kind))) invalid(field + ".kind");
    const criteria = list(row.criteria, field + ".criteria", 30, (value, field): Criterion => {
      const criterion = record(value, ["id", "factKey", "operator", "expected"], field);
      const operator = criterion.operator;
      if (operator !== "eq" && operator !== "in" && operator !== "gte" && operator !== "lte") invalid(field + ".operator");
      const nonNull = (value: unknown, field: string): Exclude<FundingScalar, null> => {
        const result = scalar(value, field);
        return result === null ? invalid(field) : result;
      };
      const expected = operator === "in" ? list(criterion.expected, field + ".expected", 50, nonNull) : nonNull(criterion.expected, field + ".expected");
      if ((Array.isArray(expected) && !expected.length) || ((operator === "gte" || operator === "lte") && typeof expected !== "number")) invalid(field + ".expected");
      if (Array.isArray(expected) && new Set(expected.map((item) => typeof item)).size !== 1) invalid(field + ".mixed_types");
      return { id: identifier(criterion.id, field + ".id"), factKey: identifier(criterion.factKey, field + ".factKey"), operator, expected };
    });
    unique(criteria.map((criterion) => criterion.id), field + ".criteria");
    const questions = list(row.questions, field + ".questions", 30, (value, field): Question => {
      const question = record(value, ["id", "prompt", "factKey", "maxChars", "required"], field);
      if (typeof question.required !== "boolean") invalid(field + ".required");
      return { id: identifier(question.id, field + ".id"), prompt: text(question.prompt, field + ".prompt"), ...(question.factKey === undefined ? {} : { factKey: identifier(question.factKey, field + ".factKey") }), maxChars: integer(question.maxChars, field + ".maxChars", 1, 2000), required: question.required };
    });
    unique(questions.map((question) => question.id), field + ".questions");
    return { id: identifier(row.id, field + ".id"), name: text(row.name, field + ".name", 240), kind: row.kind as Opportunity["kind"], sourceEvidenceId: reference(row.sourceEvidenceId, field + ".sourceEvidenceId"), deadlineAt: row.deadlineAt === null ? null : timestamp(row.deadlineAt, field + ".deadlineAt"), criteria, questions };
  });
  unique(opportunities.map((row) => row.id), "opportunities");
  return { schemaVersion: 1, organizationId: uuid(root.organizationId, "organizationId"), projectId: uuid(root.projectId, "projectId"), asOf, profileRevision: identifier(root.profileRevision, "profileRevision"), evidence, facts, opportunities };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
}
async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  const result = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function fresh(row: Evidence, asOf: string): boolean {
  return Date.parse(asOf) - Date.parse(row.observedAt) <= row.maxAgeDays * 86400000;
}
function usableFact(key: string, request: FundingDraftRequest): { fact: Fact | null; reason: string | null } {
  const fact = request.facts.find((row) => row.key === key);
  if (!fact || fact.value === null) return { fact: null, reason: "missing_fact" };
  if (fact.verification !== "verified") return { fact: null, reason: "unverified_fact" };
  const evidence = request.evidence.find((row) => row.id === fact.evidenceId)!;
  if (!fresh(evidence, request.asOf)) return { fact: null, reason: "stale_fact" };
  return { fact, reason: null };
}
function qualify(criterion: Criterion, request: FundingDraftRequest): CriterionResult {
  const found = usableFact(criterion.factKey, request);
  const base = { id: criterion.id, factKey: criterion.factKey, operator: criterion.operator, expected: criterion.expected, evidenceId: found.fact?.evidenceId ?? null };
  if (!found.fact) return { ...base, outcome: "unknown", reason: found.reason! };
  const value = found.fact.value;
  const expectedType = typeof (Array.isArray(criterion.expected) ? criterion.expected[0] : criterion.expected);
  if (typeof value !== expectedType) return { ...base, outcome: "unknown", reason: "type_mismatch" };
  const matched = criterion.operator === "eq" ? value === criterion.expected
    : criterion.operator === "in" ? (criterion.expected as Exclude<FundingScalar, null>[]).some((expected) => expected === value)
    : criterion.operator === "gte" ? (value as number) >= (criterion.expected as number)
    : (value as number) <= (criterion.expected as number);
  return { ...base, outcome: matched ? "pass" : "fail", reason: matched ? "criterion_supported" : "criterion_not_met" };
}

/** Deterministic internal artifact preparation. Does not submit, contact, fetch,
 * invoke models, grant approvals, write the native ledger, or imply live eligibility.
 */
export async function prepareFundingDraft(value: unknown): Promise<FundingDraftPack> {
  const request = parseFundingDraftRequest(value);
  const inputDigest = await digest(request);
  const opportunities: FundingOpportunityDraft[] = [];
  for (const opportunity of request.opportunities) {
    const source = request.evidence.find((row) => row.id === opportunity.sourceEvidenceId)!;
    const sourceReady = source.authority === "official" && fresh(source, request.asOf);
    const criteria: CriterionResult[] = opportunity.criteria.map((criterion) => sourceReady ? qualify(criterion, request) : { id: criterion.id, factKey: criterion.factKey, operator: criterion.operator, expected: criterion.expected, outcome: "unknown", reason: "program_source_unverified_or_stale", evidenceId: null });
    const eligibility: FundingOpportunityDraft["eligibility"] = !sourceReady || !criteria.length ? "unknown"
      : criteria.some((row) => row.outcome === "fail") ? "ineligible"
      : criteria.some((row) => row.outcome === "unknown") ? "unknown" : "eligible";
    const blockers: string[] = [];
    if (!sourceReady) blockers.push("program_source_unverified_or_stale");
    if (!criteria.length) blockers.push("criteria_missing");
    if (eligibility === "ineligible") blockers.push("ineligible");
    for (const criterion of criteria) if (criterion.outcome === "unknown") blockers.push("criterion:" + criterion.id + ":" + criterion.reason);
    if (opportunity.deadlineAt === null) blockers.push("deadline_unverified");
    else if (Date.parse(opportunity.deadlineAt) <= Date.parse(request.asOf)) blockers.push("deadline_passed");
    const answers: Answer[] = opportunity.questions.map((question) => {
      const found = question.factKey ? usableFact(question.factKey, request) : { fact: null, reason: "manual_answer_required" };
      const answer = found.fact ? String(found.fact.value) : null;
      const reason = answer !== null && answer.length > question.maxChars ? "answer_too_long" : found.reason;
      if (reason && question.required) blockers.push("answer:" + question.id + ":" + reason);
      return { id: question.id, prompt: question.prompt, answer: reason ? null : answer, evidenceId: reason ? null : found.fact?.evidenceId ?? null, reason };
    });
    const draft = { id: opportunity.id, name: opportunity.name, kind: opportunity.kind, eligibility, readiness: blockers.length ? "blocked" as const : "review_ready" as const, criteria, answers, blockers, sourceEvidenceId: opportunity.sourceEvidenceId, deadlineAt: opportunity.deadlineAt };
    const reviewDigest = await digest({ packageVersion: "0.1.0", inputDigest, organizationId: request.organizationId, projectId: request.projectId, draft });
    opportunities.push({ ...draft, reviewDigest });
  }
  return { schemaVersion: 1, packageVersion: "0.1.0", mode: "internal_draft_only", externalEffects: false, submissionAuthorized: false, requiresSubmissionApproval: true, organizationId: request.organizationId, projectId: request.projectId, profileRevision: request.profileRevision, asOf: request.asOf, inputDigest, evidence: request.evidence, facts: request.facts, opportunities };
}
