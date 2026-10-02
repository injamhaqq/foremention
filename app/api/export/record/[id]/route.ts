import { getViewer } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { loadAuthenticatedRecommendationRecord } from "@/lib/recommendation-record-reader";

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export a Recommendation Record." }, { status: 401 });
  const { id } = await params;
  const record = await loadAuthenticatedRecommendationRecord(viewer, id);
  if (!record) return Response.json({ error: "Recommendation Record not found." }, { status: 404 });

  const { run, answers, evidenceState } = record;
  if (!evidenceState.fullyLoaded) {
    return Response.json(
      { error: "The complete Recommendation Record could not be verified, so CSV export is withheld." },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }

  const header = ["record_id","collection_date","question","provider","model","review_state","collected_at","answer","returned_reference_count","returned_references"];
  const csv = [
    header.map(csvCell).join(","),
    ...answers.map((answer) => [
      run.id,
      dateLabel(run.createdAt),
      answer.prompt,
      answer.provider,
      answer.model || "",
      answer.reviewStatus,
      dateLabel(answer.collectedAt),
      answer.answer,
      answer.citations.length,
      answer.citations.map((citation) => citation.url || citation.title || "").join(" | "),
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
