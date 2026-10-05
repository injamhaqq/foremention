export type FundingSourceCheckRequest = {
  schemaVersion: 1;
  evidenceItemId: string;
};

export type FundingSourceReviewDecision = "accepted" | "rejected";

export type FundingSourceReviewRequest = {
  schemaVersion: 1;
  checkId: string;
  decision: FundingSourceReviewDecision;
  note: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const FUNDING_SOURCE_REVIEW_NOTE_MAX_CHARS = 1_000;

function invalid(field: string): never {
  throw new Error(`FUNDING_SOURCE_REVIEW_INVALID:${field}`);
}

function plainRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  return value as Record<string, unknown>;
}

function uuid(value: unknown, field: string) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) invalid(field);
  return value.toLowerCase();
}

function boundedNote(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") invalid("note");
  const note = value.trim();
  if (!note) return null;
  if (note.length > FUNDING_SOURCE_REVIEW_NOTE_MAX_CHARS || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note)) invalid("note");
  return note;
}

export function parseFundingSourceCheckRequest(value: unknown): FundingSourceCheckRequest {
  const root = plainRecord(value, "request");
  const allowed = new Set(["schemaVersion", "evidenceItemId"]);
  if (Object.keys(root).some((key) => !allowed.has(key))) invalid("request:unknown_property");
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  return {
    schemaVersion: 1,
    evidenceItemId: uuid(root.evidenceItemId, "evidenceItemId"),
  };
}

export function parseFundingSourceReviewRequest(value: unknown): FundingSourceReviewRequest {
  const root = plainRecord(value, "request");
  const allowed = new Set(["schemaVersion", "checkId", "decision", "note"]);
  if (Object.keys(root).some((key) => !allowed.has(key))) invalid("request:unknown_property");
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  if (root.decision !== "accepted" && root.decision !== "rejected") invalid("decision");
  return {
    schemaVersion: 1,
    checkId: uuid(root.checkId, "checkId"),
    decision: root.decision,
    note: boundedNote(root.note),
  };
}
