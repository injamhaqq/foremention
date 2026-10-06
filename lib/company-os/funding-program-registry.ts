import type { FundingDraftRequest, FundingScalar } from "./funding-draft.ts";

export type FundingProgramRevisionRequest = {
  schemaVersion: 1;
  evidenceItemId: string;
  sourceCheckId: string;
  sourceReviewId: string;
  supersedesRevisionId: string | null;
  name: string;
  kind: FundingDraftRequest["opportunities"][number]["kind"];
  deadlineAt: string | null;
  criteria: FundingDraftRequest["opportunities"][number]["criteria"];
  questions: FundingDraftRequest["opportunities"][number]["questions"];
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function invalid(field: string): never {
  throw new Error(`FUNDING_PROGRAM_INVALID:${field}`);
}
function record(value: unknown, allowed: readonly string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !allowed.includes(key))) invalid(field + ":unknown_property");
  return row;
}
function text(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(field);
  return value.trim();
}
function identifier(value: unknown, field: string): string {
  const result = text(value, field, 120);
  if (!IDENTIFIER_PATTERN.test(result)) invalid(field);
  return result;
}
function uuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) invalid(field);
  return value.toLowerCase();
}
function integer(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid(field);
  return value;
}
function timestamp(value: unknown, field: string): string {
  const result = text(value, field, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(result)
      || !Number.isFinite(Date.parse(result))) invalid(field);
  return result;
}
function scalar(value: unknown, field: string): Exclude<FundingScalar, null> {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return text(value, field, 2000);
  return invalid(field);
}

export function parseFundingProgramRevisionRequest(value: unknown): FundingProgramRevisionRequest {
  const root = record(value, [
    "schemaVersion", "evidenceItemId", "sourceCheckId", "sourceReviewId", "supersedesRevisionId",
    "name", "kind", "deadlineAt", "criteria", "questions",
  ], "request");
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  if (!["grant", "accelerator", "fellowship", "credit"].includes(String(root.kind))) invalid("kind");

  if (!Array.isArray(root.criteria) || root.criteria.length > 30) invalid("criteria");
  const criteria = root.criteria.map((value, index) => {
    const field = `criteria.${index}`;
    const row = record(value, ["id", "factKey", "operator", "expected"], field);
    const operator = row.operator;
    if (operator !== "eq" && operator !== "in" && operator !== "gte" && operator !== "lte") invalid(field + ".operator");
    let expected: Exclude<FundingScalar, null> | Exclude<FundingScalar, null>[];
    if (operator === "in") {
      if (!Array.isArray(row.expected) || !row.expected.length || row.expected.length > 50) invalid(field + ".expected");
      const values = row.expected.map((item, itemIndex) => scalar(item, `${field}.expected.${itemIndex}`));
      if (new Set(values.map((item) => typeof item)).size !== 1) invalid(field + ".expected:mixed_types");
      expected = values;
    } else {
      expected = scalar(row.expected, field + ".expected");
      if ((operator === "gte" || operator === "lte") && typeof expected !== "number") invalid(field + ".expected");
    }
    return { id: identifier(row.id, field + ".id"), factKey: identifier(row.factKey, field + ".factKey"), operator, expected };
  });
  if (new Set(criteria.map((row) => row.id)).size !== criteria.length) invalid("criteria:duplicate");

  if (!Array.isArray(root.questions) || root.questions.length > 30) invalid("questions");
  const questions = root.questions.map((value, index) => {
    const field = `questions.${index}`;
    const row = record(value, ["id", "prompt", "factKey", "maxChars", "required"], field);
    if (typeof row.required !== "boolean") invalid(field + ".required");
    return {
      id: identifier(row.id, field + ".id"),
      prompt: text(row.prompt, field + ".prompt", 2000),
      ...(row.factKey === undefined ? {} : { factKey: identifier(row.factKey, field + ".factKey") }),
      maxChars: integer(row.maxChars, field + ".maxChars", 1, 2000),
      required: row.required,
    };
  });
  if (new Set(questions.map((row) => row.id)).size !== questions.length) invalid("questions:duplicate");

  return {
    schemaVersion: 1,
    evidenceItemId: uuid(root.evidenceItemId, "evidenceItemId"),
    sourceCheckId: uuid(root.sourceCheckId, "sourceCheckId"),
    sourceReviewId: uuid(root.sourceReviewId, "sourceReviewId"),
    supersedesRevisionId: root.supersedesRevisionId === undefined || root.supersedesRevisionId === null
      ? null : uuid(root.supersedesRevisionId, "supersedesRevisionId"),
    name: text(root.name, "name", 240),
    kind: root.kind as FundingProgramRevisionRequest["kind"],
    deadlineAt: root.deadlineAt === null ? null : timestamp(root.deadlineAt, "deadlineAt"),
    criteria,
    questions,
  };
}
