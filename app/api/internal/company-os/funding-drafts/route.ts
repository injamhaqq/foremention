import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import {
  boundedEvidenceAgeDays,
  configuredCompanyOsScope,
  deriveFundingProfileRevision,
  FUNDING_COMPANY_EVIDENCE_MAX_AGE_DAYS,
  FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS,
  FUNDING_SERVICE_INPUT_MAX_BYTES,
  fundingScalar,
  fundingServiceDigest,
  parseFundingServiceRequest,
  prepareScopedFundingDraft,
  validFundingFactKey,
  type FundingServiceEvidence,
  type FundingServiceFact,
} from "@/lib/company-os/funding-draft-service";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";

type EvidenceRow = {
  id: string;
  evidence_type: string;
  source_url: string | null;
  verification_status: string;
  verified_at: string | null;
  expires_at: string | null;
  usage_rights: string | null;
};
type TruthEntityRow = { id: string; canonical_key: string };
type TruthAssertionRow = {
  id: string;
  attribute_key: string;
  asserted_value_json: unknown;
  evidence_item_id: string | null;
  verified_at: string | null;
};
type FundingArtifactRow = {
  id: string;
  profile_revision: string;
  input_digest: string;
  artifact_digest: string;
  artifact: unknown;
  created_at: string;
};
type FundingContext = { organizationId: string; projectId: string };
type FundingMembershipRole = "owner" | "admin" | "analyst" | "viewer";
type FundingMembershipRow = { role: FundingMembershipRole };
type FundingProjectRow = { id: string; organization_id: string; status: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function writer(role: FundingMembershipRole | null): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}

function currentEvidence(row: EvidenceRow, asOf: string) {
  const verified = row.verification_status === "verified" && Boolean(row.source_url && row.usage_rights?.trim() && row.verified_at);
  if (!verified) return false;
  const now = Date.parse(asOf);
  const verifiedAt = Date.parse(row.verified_at as string);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.POSITIVE_INFINITY;
  return Number.isFinite(verifiedAt) && verifiedAt <= now && expiresAt > now;
}

function fundingEvidence(row: EvidenceRow, authority: FundingServiceEvidence["authority"], cap: number): FundingServiceEvidence {
  return {
    id: row.id,
    url: row.source_url as string,
    authority,
    observedAt: row.verified_at as string,
    maxAgeDays: boundedEvidenceAgeDays(row.verified_at as string, row.expires_at, cap),
  };
}

async function boundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > FUNDING_SERVICE_INPUT_MAX_BYTES) {
    throw new Error("FUNDING_SERVICE_INVALID:request:too_large");
  }
  if (!request.body) throw new Error("FUNDING_SERVICE_INVALID:request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > FUNDING_SERVICE_INPUT_MAX_BYTES) {
      await reader.cancel();
      throw new Error("FUNDING_SERVICE_INVALID:request:too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const raw = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("FUNDING_SERVICE_INVALID:request:json");
  }
}

async function resolveFundingContext(): Promise<
  | { viewer: Viewer; context: FundingContext; role: "owner" | "admin" }
  | { error: NextResponse }
> {
  const viewer = await getViewer();
  if (!viewer || viewer.mode === "demo" || !viewer.accessToken) {
    return { error: responseError("Authenticated live workspace access is required.", 401) };
  }
  if (!isCompanyOperatorEmail(viewer.email)) {
    return { error: responseError("Company operator access is required.", 403) };
  }
  const configured = configuredCompanyOsScope();
  if (!configured) {
    return { error: responseError("The Company OS organization/project scope is not configured.", 503) };
  }

  const [memberships, projects] = await Promise.all([
    supabaseRest<FundingMembershipRow[]>(
      `organization_members?select=role&organization_id=eq.${encodeURIComponent(configured.organizationId)}&user_id=eq.${encodeURIComponent(viewer.id)}&limit=1`,
      { token: viewer.accessToken },
    ),
    supabaseRest<FundingProjectRow[]>(
      `projects?select=id,organization_id,status&id=eq.${encodeURIComponent(configured.projectId)}&organization_id=eq.${encodeURIComponent(configured.organizationId)}&status=eq.active&limit=1`,
      { token: viewer.accessToken },
    ),
  ]);
  const role = memberships[0]?.role || null;
  if (!writer(role)) {
    return { error: responseError("Owner or admin access to the configured Company OS organization is required.", 403) };
  }
  if (!projects[0]) {
    return { error: responseError("The configured Company OS project is unavailable, inactive, or outside the authenticated organization.", 403) };
  }
  return { viewer, context: configured, role };
}

async function loadEvidenceRows(viewer: Viewer, context: FundingContext, ids: string[]) {
  if (!ids.length) return [] as EvidenceRow[];
  return supabaseRest<EvidenceRow[]>(
    `evidence_items?select=id,evidence_type,source_url,verification_status,verified_at,expires_at,usage_rights`
      + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
      + `&project_id=eq.${encodeURIComponent(context.projectId)}`
      + `&id=in.(${ids.join(",")})&limit=${Math.min(100, ids.length)}`,
    { token: viewer.accessToken },
  );
}

async function loadCompanyTruth(viewer: Viewer, context: FundingContext, asOf: string) {
  const entities = await supabaseRest<TruthEntityRow[]>(
    `company_truth_entities?select=id,canonical_key`
      + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
      + `&project_id=eq.${encodeURIComponent(context.projectId)}`
      + `&entity_type=eq.company&order=created_at.asc&limit=2`,
    { token: viewer.accessToken },
  );
  if (entities.length > 1) throw new Error("FUNDING_SERVICE_PROFILE_AMBIGUOUS");
  if (!entities[0]) {
    return {
      facts: [] as FundingServiceFact[],
      evidence: [] as FundingServiceEvidence[],
      assertionIds: [] as string[],
      profileRevision: await deriveFundingProfileRevision([]),
      profileFactCount: 0,
    };
  }
  const assertions = await supabaseRest<TruthAssertionRow[]>(
    `company_truth_assertions?select=id,attribute_key,asserted_value_json,evidence_item_id,verified_at`
      + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
      + `&project_id=eq.${encodeURIComponent(context.projectId)}`
      + `&entity_id=eq.${encodeURIComponent(entities[0].id)}`
      + `&verification_state=eq.verified&superseded_at=is.null&order=attribute_key.asc&limit=100`,
    { token: viewer.accessToken },
  );
  const evidenceIds = Array.from(new Set(assertions.map((row) => row.evidence_item_id).filter((id): id is string => Boolean(id && uuid.test(id)))));
  const evidenceRows = await loadEvidenceRows(viewer, context, evidenceIds);
  const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));
  const facts: FundingServiceFact[] = [];
  const evidence = new Map<string, FundingServiceEvidence>();
  const assertionIds: string[] = [];
  const profileMaterial: Array<{
    id: string;
    attributeKey: string;
    assertedValue: unknown;
    evidenceItemId: string;
    verifiedAt: string | null;
  }> = [];
  for (const assertion of assertions) {
    const source = assertion.evidence_item_id ? evidenceById.get(assertion.evidence_item_id) : undefined;
    const scalar = fundingScalar(assertion.asserted_value_json);
    if (!source || !currentEvidence(source, asOf) || scalar === undefined || !validFundingFactKey(assertion.attribute_key)) continue;
    facts.push({
      key: assertion.attribute_key,
      value: scalar,
      verification: "verified",
      evidenceId: source.id,
    });
    assertionIds.push(assertion.id);
    profileMaterial.push({
      id: assertion.id,
      attributeKey: assertion.attribute_key,
      assertedValue: scalar,
      evidenceItemId: source.id,
      verifiedAt: assertion.verified_at,
    });
    evidence.set(source.id, fundingEvidence(source, "company_record", FUNDING_COMPANY_EVIDENCE_MAX_AGE_DAYS));
  }
  const profileRevision = await deriveFundingProfileRevision(profileMaterial);
  return {
    facts,
    evidence: [...evidence.values()],
    assertionIds,
    profileRevision,
    profileFactCount: facts.length,
  };
}

export async function GET() {
  const current = await resolveFundingContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  try {
    const rows = await supabaseRest<FundingArtifactRow[]>(
      `company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,artifact,created_at`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}`
        + `&order=created_at.desc&limit=20`,
      { token: viewer.accessToken },
    );
    return NextResponse.json({ data: rows, mode: "internal_draft_only" }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding draft persistence is waiting for its database migration.", 503);
    console.error("Funding draft read failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Funding draft artifacts are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveFundingContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  const asOf = new Date().toISOString();

  try {
    const serviceRequest = parseFundingServiceRequest(await boundedJson(request));
    const programRows = await loadEvidenceRows(viewer, context, serviceRequest.programEvidenceIds);
    const programById = new Map(programRows.map((row) => [row.id, row]));
    for (const evidenceId of serviceRequest.programEvidenceIds) {
      const row = programById.get(evidenceId);
      if (!row || row.evidence_type.trim().toLowerCase() !== "funding_program_official" || !currentEvidence(row, asOf)) {
        return responseError("Every funding-program source must be current verified same-project evidence of type funding_program_official with a source URL and usage rights.", 409);
      }
    }
    const programEvidence = serviceRequest.programEvidenceIds.map((id) =>
      fundingEvidence(programById.get(id) as EvidenceRow, "official", FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS),
    );
    const profile = await loadCompanyTruth(viewer, context, asOf);
    const draft = await prepareScopedFundingDraft({
      serviceRequest,
      scope: { organizationId: context.organizationId, projectId: context.projectId },
      asOf,
      profileRevision: profile.profileRevision,
      programEvidence,
      companyEvidence: profile.evidence,
      companyFacts: profile.facts,
    });
    const artifactDigest = await fundingServiceDigest(draft);
    const existing = await supabaseRest<FundingArtifactRow[]>(
      `company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,artifact,created_at`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}`
        + `&artifact_digest=eq.${artifactDigest}&limit=1`,
      { token: viewer.accessToken },
    );
    const warnings = [
      ...(profile.profileFactCount ? [] : ["No current scalar Company Truth facts were available; affected criteria and answers remain unknown."]),
      "Program criteria, questions, and deadline fields remain operator-transcribed draft inputs linked to verified official evidence; this service does not re-read the source page.",
      "This artifact is internal_draft_only and grants no submission authority.",
    ];
    if (existing[0]) {
      return NextResponse.json({ data: existing[0], duplicate: true, warnings }, { headers: { "cache-control": "private, no-store, max-age=0" } });
    }
    const inserted = await supabaseRest<FundingArtifactRow[]>(
      "company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,artifact,created_at",
      {
        method: "POST",
        token: viewer.accessToken,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          created_by: viewer.id,
          profile_revision: draft.profileRevision,
          package_version: draft.packageVersion,
          input_digest: draft.inputDigest,
          artifact_digest: artifactDigest,
          program_evidence_ids: serviceRequest.programEvidenceIds,
          company_truth_assertion_ids: profile.assertionIds,
          artifact: draft,
        },
      },
    );
    if (!inserted[0]) return responseError("The funding draft artifact could not be persisted.", 502);
    return NextResponse.json({ data: inserted[0], duplicate: false, warnings }, {
      status: 201,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding draft persistence is waiting for its database migration.", 503);
    if (error instanceof Error && error.message === "FUNDING_SERVICE_PROFILE_AMBIGUOUS") {
      return responseError("Company OS funding requires one unambiguous Company Truth company entity in the active project.", 409);
    }
    if (error instanceof Error && (error.message.startsWith("FUNDING_SERVICE_INVALID:") || error.message.startsWith("FUNDING_DRAFT_INVALID:"))) {
      return responseError("The funding draft request is invalid.", 400);
    }
    if (error instanceof SupabaseRequestError && error.status === 409) {
      return responseError("That funding draft revision conflicts with an existing artifact.", 409);
    }
    console.error("Funding draft creation failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding draft could not be prepared.", 400);
  }
}
