import { getViewer } from "@/lib/auth";
import { csvCell } from "@/lib/csv";
import { loadRunAnswers, loadRuns } from "@/lib/data";
import { loadRunManifest } from "@/lib/run-manifest";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to export a Recommendation Record." }, { status: 401 });
  const { id } = await params;
  const run = (await loadRuns(viewer)).find((item) => item.id === id);
  if (!run) return Response.json({ error: "Recommendation Record not found." }, { status: 404 });
  const [answers, manifest] = await Promise.all([
    loadRunAnswers(viewer, id),
    // Historical records may lack a complete manifest. Do not manufacture
    // provider/method versions or block the original evidence export.
    loadRunManifest(viewer, id).catch(() => null),
  ]);
  const header = [
    "record_id","collection_date","question","provider","model","review_state",
    "collected_at","answer","returned_reference_count","returned_references",
    "organization_id","project_id","record_status","run_created_at",
    "methodology_version","question_version","question_locale","question_market",
    "measurement_surface","consumer_interface_equivalent","reference_provenance",
    "comparison_eligibility","causal_uplift_claim",
  ];
  const csv = [
    header.map(csvCell).join(","),
    ...answers.map((answer) => {
      // Prompt text is evidence only when it uniquely matches the stored
      // question wording; do not guess historical revisions or locales.
      const matches = manifest?.questions.filter((question) => question.text === answer.prompt) || [];
      const question = matches.length === 1 ? matches[0] : null;
      const surface = manifest?.surfaces.find((entry) => entry.provider === answer.provider);
      return [
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
        manifest?.organizationId || "unavailable",
        manifest?.projectId || "unavailable",
        run.status,
        manifest?.createdAt || "unavailable",
        manifest?.methodologyVersion || "unavailable",
        question?.revision ?? "unavailable",
        question?.locale || "unavailable",
        question?.market || "unavailable",
        surface?.kind || "unavailable",
        surface ? "no — provider/API collection is not a consumer-interface observation" : "unavailable",
        answer.citations.length ? "saved answer reference; native/provider-origin not established by CSV" : "no saved answer references",
        "not assessed; compare exact eligible reviewed run pair separately",
        "not established — before/after is observational",
      ].map(csvCell).join(",");
    }),
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
