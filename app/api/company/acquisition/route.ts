import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { approveAcquisitionOutreachDraft } from "@/lib/acquisition-outreach-persistence";
import { sendApprovedAcquisitionOutreach } from "@/lib/acquisition-outreach-send";
import { getAcquisitionOutreachTransportStatus } from "@/lib/acquisition-outreach-transport";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

async function operatorViewer() {
  const viewer = await getViewer();
  if (!viewer || viewer.mode !== "supabase") return null;
  if (!isCompanyOperatorEmail(viewer.email)) return null;
  return viewer;
}

export async function GET() {
  const viewer = await operatorViewer();
  if (!viewer) return error("Company operator access required.", 403);

  const drafts = await supabaseRest<Array<{
    id: string;
    account_id: string;
    contact_id: string;
    research_run_id: string;
    subject: string;
    body: string;
    claim_sources: unknown;
    status: string;
    approved_at: string | null;
    sent_at: string | null;
    transport: string | null;
    external_reference: string | null;
    created_at: string;
    account: { company_name: string; domain: string | null } | null;
    contact: { full_name: string | null; job_title: string | null; email: string | null; contact_route_status: string } | null;
  }>>(
    "acquisition_outreach_drafts?select=id,account_id,contact_id,research_run_id,subject,body,claim_sources,status,approved_at,sent_at,transport,external_reference,created_at,account:commercial_accounts(company_name,domain),contact:commercial_contacts(full_name,job_title,email,contact_route_status)&status=in.(draft,approved)&order=created_at.asc&limit=50",
    { serviceRole: true },
  );

  return NextResponse.json(
    {
      data: drafts,
      transport: getAcquisitionOutreachTransportStatus(),
      policy: {
        approvalRequired: true,
        approvalAndSendSeparated: true,
        autoSend: false,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return error("Untrusted mutation origin.", 403);
  const viewer = await operatorViewer();
  if (!viewer) return error("Company operator access required.", 403);

  const body = await request.json().catch(() => null) as { action?: unknown; draftId?: unknown } | null;
  const action = typeof body?.action === "string" ? body.action : "";
  const draftId = typeof body?.draftId === "string" ? body.draftId.trim() : "";
  if (!UUID_PATTERN.test(draftId)) return error("A valid draft ID is required.", 400);

  try {
    if (action === "approve_draft") {
      const result = await approveAcquisitionOutreachDraft({ draftId, approvedBy: viewer.id });
      return NextResponse.json({ data: result }, { headers: { "cache-control": "no-store" } });
    }

    if (action === "send_draft") {
      const result = await sendApprovedAcquisitionOutreach(draftId);
      return NextResponse.json({ data: result }, { headers: { "cache-control": "no-store" } });
    }

    return error("Unsupported acquisition operator action.", 400);
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "ACQUISITION_OPERATOR_FAILED";
    const expectedConflict = /NOT_APPROVABLE|DRAFT_NOT_FOUND|NOT_QUALIFIED|CONTACT|SUPPRESSED|DRAFT_NOT_APPROVED|TRANSPORT_UNAVAILABLE|ENROLLMENT_STOPPED/.test(code);
    return error(code, expectedConflict ? 409 : 500);
  }
}
