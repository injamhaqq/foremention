import { NextResponse } from "next/server";
import { authorizeOutreachMiniAuditRequest } from "@/lib/outreach-mini-audit-auth";
import { parseOutreachMiniAuditInput, runOutreachMiniAudit } from "@/lib/outreach-mini-audit";
import { readJsonObject } from "@/lib/input-validation";

export async function POST(request: Request) {
  const secret = String(process.env.OUTREACH_MINI_AUDIT_SECRET || "").trim();
  if (!secret) {
    return NextResponse.json({ error: "Outreach mini-audit is not configured." }, { status: 503 });
  }
  if (!authorizeOutreachMiniAuditRequest(request, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await readJsonObject(request, 25_000);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  try {
    const input = parseOutreachMiniAuditInput(body);
    const data = await runOutreachMiniAudit(input);
    return NextResponse.json({ data }, {
      status: 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mini-audit failed.";
    if (/required|valid|maximum|at least|unsupported|providers must/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (/no outreach mini-audit provider is configured/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: "Mini-audit failed." }, { status: 502 });
  }
}
