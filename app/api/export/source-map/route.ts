import { getViewer } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export workspace evidence." }, { status: 401 });
  const rows = await loadTruthfulSourceMap(viewer);
  const header = ["rank","domain","title","type","influence","evidence_count","human_reviewed","reviewed_at","client_present","competitors","crawler_access","route","feasibility"];
  const csv = [
    header.map(csvCell).join(","),
    ...rows.map((row) => [
      row.rank,
      row.domain,
      row.title,
      row.type,
      row.reviewedAt ? row.influence : "unreviewed",
      row.evidenceCount,
      Boolean(row.reviewedAt),
      row.reviewedAt || "",
      row.reviewedAt ? row.clientPresent : "unreviewed",
      row.reviewedAt ? row.competitors.join(" | ") : "unreviewed",
      row.crawlerAccess,
      row.reviewedAt ? row.route : "unreviewed",
      row.reviewedAt ? row.feasibility : "unreviewed",
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
