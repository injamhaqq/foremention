import { NextResponse } from "next/server";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole } from "@/lib/data";
import { loadReportSnapshot } from "@/lib/report-persistence";
import { createReportShare, revokeReportShare } from "@/lib/report-sharing";
import { isTrustedMutationOrigin } from "@/lib/request-security";

const canShare = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const PRIVATE_HEADERS = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: PRIVATE_HEADERS });
  const viewer = await requireViewer("/app/reports");
  if (viewer.mode === "demo") return NextResponse.json({ error: "Fictional demo reports cannot be shared." }, { status: 409, headers: PRIVATE_HEADERS });
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canShare(role)) return NextResponse.json({ error: "Your workspace role cannot share reports." }, { status: 403, headers: PRIVATE_HEADERS });
  const { id } = await params;
  const report = await loadReportSnapshot(viewer, id);
  if (!report) return NextResponse.json({ error: "Report snapshot not found." }, { status: 404, headers: PRIVATE_HEADERS });
  const body = await request.json().catch(() => ({})) as { expiresInDays?: number };
  const share = await createReportShare(viewer, { organizationId: report.organization_id, reportId: report.id, expiresInDays: body.expiresInDays });
  return NextResponse.json({ data: share }, { status: 201, headers: PRIVATE_HEADERS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: PRIVATE_HEADERS });
  const viewer = await requireViewer("/app/reports");
  const role = await getPrimaryWorkspaceRole(viewer);
  if (!canShare(role)) return NextResponse.json({ error: "Your workspace role cannot revoke report shares." }, { status: 403, headers: PRIVATE_HEADERS });
  const { id } = await params;
  const report = await loadReportSnapshot(viewer, id);
  if (!report) return NextResponse.json({ error: "Report snapshot not found." }, { status: 404, headers: PRIVATE_HEADERS });
  const body = await request.json().catch(() => ({})) as { shareId?: string };
  if (!body.shareId) return NextResponse.json({ error: "Share id is required." }, { status: 400, headers: PRIVATE_HEADERS });
  const revoked = await revokeReportShare(viewer, { organizationId: report.organization_id, reportId: report.id, shareId: body.shareId });
  if (!revoked) return NextResponse.json({ error: "Report share not found." }, { status: 404, headers: PRIVATE_HEADERS });
  return NextResponse.json({ data: { revoked: true } }, { headers: PRIVATE_HEADERS });
}
