import type { SourceSnapshotChangeState } from "@/lib/source-snapshots";

export const FUNDING_SOURCE_INPUT_MAX_BYTES = 8 * 1024;
export const FUNDING_SOURCE_MAX_AGE_DAYS = 30;
export const FUNDING_SOURCE_USAGE_RIGHTS = "public_web_internal_research";

export type FundingProgramSourceState = "unverified" | "verified" | "stale" | "rejected";

export type FundingSourceIntakeRequest = {
  schemaVersion: 1;
  url: string;
  label: string | null;
};

export type FundingSourceReviewRequest = {
  schemaVersion: 1;
  id: string;
  decision: "verify" | "reject";
  officialSourceConfirmed: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(field: string): never {
  throw new Error(`FUNDING_SOURCE_INVALID:${field}`);
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allow = new Set(allowed);
  for (const key of Object.keys(value)) if (!allow.has(key)) invalid(`unexpected:${key}`);
}

function cleanText(value: unknown, limit: number, field: string, required = false) {
  if (value === null || value === undefined || value === "") {
    if (required) invalid(field);
    return null;
  }
  if (typeof value !== "string") invalid(field);
  const cleaned = value.replace(/\s+/g, " ").trim();
  if ((!cleaned && required) || cleaned.length > limit || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleaned)) invalid(field);
  return cleaned || null;
}

export function parseFundingSourceIntakeRequest(value: unknown): FundingSourceIntakeRequest {
  const root = record(value, "request");
  exactKeys(root, ["schemaVersion", "url", "label"]);
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  const url = cleanText(root.url, 2048, "url", true) as string;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    invalid("url");
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) invalid("url");
  return {
    schemaVersion: 1,
    url: parsed.toString(),
    label: cleanText(root.label, 200, "label"),
  };
}

export function parseFundingSourceReviewRequest(value: unknown): FundingSourceReviewRequest {
  const root = record(value, "request");
  exactKeys(root, ["schemaVersion", "id", "decision", "officialSourceConfirmed"]);
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  if (typeof root.id !== "string" || !UUID_PATTERN.test(root.id)) invalid("id");
  if (root.decision !== "verify" && root.decision !== "reject") invalid("decision");
  if (typeof root.officialSourceConfirmed !== "boolean") invalid("officialSourceConfirmed");
  if (root.decision === "verify" && root.officialSourceConfirmed !== true) invalid("officialSourceConfirmed");
  return {
    schemaVersion: 1,
    id: root.id.toLowerCase(),
    decision: root.decision,
    officialSourceConfirmed: root.officialSourceConfirmed,
  };
}

export function canonicalFundingSourceUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
}

export function fundingSourceExpiresAt(observedAt: string, maxAgeDays = FUNDING_SOURCE_MAX_AGE_DAYS) {
  const timestamp = Date.parse(observedAt);
  if (!Number.isFinite(timestamp)) invalid("observedAt");
  return new Date(timestamp + Math.max(1, Math.min(90, maxAgeDays)) * 86_400_000).toISOString();
}

export function fundingSourceStateAfterInspection(input: {
  previousState: FundingProgramSourceState | null;
  changeState: SourceSnapshotChangeState;
  becameUnreachable: boolean;
  materiallyChanged: boolean;
}) {
  if (input.previousState === "rejected") return "rejected" as const;
  if (input.previousState === "verified") {
    if (input.becameUnreachable || input.materiallyChanged || input.changeState === "unknown") return "stale" as const;
    return "verified" as const;
  }
  return "unverified" as const;
}

export function evidenceVerificationStatus(state: FundingProgramSourceState) {
  if (state === "verified") return "verified" as const;
  if (state === "stale") return "expired" as const;
  if (state === "rejected") return "rejected" as const;
  return "unverified" as const;
}
