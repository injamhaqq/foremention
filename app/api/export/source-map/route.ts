import { getViewer } from "@/lib/auth";
import { loadSourceMap } from "@/lib/data";

const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export workspace evidence." }, { status: 401 });
  const rows = await loadSourceMap(viewer);
  const header = ["rank","domain","title","type","influence","evidence_count","client_present","competitors","crawler_access","route","feasibility"];
  const csv = [header.map(quote).join(","), ...rows.map(row => [row.rank,row.domain,row.title,row.type,row.influence,row.evidenceCount,row.clientPresent,row.competitors.join(" | "),row.crawlerAccess,row.route,row.feasibility].map(quote).join(","))].join("\n");
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": "attachment; filename=foremention-source-map.csv", "cache-control": "no-store" } });
}
