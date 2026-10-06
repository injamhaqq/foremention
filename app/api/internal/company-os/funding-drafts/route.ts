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
import type { FundingDraftRequest } from "@/lib/company-os/funding-draft";
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
  program_source_check_ids: string[];
  program_source_review_ids: string[];
  program_revision_ids: string[];
  artifact: unknown;
  created_at: string;
};
type FundingSourceCheckRow = {
  id: string;
  evidence_item_id: string;
  source_id: string;
  source_snapshot_id: string;
  evidence_verified_at: string;
  checked_at: string;
};
type FundingSourceReviewRow = {
  id: string;
  check_id: string;
  decision: "accepted" | "rejected";
  decided_at: string;
};
type FundingSourceRow = { id: string; canonical_url: string };
type FundingSourceSnapshotRow = {
  id: string;
  source_id: string;
  canonical_url: string;
  access: string;
  content_hash: string | null;
  evidence_excerpt: string | null;
};
type FundingProgramRevisionRow = {
  id: string;
  program_id: string;
  evidence_item_id: string;
  source_check_id: string;
  source_review_id: string;
  supersedes_revision_id: string | null;
  name: string;
  kind: FundingDraftRequest["opportunities"][number]["kind"];
  deadline_at: string | null;
  criteria: FundingDraftRequest["opportunities"][number]["criteria"];
  questions: FundingDraftRequest["opportunities"][number]["questions"];
};
type ReviewedProgramRevision = {
  revisionId: string;
  programId: string;
  evidenceId: string;
  checkId: string;
  reviewId: string;
  checkedAt: string;
  opportunity: FundingDraftRequest["opportunities"][number];
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

function fundingEvidence(
  row: EvidenceRow,
  authority: FundingServiceEvidence["authority"],
  cap: number,
  checkedAt = row.verified_at as string,
): FundingServiceEvidence {
  return {
    id: row.id,
    url: row.source_url as string,
    authority,
    observedAt: checkedAt,
    maxAgeDays: boundedEvidenceAgeDays(checkedAt, row.expires_at, cap),
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
  try {
    const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
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

async function loadCurrentFundingProgramRevisions(
  viewer: Viewer,
  context: FundingContext,
  revisionIds: string[],
  asOf: string,
): Promise<ReviewedProgramRevision[] | null> {
  if (!revisionIds.length) return null;
  const revisionPath = "company_funding_program_revisions?select=id,program_id,evidence_item_id,source_check_id,source_review_id,supersedes_revision_id,name,kind,deadline_at,criteria,questions"
    + "&organization_id=eq." + encodeURIComponent(context.organizationId)
    + "&project_id=eq." + encodeURIComponent(context.projectId)
    + "&id=in.(" + revisionIds.join(",") + ")&limit=" + Math.min(100, revisionIds.length);
  const revisions = await supabaseRest<FundingProgramRevisionRow[]>(revisionPath, { serviceRole: true });
  if (revisions.length !== revisionIds.length) return null;

  const childRows = await supabaseRest<Array<{ id: string; supersedes_revision_id: string }>>(
    "company_funding_program_revisions?select=id,supersedes_revision_id"
      + "&organization_id=eq." + encodeURIComponent(context.organizationId)
      + "&project_id=eq." + encodeURIComponent(context.projectId)
      + "&supersedes_revision_id=in.(" + revisionIds.join(",") + ")&limit=100",
    { serviceRole: true },
  );
  if (childRows.length) return null;

  const revisionById = new Map(revisions.map((row) => [row.id, row]));
  const evidenceIds = Array.from(new Set(revisions.map((row) => row.evidence_item_id)));
  const evidenceRows = await loadEvidenceRows(viewer, context, evidenceIds);
  const evidenceById = new Map(evidenceRows.map((row) => [row.id, row]));
  if (evidenceById.size !== evidenceIds.length) return null;

  const checkIds = Array.from(new Set(revisions.map((row) => row.source_check_id)));
  const reviewIds = Array.from(new Set(revisions.map((row) => row.source_review_id)));
  const [checks, reviews] = await Promise.all([
    supabaseRest<FundingSourceCheckRow[]>(
      "company_funding_source_checks?select=id,evidence_item_id,source_id,source_snapshot_id,evidence_verified_at,checked_at"
        + "&organization_id=eq." + encodeURIComponent(context.organizationId)
        + "&project_id=eq." + encodeURIComponent(context.projectId)
        + "&id=in.(" + checkIds.join(",") + ")&limit=100",
      { serviceRole: true },
    ),
    supabaseRest<FundingSourceReviewRow[]>(
      "company_funding_source_reviews?select=id,check_id,decision,decided_at"
        + "&organization_id=eq." + encodeURIComponent(context.organizationId)
        + "&project_id=eq." + encodeURIComponent(context.projectId)
        + "&id=in.(" + reviewIds.join(",") + ")&limit=100",
      { serviceRole: true },
    ),
  ]);
  const checkById = new Map(checks.map((row) => [row.id, row]));
  const reviewById = new Map(reviews.map((row) => [row.id, row]));

  const sourceIds = Array.from(new Set(checks.map((row) => row.source_id)));
  const snapshotIds = Array.from(new Set(checks.map((row) => row.source_snapshot_id)));
  const [sources, snapshots] = await Promise.all([
    sourceIds.length
      ? supabaseRest<FundingSourceRow[]>(
        "sources?select=id,canonical_url&organization_id=eq." + encodeURIComponent(context.organizationId)
          + "&id=in.(" + sourceIds.join(",") + ")&limit=100",
        { serviceRole: true },
      )
      : Promise.resolve([]),
    snapshotIds.length
      ? supabaseRest<FundingSourceSnapshotRow[]>(
        "source_snapshots?select=id,source_id,canonical_url,access,content_hash,evidence_excerpt"
          + "&organization_id=eq." + encodeURIComponent(context.organizationId)
          + "&id=in.(" + snapshotIds.join(",") + ")&limit=100",
        { serviceRole: true },
      )
      : Promise.resolve([]),
  ]);
  const sourceById = new Map(sources.map((row) => [row.id, row]));
  const snapshotById = new Map(snapshots.map((row) => [row.id, row]));
  const asOfMs = Date.parse(asOf);
  const oldestAllowedMs = asOfMs - (FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS * 86_400_000);
  const result: ReviewedProgramRevision[] = [];

  for (const revisionId of revisionIds) {
    const revision = revisionById.get(revisionId);
    if (!revision) return null;
    const evidence = evidenceById.get(revision.evidence_item_id);
    const sourceCheck = checkById.get(revision.source_check_id);
    const review = reviewById.get(revision.source_review_id);
    if (!evidence || !sourceCheck || !review || !evidence.verified_at || !evidence.source_url) return null;
    if (evidence.evidence_type.trim().toLowerCase() !== "funding_program_official" || !currentEvidence(evidence, asOf)) return null;
    if (
      sourceCheck.evidence_item_id !== evidence.id
      || sourceCheck.evidence_verified_at !== evidence.verified_at
      || review.check_id !== sourceCheck.id
      || review.decision !== "accepted"
    ) return null;

    const source = sourceById.get(sourceCheck.source_id);
    const snapshot = snapshotById.get(sourceCheck.source_snapshot_id);
    if (!source || !snapshot) return null;

    const checkedAtMs = Date.parse(sourceCheck.checked_at);
    const verifiedAtMs = Date.parse(evidence.verified_at);
    const decidedAtMs = Date.parse(review.decided_at);
    const validTimes = Number.isFinite(checkedAtMs)
      && Number.isFinite(verifiedAtMs)
      && Number.isFinite(decidedAtMs)
      && checkedAtMs >= verifiedAtMs
      && checkedAtMs >= oldestAllowedMs
      && checkedAtMs <= asOfMs
      && decidedAtMs >= checkedAtMs
      && decidedAtMs <= asOfMs;
    const validSnapshot = source.canonical_url === evidence.source_url
      && snapshot.source_id === source.id
      && snapshot.canonical_url === evidence.source_url
      && (snapshot.access === "open" || snapshot.access === "partial")
      && Boolean(snapshot.content_hash)
      && Boolean(snapshot.evidence_excerpt?.trim());
    if (!validTimes || !validSnapshot) return null;

    result.push({
      revisionId: revision.id,
      programId: revision.program_id,
      evidenceId: evidence.id,
      checkId: sourceCheck.id,
      reviewId: review.id,
      checkedAt: sourceCheck.checked_at,
      opportunity: {
        id: revision.program_id,
        name: revision.name,
        kind: revision.kind,
        sourceEvidenceId: evidence.id,
        deadlineAt: revision.deadline_at,
        criteria: revision.criteria,
        questions: revision.questions,
      },
    });
  }
  return result;
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
  const { context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding draft persistence is not configured.", 503);
  }
  try {
    const rows = await supabaseRest<FundingArtifactRow[]>(
      `company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,program_source_check_ids,program_source_review_ids,artifact,created_at`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}`
        + `&order=created_at.desc&limit=20`,
      { serviceRole: true },
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
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding draft persistence is not configured.", 503);
  }
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
    const reviewedPrograms = await loadCurrentAcceptedFundingReviews(
      context,
      programById,
      serviceRequest.programEvidenceIds,
      asOf,
    );
    if (reviewedPrograms.size !== serviceRequest.programEvidenceIds.length) {
      return responseError("Every funding-program source requires a current accepted source review in the configured Company OS project.", 409);
    }
    const programEvidence = serviceRequest.programEvidenceIds.map((id) => {
      const reviewed = reviewedPrograms.get(id) as ReviewedProgramEvidence;
      return fundingEvidence(
        programById.get(id) as EvidenceRow,
        "official",
        FUNDING_PROGRAM_EVIDENCE_MAX_AGE_DAYS,
        reviewed.checkedAt,
      );
    });
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
      `company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,program_source_check_ids,program_source_review_ids,artifact,created_at`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}`
        + `&artifact_digest=eq.${artifactDigest}&limit=1`,
      { serviceRole: true },
    );
    const warnings = [
      ...(profile.profileFactCount ? [] : ["No current scalar Company Truth facts were available; affected criteria and answers remain unknown."]),
      "Program criteria, questions, and deadline fields remain operator-transcribed draft inputs; each official source is bound to a current accepted bounded source review.",
      "This artifact is internal_draft_only and grants no submission authority.",
    ];
    if (existing[0]) {
      return NextResponse.json({ data: existing[0], duplicate: true, warnings }, { headers: { "cache-control": "private, no-store, max-age=0" } });
    }
    const inserted = await supabaseRest<FundingArtifactRow[]>(
      "company_funding_draft_artifacts?select=id,profile_revision,input_digest,artifact_digest,program_source_check_ids,program_source_review_ids,artifact,created_at",
      {
        method: "POST",
        serviceRole: true,
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
          program_source_check_ids: serviceRequest.programEvidenceIds.map((id) => (reviewedPrograms.get(id) as ReviewedProgramEvidence).checkId),
          program_source_review_ids: serviceRequest.programEvidenceIds.map((id) => (reviewedPrograms.get(id) as ReviewedProgramEvidence).reviewId),
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
      return responseError("Company OS funding requires one unambiguous Company Truth company entity in the configured project.", 409);
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
