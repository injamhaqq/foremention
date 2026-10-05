import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import {
  canonicalFundingSourceUrl,
  evidenceVerificationStatus,
  FUNDING_SOURCE_INPUT_MAX_BYTES,
  fundingSourceStateAfterInspection,
  parseFundingSourceIntakeRequest,
  parseFundingSourceReviewRequest,
  type FundingProgramSourceState,
} from "@/lib/company-os/funding-source-service";
import { configuredCompanyOsScope } from "@/lib/company-os/funding-draft-service";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { inspectSourceUrl, SourceInspectionError } from "@/lib/source-inspection";
import { buildBoundedEvidenceExcerpt, persistSourceSnapshot } from "@/lib/source-snapshots";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

type FundingContext = { organizationId: string; projectId: string };
type FundingMembershipRole = "owner" | "admin" | "analyst" | "viewer";
type FundingMembershipRow = { role: FundingMembershipRole };
type FundingProjectRow = { id: string; organization_id: string; status: string };
type SourceRow = {
  id: string;
  canonical_url: string;
  source_type: string | null;
  page_title: string | null;
  crawler_access: string;
  crawler_checked_at: string | null;
  content_signature: string | null;
  content_length: number | null;
};
type EvidenceRow = {
  id: string;
  verification_status: string;
  verified_at: string | null;
  expires_at: string | null;
};
type ProgramSourceRow = {
  id: string;
  organization_id: string;
  project_id: string;
  source_id: string;
  source_snapshot_id: string;
  evidence_item_id: string;
  created_by: string;
  canonical_url: string;
  final_url: string;
  page_title: string | null;
  verification_state: FundingProgramSourceState;
  reviewed_by: string | null;
  reviewed_at: string | null;
  verified_at: string | null;
  last_observed_at: string;
  created_at: string;
  updated_at: string;
};
type SnapshotRow = {
  id: string;
  source_id: string;
  final_url: string;
  retrieved_at: string;
  access: "open" | "partial" | "blocked" | "unknown";
  change_state: "initial" | "unchanged" | "changed" | "unreachable" | "unknown";
  evidence_excerpt: string | null;
};

function responseError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "cache-control": "no-store", ...(headers || {}) } },
  );
}

function writer(role: FundingMembershipRole | null): role is "owner" | "admin" {
  return role === "owner" || role === "admin";
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

async function boundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > FUNDING_SOURCE_INPUT_MAX_BYTES) {
    throw new Error("FUNDING_SOURCE_INVALID:request:too_large");
  }
  if (!request.body) throw new Error("FUNDING_SOURCE_INVALID:request");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > FUNDING_SOURCE_INPUT_MAX_BYTES) {
      await reader.cancel();
      throw new Error("FUNDING_SOURCE_INVALID:request:too_large");
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
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error("FUNDING_SOURCE_INVALID:request:json");
  }
}

function evidenceCurrent(row: EvidenceRow | null, asOf: string) {
  if (!row || row.verification_status !== "verified" || !row.verified_at || !row.expires_at) return false;
  const now = Date.parse(asOf);
  const verifiedAt = Date.parse(row.verified_at);
  const expiresAt = Date.parse(row.expires_at);
  return Number.isFinite(now) && Number.isFinite(verifiedAt) && Number.isFinite(expiresAt)
    && verifiedAt <= now && expiresAt > now;
}

function fundingSourceTitle(label: string | null, pageTitle: string | null, finalUrl: string) {
  if (label) return label;
  if (pageTitle?.trim()) return pageTitle.trim().slice(0, 200);
  return new URL(finalUrl).hostname.slice(0, 200);
}

async function sourceByCanonicalUrl(organizationId: string, canonicalUrl: string) {
  const rows = await supabaseRest<SourceRow[]>(
    `sources?select=id,canonical_url,source_type,page_title,crawler_access,crawler_checked_at,content_signature,content_length&organization_id=eq.${encodeURIComponent(organizationId)}&canonical_url=eq.${encodeURIComponent(canonicalUrl)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function programSourceByUrl(context: FundingContext, canonicalUrl: string) {
  const rows = await supabaseRest<ProgramSourceRow[]>(
    `company_funding_program_sources?select=*&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&canonical_url=eq.${encodeURIComponent(canonicalUrl)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function programSourceById(context: FundingContext, id: string) {
  const rows = await supabaseRest<ProgramSourceRow[]>(
    `company_funding_program_sources?select=*&id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function snapshotById(context: FundingContext, id: string) {
  const rows = await supabaseRest<SnapshotRow[]>(
    `source_snapshots?select=id,source_id,final_url,retrieved_at,access,change_state,evidence_excerpt&id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

async function latestSnapshot(context: FundingContext, sourceId: string) {
  const rows = await supabaseRest<SnapshotRow[]>(
    `source_snapshots?select=id,source_id,final_url,retrieved_at,access,change_state,evidence_excerpt&organization_id=eq.${encodeURIComponent(context.organizationId)}&source_id=eq.${encodeURIComponent(sourceId)}&order=retrieved_at.desc,created_at.desc&limit=1`,
    { serviceRole: true },
  );
  return rows[0] || null;
}

export async function GET() {
  const current = await resolveFundingContext();
  if ("error" in current) return current.error;
  const { context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source persistence is not configured.", 503);
  }
  try {
    const rows = await supabaseRest<ProgramSourceRow[]>(
      `company_funding_program_sources?select=*&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&order=updated_at.desc&limit=50`,
      { serviceRole: true },
    );
    const snapshotIds = Array.from(new Set(rows.map((row) => row.source_snapshot_id)));
    const snapshots = snapshotIds.length
      ? await supabaseRest<SnapshotRow[]>(
          `source_snapshots?select=id,source_id,final_url,retrieved_at,access,change_state,evidence_excerpt&organization_id=eq.${encodeURIComponent(context.organizationId)}&id=in.(${snapshotIds.join(",")})`,
          { serviceRole: true },
        )
      : [];
    const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
    return NextResponse.json({
      data: rows.map((row) => ({ ...row, snapshot: byId.get(row.source_snapshot_id) || null })),
      mode: "internal_source_review_only",
    }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source intake is waiting for its database migration.", 503);
    console.error("Funding source list failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("Funding source records are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveFundingContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source persistence is not configured.", 503);
  }

  try {
    const input = parseFundingSourceIntakeRequest(await boundedJson(request));
    const recentWindow = encodeURIComponent(new Date(Date.now() - 60_000).toISOString());
    const recent = await supabaseRest<Array<{ id: string }>>(
      `audit_logs?select=id&organization_id=eq.${encodeURIComponent(context.organizationId)}&actor_id=eq.${encodeURIComponent(viewer.id)}&action=eq.funding.source.inspected&created_at=gte.${recentWindow}&limit=5`,
      { serviceRole: true },
    );
    if (recent.length >= 5) {
      return responseError("Please wait a minute before inspecting more funding sources.", 429, { "retry-after": "60" });
    }

    const inspection = await inspectSourceUrl(input.url, {
      includePageText: true,
      maxExtractedTextChars: 24_000,
      allowTruncatedBody: true,
    });
    const canonicalUrl = canonicalFundingSourceUrl(inspection.finalUrl);
    const domain = new URL(canonicalUrl).hostname.toLowerCase();
    const isReachable = inspection.access === "open" || inspection.access === "partial";
    let source = await sourceByCanonicalUrl(context.organizationId, canonicalUrl);

    if (!source) {
      const inserted = await supabaseRest<SourceRow[]>("sources?select=id,canonical_url,source_type,page_title,crawler_access,crawler_checked_at,content_signature,content_length", {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          canonical_url: canonicalUrl,
          domain,
          page_title: inspection.pageTitle,
          source_type: "funding_program_official",
          crawler_access: inspection.access,
          crawler_checked_at: inspection.checkedAt,
          last_observed_at: inspection.checkedAt,
          content_signature: inspection.contentSignature || null,
          content_length: inspection.contentLength ?? null,
          ...(isReachable ? { last_reachable_at: inspection.checkedAt } : {}),
        },
      });
      source = inserted[0] || null;
    } else {
      await supabaseRest(
        `sources?id=eq.${source.id}&organization_id=eq.${encodeURIComponent(context.organizationId)}`,
        {
          method: "PATCH",
          serviceRole: true,
          prefer: "return=minimal",
          body: {
            page_title: inspection.pageTitle || source.page_title,
            source_type: source.source_type || "funding_program_official",
            crawler_access: inspection.access,
            crawler_checked_at: inspection.checkedAt,
            last_observed_at: inspection.checkedAt,
            content_signature: inspection.contentSignature || source.content_signature,
            content_length: inspection.contentLength ?? source.content_length,
            ...(isReachable ? { last_reachable_at: inspection.checkedAt } : {}),
          },
        },
      );
    }
    if (!source) return responseError("The inspected funding source could not be registered.", 502);

    const snapshot = await persistSourceSnapshot({
      organizationId: context.organizationId,
      sourceId: source.id,
      canonicalUrl,
      inspection,
      evidenceExcerpt: inspection.pageText || null,
      createdBy: viewer.id,
      serviceRole: true,
    });

    const existing = await programSourceByUrl(context, canonicalUrl);
    const evidence = existing
      ? (await supabaseRest<EvidenceRow[]>(
          `evidence_items?select=id,verification_status,verified_at,expires_at&id=eq.${existing.evidence_item_id}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&limit=1`,
          { serviceRole: true },
        ))[0] || null
      : null;

    let nextState = fundingSourceStateAfterInspection({
      previousState: existing?.verification_state || null,
      changeState: snapshot.changeState,
      becameUnreachable: snapshot.becameUnreachable,
      materiallyChanged: snapshot.materiallyChanged,
    });
    if (nextState === "verified" && !evidenceCurrent(evidence, inspection.checkedAt)) nextState = "stale";

    const title = fundingSourceTitle(input.label, inspection.pageTitle, canonicalUrl);
    let record: ProgramSourceRow;

    if (!existing) {
      const evidenceRows = await supabaseRest<Array<{ id: string }>>("evidence_items?select=id", {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          evidence_type: "funding_program_official",
          title,
          source_url: canonicalUrl,
          owner_id: viewer.id,
          verification_status: "unverified",
          verified_at: null,
          expires_at: null,
          usage_rights: null,
        },
      });
      const evidenceId = evidenceRows[0]?.id;
      if (!evidenceId) return responseError("Funding source evidence could not be created.", 502);
      const programRows = await supabaseRest<ProgramSourceRow[]>("company_funding_program_sources?select=*", {
        method: "POST",
        serviceRole: true,
        prefer: "return=representation",
        body: {
          organization_id: context.organizationId,
          project_id: context.projectId,
          source_id: source.id,
          source_snapshot_id: snapshot.id,
          evidence_item_id: evidenceId,
          created_by: viewer.id,
          canonical_url: canonicalUrl,
          final_url: inspection.finalUrl,
          page_title: inspection.pageTitle,
          verification_state: "unverified",
          last_observed_at: inspection.checkedAt,
        },
      });
      record = programRows[0];
    } else {
      if (nextState !== existing.verification_state) {
        await supabaseRest(
          `evidence_items?id=eq.${encodeURIComponent(existing.evidence_item_id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}`,
          {
            method: "PATCH",
            serviceRole: true,
            prefer: "return=minimal",
            body: {
              verification_status: evidenceVerificationStatus(nextState),
              ...(nextState === "stale" ? { verified_at: null, expires_at: null } : {}),
            },
          },
        );
      }
      const programRows = await supabaseRest<ProgramSourceRow[]>(
        `company_funding_program_sources?id=eq.${encodeURIComponent(existing.id)}&organization_id=eq.${encodeURIComponent(context.organizationId)}&project_id=eq.${encodeURIComponent(context.projectId)}&select=*`,
        {
          method: "PATCH",
          serviceRole: true,
          prefer: "return=representation",
          body: {
            source_snapshot_id: snapshot.id,
            final_url: inspection.finalUrl,
            page_title: inspection.pageTitle || existing.page_title,
            verification_state: nextState,
            verified_at: nextState === "verified" ? existing.verified_at : null,
            last_observed_at: inspection.checkedAt,
            updated_at: inspection.checkedAt,
          },
        },
      );
      record = programRows[0];
    }

    if (!record) return responseError("The funding source review record could not be persisted.", 502);

    await supabaseRest("audit_logs", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        actor_id: viewer.id,
        action: "funding.source.inspected",
        entity_type: "company_funding_program_source",
        entity_id: record.id,
        before_state: existing
          ? { verification_state: existing.verification_state, source_snapshot_id: existing.source_snapshot_id }
          : null,
        after_state: {
          verification_state: record.verification_state,
          source_snapshot_id: record.source_snapshot_id,
          access: inspection.access,
          http_status: inspection.httpStatus,
          final_url: inspection.finalUrl,
          change_state: snapshot.changeState,
        },
      },
    });

    return NextResponse.json({
      data: {
        ...record,
        snapshot: {
          id: snapshot.id,
          access: inspection.access,
          checkedAt: inspection.checkedAt,
          finalUrl: inspection.finalUrl,
          pageTitle: inspection.pageTitle,
          changeState: snapshot.changeState,
          evidenceExcerpt: buildBoundedEvidenceExcerpt(inspection.pageText || ""),
        },
      },
      requiresVerification: record.verification_state !== "verified",
      mode: "internal_source_review_only",
    }, { status: existing ? 200 : 201, headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source intake is waiting for its database migration.", 503);
    if (error instanceof SourceInspectionError) return responseError(error.message, 400);
    if (error instanceof Error && error.message.startsWith("FUNDING_SOURCE_INVALID:")) {
      return responseError("The funding source request is invalid.", 400);
    }
    console.error("Funding source intake failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding source could not be inspected and recorded safely.", 502);
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return responseError("Invalid request origin.", 403);
  const current = await resolveFundingContext();
  if ("error" in current) return current.error;
  const { viewer, context } = current;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseError("Funding source persistence is not configured.", 503);
  }

  try {
    const review = parseFundingSourceReviewRequest(await boundedJson(request));
    const item = await programSourceById(context, review.id);
    if (!item) return responseError("Funding source record not found.", 404);

    if (review.decision === "verify") {
      const [snapshot, latest] = await Promise.all([
        snapshotById(context, item.source_snapshot_id),
        latestSnapshot(context, item.source_id),
      ]);
      if (!snapshot || !latest || latest.id !== snapshot.id) {
        return responseError("This funding source has a newer page observation. Review the latest snapshot before verification.", 409);
      }
      if (snapshot.access !== "open" && snapshot.access !== "partial") {
        return responseError("This funding source is not currently reachable for verification.", 409);
      }
      if (!snapshot.final_url.toLowerCase().startsWith("https://")) {
        return responseError("Verified funding sources must resolve to HTTPS.", 409);
      }
      if (Date.parse(snapshot.retrieved_at) < Date.now() - 30 * 86_400_000) {
        return responseError("This funding source observation is stale. Inspect the page again before verification.", 409);
      }
    }

    const rows = await supabaseRest<ProgramSourceRow[]>("rpc/review_company_funding_program_source", {
      method: "POST",
      serviceRole: true,
      body: {
        p_source_id: item.id,
        p_organization_id: context.organizationId,
        p_project_id: context.projectId,
        p_actor_id: viewer.id,
        p_decision: review.decision,
      },
    });
    const reviewed = rows[0];
    if (!reviewed) return responseError("The funding source review could not be recorded.", 502);

    await supabaseRest("audit_logs", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        organization_id: context.organizationId,
        actor_id: viewer.id,
        action: review.decision === "verify" ? "funding.source.verified" : "funding.source.rejected",
        entity_type: "company_funding_program_source",
        entity_id: item.id,
        before_state: { verification_state: item.verification_state, source_snapshot_id: item.source_snapshot_id },
        after_state: {
          verification_state: reviewed.verification_state,
          source_snapshot_id: reviewed.source_snapshot_id,
          official_source_confirmed: review.officialSourceConfirmed,
        },
      },
    });

    return NextResponse.json({
      data: reviewed,
      mode: "internal_source_review_only",
      externalEffects: false,
      submissionAuthorized: false,
    }, { headers: { "cache-control": "private, no-store, max-age=0" } });
  } catch (error) {
    if (isMissingRelationError(error)) return responseError("Funding source intake is waiting for its database migration.", 503);
    if (error instanceof Error && error.message.startsWith("FUNDING_SOURCE_INVALID:")) {
      return responseError("The funding source review request is invalid.", 400);
    }
    console.error("Funding source review failed.", { error: error instanceof Error ? error.message : String(error) });
    return responseError("The funding source review could not be completed.", 502);
  }
}
