import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadTruthfulWeeklyIntelligence } from "@/lib/truthful-intelligence";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadTruthfulWeeklyIntelligence(viewer), mode: viewer.mode });
}
