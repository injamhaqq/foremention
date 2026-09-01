import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

type LinkRow = {
  resolution_asset_id: string;
  change_specification_id: string;
  execution_role: string;
};

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ data: [], mode: "demo" });
  if (!viewer.accessToken) return NextResponse.json({ error: "Your authenticated session is incomplete. Sign in again." }, { status: 401 });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ data: [] });

  try {
    const rows = await supabaseRest<LinkRow[]>(
      `change_execution_assets?select=resolution_asset_id,change_specification_id,execution_role&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=200`,
      { token: viewer.accessToken },
    );
    return NextResponse.json({ data: rows.map((row) => ({
      resolutionAssetId: row.resolution_asset_id,
      changeSpecificationId: row.change_specification_id,
      executionRole: row.execution_role,
    })) });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ data: [], status: "pending_migration" });
    throw error;
  }
}
