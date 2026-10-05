import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { configuredCompanyOsScope } from "@/lib/company-os/funding-draft-service";
import {
  parseFundingSourceCheckRequest,
  parseFundingSourceReviewRequest,
} from "@/lib/company-os/funding-source-review";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import {
  inspectSourceUrl,
  SourceInspectionError,
  validatePublicSourceUrl,
  type SourceInspectionResult,
} from "@/lib/source-inspection";
import { persistSourceSnapshot } from "@/lib/source-snapshots";
import {
  isMissingRelationError,
  SupabaseRequestError,
  supabaseRest,
} from "@/lib/supabase-rest";

type FundingContext = { organizationId: string; projectId: string };
type FundingMembershipRole = "owner" | "admin" | "analyst" | "viewer";
type FundingMembershipRow = { role: FundingMembershipRole };
type FundingProjectRow = { id: string; organization_id: string; status: string };
type FundingEvidenceRow = {
  id: string;
  evidence_type: string;
  title: string;
  source_url: string | null;
  verification_status: string;
  verified_at: string | null;
  expires_at: string | null;
  usage_rights: string | null;
};
type NativeSourceRow = {
  id: string;
  canonical_url: string;
  content_signature: string | null;
  content_length: number | null;
};
type FundingSourceCheckRow = {
  id: string;
  evidence_item_id: string;
  source_id: string;
  source_snapshot_id: string;
  evidence_verified_at: string;
  created_by: string;
  checked_at: string;
  authority: unknown;
  created_at: string;
};
type FundingSourceReviewRow = {
  id: string;
  check_id: string;
  decision: "accepted" | "rejected";
  decision_note: string | null;
  decided_by: string;
  decided_at: string;
  authority: unknown;
  created_at: string;
};

const INPUT_MAX_BYTES = 16_384;
const CHECK_RATE_LIMIT_PER_MINUTE = 5;

function responseError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

function writer(role: FundingMembershipRole | null): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
}

async function boundedJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > INPUT_MAX_BYTES) {
    throw new Error("FUNDING_SOURCE_REVIEW_INVALID:request:too_large");
  }
  if (!request.body) throw new Error("FUNDING_SOURCE_REVIEW_INVALID:request");
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
      throw new Error("FUNDING_SOURCE_REVIEW_INVALID:request:too_large");
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
    throw new Error("FUNDING_SOURCE_REVIEW_INVALID:request:json");
  }
}

async function resolveFundingSourceContext(): Promise<
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

function currentOfficialEvidence(row: FundingEvidenceRow, asOf: string) {
  if (
    row.evidence_type.trim().toLowerCase() !== "funding_program_official"
    || row.verification_status !== "verified"
    || !row.source_url
    || !row.usage_rights?.trim()
    || !row.verified_at
  ) return false;
  const checkedAt = Date.parse(asOf);
  const verifiedAt = Date.parse(row.verified_at);
  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : Number.POSITIVE_INFINITY;
  return Number.isFinite(verifiedAt) && verifiedAt <= checkedAt && expiresAt > checkedAt;
}

async function loadFundingEvidence(viewer: Viewer, context: FundingContext, evidenceItemId: string) {
  const rows = await supabaseRest<FundingEvidenceRow[]>(
    `evidence_items?select=id,evidence_type,title,source_url,verification_status,verified_at,expires_at,usage_rights`
      + `&id=eq.${encodeURIComponent(evidenceItemId)}`
      + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
      + `&project_id=eq.${encodeURIComponent(context.projectId)}&limit=1`,
    { token: viewer.accessToken },
  );
  return rows[0] || null;
}

async function ensureNativeSource(context: FundingContext, evidence: FundingEvidenceRow, safeUrl: URL) {
  const path = `sources?select=id,canonical_url,content_signature,content_length`
    + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
    + `&canonical_url=eq.${encodeURIComponent(evidence.source_url as string)}&limit=1`;
  const existing = await supabaseRest<NativeSourceRow[]>(path, { serviceRole: true });
  if (existing[0]) return existing[0];

  const inserted = await supabaseRest<NativeSourceRow[]>("sources?on_conflict=organization_id,canonical_url&select=id,canonical_url,content_signature,content_length", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=ignore-duplicates,return=representation",
    body: {
      organization_id: context.organizationId,
      canonical_url: evidence.source_url,
      domain: safeUrl.hostname.toLowerCase(),
      page_title: evidence.title,
      source_type: "funding_program_official",
      crawler_access: "unknown",
    },
  });
  if (inserted?.[0]) return inserted[0];

  const raced = await supabaseRest<NativeSourceRow[]>(path, { serviceRole: true });
  if (!raced[0]) throw new Error("FUNDING_SOURCE_REVIEW_SOURCE_NOT_PERSISTED");
  return raced[0];
}

async function enforceInspectionRateLimit(viewer: Viewer, context: FundingContext) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const recent = await supabaseRest<Array<{ id: string }>>(
    `company_funding_source_checks?select=id`
      + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
      + `&project_id=eq.${encodeURIComponent(context.projectId)}`
      + `&created_by=eq.${encodeURIComponent(viewer.id)}`
      + `&checked_at=gte.${encodeURIComponent(since)}&limit=${CHECK_RATE_LIMIT_PER_MINUTE}`,
    { serviceRole: true },
  );
  if (recent.length >= CHECK_RATE_LIMIT_PER_MINUTE) {
    throw new Error("FUNDING_SOURCE_REVIEW_RATE_LIMIT");
  }
}

async function updateNativeSourceAfterInspection(
  context: FundingContext,
  source: NativeSourceRow,
  inspection: SourceInspectionResult,
  materiallyChanged: boolean,
) {
  const reachable = inspection.access === "open" || inspection.access === "partial";
  await supabaseRest(
    `sources?id=eq.${encodeURIComponent(source.id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}`,
    {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        crawler_access: inspection.access,
        crawler_checked_at: inspection.checkedAt,
        content_signature: inspection.contentSignature || source.content_signature,
        content_length: inspection.contentLength ?? source.content_length,
        last_observed_at: inspection.checkedAt,
        ...(reachable ? { last_reachable_at: inspection.checkedAt } : {}),
        ...(materiallyChanged ? { last_content_change_at: inspection.checkedAt } : {}),
        ...(inspection.pageTitle ? { page_title: inspection.pageTitle } : {}),
      },
    },
  );
}

function internalAuthority() {
  return {
    mode: "internal_review_only",
    externalEffects: false,
    submissionAuthorized: false,
  };
}

export async function GET() {
  const current = await resolveFundingSourceContext();
  if ("error" in current) return current.error;
  const { context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source review persistence is not configured.", 503);
  }

  try {
    const checks = await supabaseRest<FundingSourceCheckRow[]>(
      `company_funding_source_checks?select=id,evidence_item_id,source_id,source_snapshot_id,evidence_verified_at,created_by,checked_at,authority,created_at`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}`
        + `&order=checked_at.desc&limit=30`,
      { serviceRole: true },
    );
    const ids = checks.map((row) => row.id);
    const reviews = ids.length
      ? await supabaseRest<FundingSourceReviewRow[]>(
        `company_funding_source_reviews?select=id,check_id,decision,decision_note,decided_by,decided_at,authority,created_at`
          + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
          + `&project_id=eq.${encodeURIComponent(context.projectId)}`
          + `&check_id=in.(${ids.join(",")})&order=decided_at.desc&limit=30`,
        { serviceRole: true },
      )
      : [];
    const reviewByCheck = new Map(reviews.map((row) => [row.check_id, row]));
    return NextResponse.json({
      data: checks.map((check) => ({ ...check, review: reviewByCheck.get(check.id) || null })),
      mode: "internal_review_only",
    }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source review persistence is waiting for its database migration.", 503);
    console.error("Funding source review read failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Funding source review receipts are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveFundingSourceContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source review persistence is not configured.", 503);
  }

  try {
    const input = parseFundingSourceCheckRequest(await boundedJson(request));
    const evidence = await loadFundingEvidence(viewer, context, input.evidenceItemId);
    const asOf = new Date().toISOString();
    if (!evidence || !currentOfficialEvidence(evidence, asOf)) {
      return responseError("The funding source must be current verified same-project official evidence with a source URL and usage rights.", 409);
    }

    const safeUrl = validatePublicSourceUrl(evidence.source_url as string);
    if (safeUrl.protocol !== "https:") {
      return responseError("Funding source review requires a public HTTPS source.", 409);
    }

    await enforceInspectionRateLimit(viewer, context);
    const source = await ensureNativeSource(context, evidence, safeUrl);
    const inspection = await inspectSourceUrl(evidence.source_url as string, {
      includePageText: true,
      maxExtractedTextChars: 24_000,
    });
    const snapshot = await persistSourceSnapshot({
      organizationId: context.organizationId,
      sourceId: source.id,
      canonicalUrl: evidence.source_url as string,
      inspection,
      evidenceExcerpt: inspection.pageText || null,
      createdBy: viewer.id,
      serviceRole: true,
    });

    await updateNativeSourceAfterInspection(context, source, inspection, snapshot.materiallyChanged);

    const inserted = await supabaseRest<FundingSourceCheckRow[]>(
      "company_funding_source_checks?select=id,evidence_item_id,source_id,source_snapshot_id,evidence_verified_at,created_by,checked_at,authority,created_at",
      {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          evidence_item_id: evidence.id,
          source_id: source.id,
          source_snapshot_id: snapshot.id,
          evidence_verified_at: evidence.verified_at,
          created_by: viewer.id,
          checked_at: inspection.checkedAt,
          authority: internalAuthority(),
        },
      },
    );
    if (!inserted[0]) return responseError("The funding source check could not be persisted.", 502);

    return NextResponse.json({
      data: inserted[0],
      source: {
        access: inspection.access,
        httpStatus: inspection.httpStatus,
        finalUrl: inspection.finalUrl,
        pageTitle: inspection.pageTitle,
        message: inspection.message,
        snapshotId: snapshot.id,
        changeState: snapshot.changeState,
        changeReason: snapshot.changeReason,
        materiallyChanged: snapshot.materiallyChanged,
      },
      warnings: [
        "This receipt records bounded source evidence only; it does not prove program eligibility.",
        "Human review is required before later Capital OS use.",
        "No submission authority is granted.",
      ],
    }, {
      status: 201,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source review persistence is waiting for its database migration.", 503);
    if (error instanceof SourceInspectionError) return responseError(error.message, 400);
    if (error instanceof Error && error.message === "FUNDING_SOURCE_REVIEW_RATE_LIMIT") {
      return responseError("Funding source inspection is temporarily rate limited.", 429);
    }
    if (error instanceof Error && error.message.startsWith("FUNDING_SOURCE_REVIEW_INVALID:")) {
      return responseError("The funding source review request is invalid.", 400);
    }
    if (error instanceof SupabaseRequestError && error.status === 409) {
      return responseError("That funding source observation already has a matching receipt.", 409);
    }
    console.error("Funding source inspection failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding source could not be inspected and recorded.", 502);
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveFundingSourceContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source review persistence is not configured.", 503);
  }

  try {
    const input = parseFundingSourceReviewRequest(await boundedJson(request));
    const checks = await supabaseRest<FundingSourceCheckRow[]>(
      `company_funding_source_checks?select=id,evidence_item_id,source_id,source_snapshot_id,evidence_verified_at,created_by,checked_at,authority,created_at`
        + `&id=eq.${encodeURIComponent(input.checkId)}`
        + `&organization_id=eq.${encodeURIComponent(context.organizationId)}`
        + `&project_id=eq.${encodeURIComponent(context.projectId)}&limit=1`,
      { serviceRole: true },
    );
    if (!checks[0]) return responseError("Funding source check not found in the configured Company OS project.", 404);

    if (input.decision === "accepted") {
      const snapshots = await supabaseRest<Array<{ id: string; access: string; content_hash: string | null; evidence_excerpt: string | null }>>(
        `source_snapshots?select=id,access,content_hash,evidence_excerpt&id=eq.${encodeURIComponent(checks[0].source_snapshot_id)}`
          + `&organization_id=eq.${encodeURIComponent(context.organizationId)}&limit=1`,
        { serviceRole: true },
      );
      const snapshot = snapshots[0];
      if (
        !snapshot
        || !["open", "partial"].includes(snapshot.access)
        || !snapshot.content_hash
        || !snapshot.evidence_excerpt?.trim()
      ) {
        return responseError("A blocked, unreachable, or unreviewable funding source observation cannot be accepted.", 409);
      }
    }

    const inserted = await supabaseRest<FundingSourceReviewRow[]>(
      "company_funding_source_reviews?select=id,check_id,decision,decision_note,decided_by,decided_at,authority,created_at",
      {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          check_id: input.checkId,
          decision: input.decision,
          decision_note: input.note,
          decided_by: viewer.id,
          decided_at: new Date().toISOString(),
          authority: internalAuthority(),
        },
      },
    );
    if (!inserted[0]) return responseError("The funding source review could not be persisted.", 502);
    return NextResponse.json({
      data: inserted[0],
      warnings: ["This review authorizes no funding submission, spend, or external action."],
    }, {
      status: 201,
      headers: { "cache-control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source review persistence is waiting for its database migration.", 503);
    if (error instanceof Error && error.message.startsWith("FUNDING_SOURCE_REVIEW_INVALID:")) {
      return responseError("The funding source review request is invalid.", 400);
    }
    if (error instanceof SupabaseRequestError && (error.status === 409 || error.code === "P0001" || error.code === "23505")) {
      return responseError("The funding source review conflicts with the current evidence state or already has a decision.", 409);
    }
    console.error("Funding source review decision failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding source review could not be recorded.", 502);
  }
}
