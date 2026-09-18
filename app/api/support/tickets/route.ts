import { NextResponse } from "next/server";
import { queueSupportTicketOperatingAgent } from "@/lib/agent-os/event-queue";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

const categories = ["account","collection","evidence","integration","billing","other"] as const;
type Category = typeof categories[number];

type TicketRow = {
  id: string;
  category: Category;
  subject: string;
  message: string;
  status: "new" | "triaged" | "reply_pending" | "responded" | "closed";
  responded_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

async function supportContext() {
  const viewer = await getViewer();
  if (!viewer) return { response: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  if (viewer.mode === "demo") return { viewer, demo: true as const };
  const context = await loadWorkspaceContext(viewer);
  if (!context) return { response: NextResponse.json({ error: "Workspace not found." }, { status: 404 }) };
  return { viewer, context, demo: false as const };
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").trim().slice(0, max) : "";
}

export async function GET() {
  const resolved = await supportContext();
  if (resolved.response) return resolved.response;
  if (resolved.demo) return NextResponse.json({ data: [], mode: "demo" });

  const rows = await supabaseRest<TicketRow[]>(
    `support_tickets?select=id,category,subject,message,status,responded_at,closed_at,created_at,updated_at&organization_id=eq.${encodeURIComponent(resolved.context!.organizationId)}&requester_id=eq.${encodeURIComponent(resolved.viewer!.id)}&order=created_at.desc&limit=50`,
    { token: resolved.viewer!.accessToken },
  );
  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      category: row.category,
      subject: row.subject,
      message: row.message,
      status: row.status,
      respondedAt: row.responded_at,
      closedAt: row.closed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const resolved = await supportContext();
  if (resolved.response) return resolved.response;
  if (resolved.demo) {
    return NextResponse.json({ error: "Support requests are not sent from the fictional demo." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const category = clean(body.category, 32) as Category;
  const subject = clean(body.subject, 180);
  const message = clean(body.message, 4000);
  if (!categories.includes(category)) {
    return NextResponse.json({ error: "Choose a valid support category." }, { status: 400 });
  }
  if (subject.length < 3) {
    return NextResponse.json({ error: "Add a short subject describing what you need help with." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Add enough detail for support to understand the request." }, { status: 400 });
  }

  const rows = await supabaseRest<Array<{ id: string; created_at: string }>>("support_tickets", {
    method: "POST",
    token: resolved.viewer!.accessToken,
    prefer: "return=representation",
    body: {
      organization_id: resolved.context!.organizationId,
      project_id: resolved.context!.projectId,
      requester_id: resolved.viewer!.id,
      requester_email: resolved.viewer!.email.trim().toLowerCase(),
      category,
      subject,
      message,
      status: "new",
    },
  });
  const ticket = rows[0];
  if (!ticket) return NextResponse.json({ error: "The support request could not be saved." }, { status: 503 });

  const queued = await queueSupportTicketOperatingAgent({
    ticketId: ticket.id,
    organizationId: resolved.context!.organizationId,
    projectId: resolved.context!.projectId,
    requestedBy: resolved.viewer!.id,
  }).catch(() => ({ queued: false }));

  return NextResponse.json({
    data: {
      id: ticket.id,
      category,
      subject,
      message,
      status: "new",
      createdAt: ticket.created_at,
    },
    agentQueued: queued.queued,
  }, { status: 201, headers: { "cache-control": "no-store" } });
}
