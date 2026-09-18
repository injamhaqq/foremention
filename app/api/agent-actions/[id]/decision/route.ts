import { NextResponse } from "next/server";
import { decideAgentAction } from "@/lib/agent-os/actions";
import { getViewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { isTrustedMutationOrigin } from "@/lib/request-security";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer || viewer.mode !== "supabase") return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!isCompanyOperatorEmail(viewer.email)) return NextResponse.json({ error: "Company operator access required." }, { status: 403 });

  const { id } = await params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Choose a valid agent action." }, { status: 400 });
  const body = await request.json().catch(() => ({})) as { decision?: unknown; note?: unknown };
  if (body.decision !== "approve" && body.decision !== "reject") {
    return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note : null;

  try {
    const action = await decideAgentAction({
      actionId: id,
      decision: body.decision,
      actorId: viewer.id,
      note,
    });
    return NextResponse.json({ ok: true, action }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The decision could not be recorded.";
    const status = /not found/i.test(message) ? 404 : /not waiting/i.test(message) || /changed/i.test(message) ? 409 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
