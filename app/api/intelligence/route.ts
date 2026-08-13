import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadSafeWeeklyIntelligence } from "@/lib/safe-intelligence";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadSafeWeeklyIntelligence(viewer), mode: viewer.mode });
}
