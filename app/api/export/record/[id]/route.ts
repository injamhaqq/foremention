import { getViewer } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { loadRunAnswers, loadRuns } from "@/lib/data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export a Recommendation Record." }, { status: 401 });
  const { id } = await params;
  const run = (await loadRuns(viewer)).find((item) => item.id === id);
  if (!run) return Response.json({ error: "Recommendation Record not found." }, { status: 404 });
  const answers = await loadRunAnswers(viewer, id);
  const header = ["record_id","collection_date","question","provider","model","review_state","collected_at","answer","returned_reference_count","returned_references"];
  const csv = [
    header.map(csvCell).join(","),
    ...answers.map((answer) => [
      run.id,
      run.date,
      answer.prompt,
      answer.provider,
      answer.model || "",
      answer.status,
      answer.collectedAt,
      answer.answer,
      answer.citations.length,
      answer.citations.map((citation) => citation.url).join(" | "),
    ].map(csvCell).join(",")),
  ].join("\n");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=foremention-recommendation-record-${run.id.slice(0, 8)}.csv`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
