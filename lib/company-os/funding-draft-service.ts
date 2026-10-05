import { prepareFundingDraft, type FundingDraftPack, type FundingDraftRequest, type FundingScalar } from "./funding-draft.ts";

export const FUNDING_SERVICE_INPUT_MAX_BYTES = 2 * 1024 * 1024;
export const FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS = 30;
export const FUNDING_COMPANY_EVIDENCE_MAX_AGE_DAYS = 365;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTIFIER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export type FundingServiceScope = { organizationId: string; projectId: string };
export type FundingServiceRequest = {
  schemaVersion: 1;
  programEvidenceIds: string[];
  opportunities: FundingDraftRequest["opportunities"];
};
export type FundingServiceEvidence = FundingDraftRequest["evidence"][number];
export type FundingServiceFact = FundingDraftRequest["facts"][number];

function invalid(field: string): never {
  throw new Error(`FUNDING_SERVICE_INVALID:${field}`);
}

function plainRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) invalid(field);
  return value as Record<string, unknown>;
}

export function parseFundingServiceRequest(value: unknown): FundingServiceRequest {
  const root = plainRecord(value, "request");
  const allowed = new Set(["schemaVersion", "programEvidenceIds", "opportunities"]);
  if (Object.keys(root).some((key) => !allowed.has(key))) invalid("request:unknown_property");
  if (root.schemaVersion !== 1) invalid("schemaVersion");
  if (!Array.isArray(root.programEvidenceIds) || root.programEvidenceIds.length < 1 || root.programEvidenceIds.length > 10) {
    invalid("programEvidenceIds");
  }
  const programEvidenceIds = root.programEvidenceIds.map((value, index) => {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) invalid(`programEvidenceIds.${index}`);
    return value.toLowerCase();
  });
  if (new Set(programEvidenceIds).size !== programEvidenceIds.length) invalid("programEvidenceIds:duplicate");
  if (!Array.isArray(root.opportunities) || root.opportunities.length < 1 || root.opportunities.length > 10) invalid("opportunities");
  const programEvidenceSet = new Set(programEvidenceIds);
  root.opportunities.forEach((value, index) => {
    const opportunity = plainRecord(value, `opportunities.${index}`);
    const sourceEvidenceId = opportunity.sourceEvidenceId;
    if (typeof sourceEvidenceId !== "string" || !UUID_PATTERN.test(sourceEvidenceId) || !programEvidenceSet.has(sourceEvidenceId.toLowerCase())) {
      invalid(`opportunities.${index}.sourceEvidenceId`);
    }
  });
  return { schemaVersion: 1, programEvidenceIds, opportunities: root.opportunities as FundingDraftRequest["opportunities"] };
}

export function configuredCompanyOsScope(env: NodeJS.ProcessEnv = process.env): FundingServiceScope | null {
  const organizationId = String(env.FOREMENTION_COMPANY_OS_ORGANIZATION_ID || "").trim().toLowerCase();
  const projectId = String(env.FOREMENTION_COMPANY_OS_PROJECT_ID || "").trim().toLowerCase();
  if (!UUID_PATTERN.test(organizationId) || !UUID_PATTERN.test(projectId)) return null;
  return { organizationId, projectId };
}

export function sameFundingServiceScope(left: FundingServiceScope, right: FundingServiceScope) {
  return left.organizationId.toLowerCase() === right.organizationId.toLowerCase()
    && left.projectId.toLowerCase() === right.projectId.toLowerCase();
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) invalid("digest:unsupported_value");
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

export async function fundingServiceDigest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  const result = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function deriveFundingProfileRevision(material: unknown): Promise<string> {
  return `company-truth-v1-${await fundingServiceDigest(material)}`;
}

export function fundingScalar(value: unknown): FundingScalar | undefined {
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && value.length <= 2000 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return value;
  return undefined;
}

export function validFundingFactKey(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120 && IDENTIFIER_PATTERN.test(value);
}

export function boundedEvidenceAgeDays(observedAt: string, expiresAt: string | null, cap: number): number {
  const observed = Date.parse(observedAt);
  const expires = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(observed)) invalid("evidence.observedAt");
  if (!Number.isFinite(expires)) return cap;
  const remaining = Math.ceil((expires - observed) / 86_400_000);
  return Math.max(1, Math.min(cap, remaining));
}

export async function prepareScopedFundingDraft(input: {
  serviceRequest: FundingServiceRequest;
  scope: FundingServiceScope;
  asOf: string;
  profileRevision: string;
  programEvidence: FundingServiceEvidence[];
  companyEvidence: FundingServiceEvidence[];
  companyFacts: FundingServiceFact[];
}): Promise<FundingDraftPack> {
  const evidenceById = new Map<string, FundingServiceEvidence>();
  for (const row of [...input.programEvidence, ...input.companyEvidence]) {
    if (!evidenceById.has(row.id)) evidenceById.set(row.id, row);
  }
  return prepareFundingDraft({
    schemaVersion: 1,
    organizationId: input.scope.organizationId,
    projectId: input.scope.projectId,
    asOf: input.asOf,
    profileRevision: input.profileRevision,
    evidence: [...evidenceById.values()],
    facts: input.companyFacts,
    opportunities: input.serviceRequest.opportunities,
  });
}
