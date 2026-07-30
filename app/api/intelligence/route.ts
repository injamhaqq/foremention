import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWeeklyIntelligence } from "@/lib/intelligence-loop";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadWeeklyIntelligence(viewer), mode: viewer.mode });
}
