import { getViewer } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { loadSourceMap } from "@/lib/data";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export workspace evidence." }, { status: 401 });
  const rows = await loadSourceMap(viewer);
  const header = ["rank","domain","title","type","influence","evidence_count","client_present","competitors","crawler_access","route","feasibility"];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((row) => [
      row.rank,
      row.domain,
      row.title,
      row.type,
      row.influence,
      row.evidenceCount,
      row.clientPresent,
      row.competitors.join(" | "),
      row.crawlerAccess,
      row.route,
      row.feasibility,
    ].map(csvCell).join(",")),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=foremention-source-map.csv",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
