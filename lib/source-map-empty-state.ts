import type { ProductState } from "@/lib/product-state";

type EmptyRun = { id: string; status: string; citations: number; errorSummary?: string | null };
export type SourceMapEmptyState = { title: string; body: string; cta: string; href: string };

/**
 * The Source Map publishes only from a human-approved collection (unreviewed
 * citations never enter decision surfaces). When it is empty, say why and point
 * at the collection that actually unlocks it, not just the newest run, which
 * may have failed while an earlier run with returned citations awaits review.
 */
export function sourceMapEmptyState(input: { latest: EmptyRun | null; state: ProductState; runs: EmptyRun[] }): SourceMapEmptyState {
  const { latest, state } = input;
  if (!latest) return { title: "No collection has been run yet.", body: "Start a collection first. Sources appear only when an AI system actually returns web citations.", cta: "Start a collection", href: "/app/runs" };
  if (state === "COLLECTING") return { title: "Sources are not ready yet.", body: "Foremention is still collecting the latest AI answers. Any returned citations will appear here after they are saved and reviewed.", cta: "View collection progress", href: `/app/runs/${latest.id}` };
  const awaiting = input.runs.find((run) => run.status === "review" && run.citations > 0);
  if (awaiting) {
    const count = awaiting.citations;
    return {
      title: `${count} returned citation${count === 1 ? " is" : "s are"} waiting for your review.`,
      body: `${latest.id !== awaiting.id && state === "FAILED_RECOVERABLE" ? "The newest collection did not finish, but an earlier collection returned cited pages. " : ""}Sources are published here after you check the answers and approve that collection in its Recommendation Record. Unreviewed citations are kept out of the Source Map; nothing was lost.`,
      cta: "Review and approve the collection",
      href: `/app/runs/${awaiting.id}`,
    };
  }
  if (state === "FAILED_RECOVERABLE") return { title: "The latest collection did not produce source evidence.", body: latest.errorSummary || "The collection failed before usable cited-source evidence was saved. Existing source history remains unchanged.", cta: "Inspect the failed collection", href: `/app/runs/${latest.id}` };
  if (latest.citations === 0) return { title: "The latest AI answers returned no cited URLs.", body: "The answers are still preserved. Foremention will not invent a Source Map when the AI system returns no web citations.", cta: "Inspect the AI answers", href: `/app/runs/${latest.id}` };
  return { title: "No published source map is available yet.", body: "Citations were recorded, but a source view is not available yet. Inspect the collection instead of treating this as zero source activity.", cta: "Review the collection", href: `/app/runs/${latest.id}` };
}
