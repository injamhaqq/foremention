import { getViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { buildWorkspaceExport } from "@/lib/workspace-export";

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "workspace";
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer || viewer.mode === "demo" || !viewer.accessToken) return Response.json({ error: "Sign in to export workspace data." }, { status: 401 });
  const [context, role] = await Promise.all([loadWorkspaceContext(viewer), getPrimaryWorkspaceRole(viewer)]);
  if (!context) return Response.json({ error: "Workspace not found." }, { status: 404 });
  if (role !== "owner") return Response.json({ error: "Only the workspace owner can export the complete workspace archive." }, { status: 403 });
  const { archive } = await buildWorkspaceExport({ organizationId: context.organizationId, organizationName: context.organizationName, token: viewer.accessToken });
  const body = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength) as ArrayBuffer;
  return new Response(body, { headers: {
    "content-type": "application/zip",
    "content-disposition": `attachment; filename="foremention-${safeFilename(context.organizationName)}-${new Date().toISOString().slice(0, 10)}.zip"`,
    "cache-control": "private, no-store, max-age=0",
    "x-content-type-options": "nosniff",
  } });
}
