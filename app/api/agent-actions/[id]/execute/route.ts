import { NextResponse } from "next/server";
import { executeApprovedAgentAction } from "@/lib/agent-os/executor";
import { getViewer } from "@/lib/auth";
import { isCompanyOperatorEmail } from "@/lib/company-operator";
import { isTrustedMutationOrigin } from "@/lib/request-security";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const viewer = await getViewer();
  if (!viewer || viewer.mode !== "supabase") {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!isCompanyOperatorEmail(viewer.email)) {
    return NextResponse.json({ error: "Company operator access required." }, { status: 403 });
  }

  const { id } = await params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Choose a valid agent action." }, { status: 400 });
  }

  try {
    const execution = await executeApprovedAgentAction(id, viewer.id);
    const status = execution.status === "uncertain" ? 202 : 200;
    return NextResponse.json(
      { ok: true, execution },
      { status, headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "AGENT_EXECUTION_FAILED";
    const status =
      /NOT_FOUND/.test(code) ? 404
      : /NOT_EXECUTABLE/.test(code) ? 409
      : /PROVIDER_REJECTED|PREFLIGHT_FAILED/.test(code) ? 503
      : /RECEIPT_PERSISTENCE_FAILED/.test(code) ? 202
      : 503;
    return NextResponse.json(
      { error: code },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
