import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadAgentControlPlane } from "@/lib/data";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await loadAgentControlPlane(viewer);
  return NextResponse.json({
    data,
    mode: viewer.mode,
    evidenceBoundary: "Agent results come from recorded stage telemetry or explicitly labelled persisted-run derivations.",
  });
}
