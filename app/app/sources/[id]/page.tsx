import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { loadRuns, loadWorkspaceContext } from "@/lib/data";
import { getDemoSourceMap } from "@/lib/demo-data";
import { resolveDemoSourceRunId, resolveSourceRecordRunId, sourceRecordHref } from "@/lib/source-record-location";
import { supabaseRest } from "@/lib/supabase-rest";

// The standalone source surface stays retired. Existing /app/sources/<id>
// links (Sources "Review source", Overview, notifications, comments, webhooks)
// resolve to the Recommendation Record that published the entry, where its
// evidence inspection and human review open in place. Anything that cannot be
// resolved inside the active project falls back to the Sources list.
export default async function SourceRecordRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer(`/app/sources/${encodeURIComponent(id)}`);
  let target: string | null = null;
  try {
    if (viewer.mode === "demo") {
      const runs = (await loadRuns(viewer)).filter((run) => run.status === "complete" || run.status === "partial");
      const runId = resolveDemoSourceRunId(id, runs.map((run) => run.id), getDemoSourceMap);
      target = runId ? sourceRecordHref(runId, id) : null;
    } else {
      const context = await loadWorkspaceContext(viewer);
      const runId = context ? await resolveSourceRecordRunId({
        organizationId: context.organizationId,
        projectId: context.projectId,
        categoryId: context.categoryId,
        entryId: id,
        rest: <T,>(path: string) => supabaseRest<T>(path, { token: viewer.accessToken }),
      }) : null;
      target = runId ? sourceRecordHref(runId, id) : null;
    }
  } catch {
    target = null;
  }
  if (target) redirect(target);
  redirect("/app/source-map");
}
