import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { configuredCompanyOsScope } from "@/lib/company-os/funding-draft-service";
import { parseFundingProgramRevisionRequest } from "@/lib/company-os/funding-program-registry";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, SupabaseRequestError, supabaseRest } from "@/lib/supabase-rest";

type FundingContext = { organizationId: string; projectId: string };
type FundingMembershipRole = "owner" | "admin" | "analyst" | "viewer";
type FundingMembershipRow = { role: FundingMembershipRole };
type FundingProjectRow = { id: string; organization_id: string; status: string };
type EvidenceRow = {
  id: string;
  evidence_type: string;
  source_url: string | null;
  verification_status: string;
  verified_at: string | null;
  expires_at: string | null;
  usage_rights: string | null;
};
type CheckRow = {
  id: string;
  evidence_item_id: string;
  source_id: string;
  source_snapshot_id: string;
  evidence_verified_at: string;
  checked_at: string;
};
type ReviewRow = { id: string; check_id: string; decision: string; decided_at: string };
type SourceRow = { id: string; canonical_url: string };
type SnapshotRow = {
  id: string;
  source_id: string;
  canonical_url: string;
  access: string;
  content_hash: string | null;
  evidence_excerpt: string | null;
};
type ProgramRevisionRow = {
  id: string;
  program_id: string;
  organization_id: string;
  project_id: string;
  evidence_item_id: string;
  source_check_id: string;
  source_review_id: string;
  supersedes_revision_id: string | null;
  name: string;
  kind: "grant" | "accelerator" | "fellowship" | "credit";
  deadline_at: string | null;
  criteria: unknown[];
  questions: unknown[];
  created_by: string;
  authority: unknown;
  created_at: string;
};

const INPUT_MAX_BYTES = 256 * 1024;
const MAX_LIST_ROWS = 200;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}
function writer(role: FundingMembershipRole | null): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}
async function boundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > INPUT_MAX_BYTES) throw new Error("FUNDING_PROGRAM_INVALID:request:too_large");
  if (!request.body) throw new Error("FUNDING_PROGRAM_INVALID:request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > INPUT_MAX_BYTES) {
      await reader.cancel();
      throw new Error("FUNDING_PROGRAM_INVALID:request:too_large");
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
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("FUNDING_PROGRAM_INVALID:request:json");
  }
}

async function resolveContext(): Promise<
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
  if (!configured) return { error: responseError("The Company OS organization/project scope is not configured.", 503) };

  const membershipsPath = "organization_members?select=role&organization_id=eq." + encodeURIComponent(configured.organizationId)
    + "&user_id=eq." + encodeURIComponent(viewer.id) + "&limit=1";
  const projectsPath = "projects?select=id,organization_id,status&id=eq." + encodeURIComponent(configured.projectId)
    + "&organization_id=eq." + encodeURIComponent(configured.organizationId) + "&status=eq.active&limit=1";
  const [memberships, projects] = await Promise.all([
    supabaseRest<FundingMembershipRow[]>(membershipsPath, { token: viewer.accessToken }),
    supabaseRest<FundingProjectRow[]>(projectsPath, { token: viewer.accessToken }),
  ]);
  const role = memberships[0]?.role || null;
  if (!writer(role)) return { error: responseError("Owner or admin access to the configured Company OS organization is required.", 403) };
  if (!projects[0]) return { error: responseError("The configured Company OS project is unavailable, inactive, or outside the authenticated organization.", 403) };
  return { viewer, context: configured, role };
}

function currentOfficialEvidence(row: EvidenceRow, asOf: string) {
  if (
    row.evidence_type.trim().toLowerCase() !== "funding_program_official"
    || row.verification_status !== "verified"
    || !row.source_url
    || !row.usage_rights?.trim()
    || !row.verified_at
  ) return false;
  const now = Date.parse(asOf);
  const verifiedAt = Date.parse(row.verified_at);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.POSITIVE_INFINITY;
  return Number.isFinite(verifiedAt) && verifiedAt <= now && expiresAt > now;
}

async function loadEvidence(viewer: Viewer, context: FundingContext, evidenceItemId: string) {
  const path = "evidence_items?select=id,evidence_type,source_url,verification_status,verified_at,expires_at,usage_rights"
    + "&id=eq." + encodeURIComponent(evidenceItemId)
    + "&organization_id=eq." + encodeURIComponent(context.organizationId)
    + "&project_id=eq." + encodeURIComponent(context.projectId) + "&limit=1";
  const rows = await supabaseRest<EvidenceRow[]>(path, { token: viewer.accessToken });
  return rows[0] || null;
}

async function validateReviewedChain(
  context: FundingContext,
  evidence: EvidenceRow,
  checkId: string,
  reviewId: string,
  asOf: string,
) {
  const checkPath = "company_funding_source_checks?select=id,evidence_item_id,source_id,source_snapshot_id,evidence_verified_at,checked_at"
    + "&id=eq." + encodeURIComponent(checkId)
    + "&organization_id=eq." + encodeURIComponent(context.organizationId)
    + "&project_id=eq." + encodeURIComponent(context.projectId) + "&limit=1";
  const checks = await supabaseRest<CheckRow[]>(checkPath, { serviceRole: true });
  const sourceCheck = checks[0];
  if (!sourceCheck || !evidence.verified_at || sourceCheck.evidence_item_id !== evidence.id || sourceCheck.evidence_verified_at !== evidence.verified_at) return null;

  const reviewPath = "company_funding_source_reviews?select=id,check_id,decision,decided_at"
    + "&id=eq." + encodeURIComponent(reviewId)
    + "&organization_id=eq." + encodeURIComponent(context.organizationId)
    + "&project_id=eq." + encodeURIComponent(context.projectId) + "&limit=1";
  const reviews = await supabaseRest<ReviewRow[]>(reviewPath, { serviceRole: true });
  const review = reviews[0];
  if (!review || review.check_id !== sourceCheck.id || review.decision !== "accepted") return null;

  const [sources, snapshots] = await Promise.all([
    supabaseRest<SourceRow[]>(
      "sources?select=id,canonical_url&id=eq." + encodeURIComponent(sourceCheck.source_id)
        + "&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { serviceRole: true },
    ),
    supabaseRest<SnapshotRow[]>(
      "source_snapshots?select=id,source_id,canonical_url,access,content_hash,evidence_excerpt&id=eq." + encodeURIComponent(sourceCheck.source_snapshot_id)
        + "&organization_id=eq." + encodeURIComponent(context.organizationId) + "&limit=1",
      { serviceRole: true },
    ),
  ]);
  const source = sources[0];
  const snapshot = snapshots[0];
  if (!source || !snapshot || !evidence.source_url) return null;

  const asOfMs = Date.parse(asOf);
  const checkedAtMs = Date.parse(sourceCheck.checked_at);
  const verifiedAtMs = Date.parse(evidence.verified_at);
  const decidedAtMs = Date.parse(review.decided_at);
  const timeValid = Number.isFinite(asOfMs)
    && Number.isFinite(checkedAtMs)
    && Number.isFinite(verifiedAtMs)
    && Number.isFinite(decidedAtMs)
    && checkedAtMs >= verifiedAtMs
    && checkedAtMs >= asOfMs - 30 * 86_400_000
    && checkedAtMs <= asOfMs
    && decidedAtMs >= checkedAtMs
    && decidedAtMs <= asOfMs;
  const snapshotValid = source.canonical_url === evidence.source_url
    && snapshot.source_id === source.id
    && snapshot.canonical_url === evidence.source_url
    && (snapshot.access === "open" || snapshot.access === "partial")
    && Boolean(snapshot.content_hash)
    && Boolean(snapshot.evidence_excerpt?.trim());

  return timeValid && snapshotValid ? { sourceCheck, review } : null;
}

function authority() {
  return { mode: "internal_registry_only", externalEffects: false, submissionAuthorized: false };
}

export async function GET() {
  const current = await resolveContext();
  if ("error" in current) return current.error;
  const { context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return responseError("Funding program registry is not configured.", 503);

  try {
    const path = "company_funding_program_revisions?select=id,program_id,organization_id,project_id,evidence_item_id,source_check_id,source_review_id,supersedes_revision_id,name,kind,deadline_at,criteria,questions,created_by,authority,created_at"
      + "&organization_id=eq." + encodeURIComponent(context.organizationId)
      + "&project_id=eq." + encodeURIComponent(context.projectId)
      + "&order=created_at.desc&limit=" + MAX_LIST_ROWS;
    const rows = await supabaseRest<ProgramRevisionRow[]>(path, { serviceRole: true });
    const superseded = new Set(rows.map((row) => row.supersedes_revision_id).filter((id): id is string => Boolean(id)));
    const currentRows = rows.filter((row) => !superseded.has(row.id));
    return NextResponse.json({ data: currentRows, mode: "internal_registry_only" }, {
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding program registry is waiting for its database migration.", 503);
    console.error("Funding program registry read failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Funding program registry is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return responseError("Funding program registry is not configured.", 503);

  try {
    const input = parseFundingProgramRevisionRequest(await boundedJson(request));
    const asOf = new Date().toISOString();
    const evidence = await loadEvidence(viewer, context, input.evidenceItemId);
    if (!evidence || !currentOfficialEvidence(evidence, asOf)) {
      return responseError("Funding program revisions require current verified same-project official evidence.", 409);
    }
    const chain = await validateReviewedChain(context, evidence, input.sourceCheckId, input.sourceReviewId, asOf);
    if (!chain) return responseError("Funding program revisions require the exact current accepted source review.", 409);

    const revisionId = crypto.randomUUID();
    let programId = revisionId;
    let supersedesRevisionId: string | null = null;
    if (input.supersedesRevisionId) {
      const priorPath = "company_funding_program_revisions?select=id,program_id,organization_id,project_id,evidence_item_id,source_check_id,source_review_id,supersedes_revision_id,name,kind,deadline_at,criteria,questions,created_by,authority,created_at"
        + "&id=eq." + encodeURIComponent(input.supersedesRevisionId)
        + "&organization_id=eq." + encodeURIComponent(context.organizationId)
        + "&project_id=eq." + encodeURIComponent(context.projectId) + "&limit=1";
      const priorRows = await supabaseRest<ProgramRevisionRow[]>(priorPath, { serviceRole: true });
      const prior = priorRows[0];
      if (!prior) return responseError("The funding program revision to supersede was not found in this project.", 409);

      const children = await supabaseRest<Array<{ id: string }>>(
        "company_funding_program_revisions?select=id&supersedes_revision_id=eq." + encodeURIComponent(prior.id)
          + "&organization_id=eq." + encodeURIComponent(context.organizationId)
          + "&project_id=eq." + encodeURIComponent(context.projectId) + "&limit=1",
        { serviceRole: true },
      );
      if (children[0]) return responseError("That funding program revision has already been superseded.", 409);
      programId = prior.program_id;
      supersedesRevisionId = prior.id;
    }

    const inserted = await supabaseRest<ProgramRevisionRow[]>(
      "company_funding_program_revisions?select=id,program_id,organization_id,project_id,evidence_item_id,source_check_id,source_review_id,supersedes_revision_id,name,kind,deadline_at,criteria,questions,created_by,authority,created_at",
      {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          id: revisionId,
          program_id: programId,
          organization_id: context.organizationId,
          project_id: context.projectId,
          evidence_item_id: input.evidenceItemId,
          source_check_id: input.sourceCheckId,
          source_review_id: input.sourceReviewId,
          supersedes_revision_id: supersedesRevisionId,
          name: input.name,
          kind: input.kind,
          deadline_at: input.deadlineAt,
          criteria: input.criteria,
          questions: input.questions,
          created_by: viewer.id,
          authority: authority(),
        },
      },
    );
    if (!inserted[0]) return responseError("The funding program revision could not be persisted.", 502);

    return NextResponse.json({
      data: inserted[0],
      warnings: [
        "This is an internal operator-confirmed program definition, not a funding submission.",
        "Corrections require a superseding revision; existing revisions remain immutable.",
      ],
    }, { status: 201, headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding program registry is waiting for its database migration.", 503);
    if (error instanceof Error && error.message.startsWith("FUNDING_PROGRAM_INVALID:")) {
      return responseError("The funding program revision request is invalid.", 400);
    }
    if (error instanceof SupabaseRequestError && (error.status === 409 || error.code === "23505" || error.code === "P0001")) {
      return responseError("The funding program revision conflicts with current registry or evidence state.", 409);
    }
    console.error("Funding program registry write failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding program revision could not be recorded.", 502);
  }
}
