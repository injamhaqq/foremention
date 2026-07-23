import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadPlacements } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() { const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ data: await loadPlacements(viewer), mode: viewer.mode }); }
export async function POST(request: Request) {
  const viewer = await getViewer(); if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.organization_id || !body.source_url || !body.entry_route) return NextResponse.json({ error: "organization_id, source_url, and entry_route are required." }, { status: 400 });
  if (viewer.mode === "demo") return NextResponse.json({ data: { id: crypto.randomUUID(), ...body, stage: "identified" }, mode: "demo" }, { status: 201 });
  const rows = await supabaseRest<Array<Record<string, unknown>>>("placements", { method: "POST", token: viewer.accessToken, prefer: "return=representation", body: { ...body, stage: "identified", created_by: viewer.id } });
  return NextResponse.json({ data: rows[0] }, { status: 201 });
}
