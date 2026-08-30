import { getViewer } from "@/lib/auth";
import {
  exportReportCsv,
  exportReportEmail,
  exportReportHtml,
  exportReportJson,
  exportReportPdf,
  exportReportPresentation,
} from "@/lib/report-export";
import { loadReportSnapshot, reportIntegritySha256 } from "@/lib/report-persistence";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

const safeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "foremention-report";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export a report." }, { status: 401, headers: PRIVATE_HEADERS });
  const { id } = await params;
  const row = await loadReportSnapshot(viewer, id);
  if (!row) return Response.json({ error: "Report snapshot not found." }, { status: 404, headers: PRIVATE_HEADERS });

  const integrity = await reportIntegritySha256(row.private_payload);
  if (integrity !== row.integrity_sha256) return Response.json({ error: "Report integrity verification failed. Generate a new snapshot before exporting." }, { status: 409, headers: PRIVATE_HEADERS });

  const format = new URL(request.url).searchParams.get("format")?.toLowerCase() || "html";
  const filename = `${safeName(row.title)}-${row.id.slice(0, 8)}`;
  if (format === "json") return new Response(exportReportJson(row.private_payload), { headers: { ...PRIVATE_HEADERS, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.json"` } });
  if (format === "csv") return new Response(exportReportCsv(row.private_payload), { headers: { ...PRIVATE_HEADERS, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` } });
  if (format === "pdf") return new Response(exportReportPdf(row.private_payload), { headers: { ...PRIVATE_HEADERS, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } });
  if (format === "email") return Response.json(exportReportEmail(row.private_payload), { headers: PRIVATE_HEADERS });
  if (format === "presentation") return Response.json(exportReportPresentation(row.private_payload), { headers: PRIVATE_HEADERS });
  if (format === "html" || format === "print") return new Response(exportReportHtml(row.private_payload), { headers: { ...PRIVATE_HEADERS, "Content-Type": "text/html; charset=utf-8", "Content-Disposition": format === "print" ? "inline" : `attachment; filename="${filename}.html"` } });
  return Response.json({ error: "Unsupported format. Use pdf, csv, json, html, print, email, or presentation." }, { status: 400, headers: PRIVATE_HEADERS });
}
