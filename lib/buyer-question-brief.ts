import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { supabaseRest } from "@/lib/supabase-rest";
import {
  buildBuyerQuestionBrief,
  type BuyerBriefAnswer,
  type BuyerBriefCompetitor,
  type BuyerBriefRun,
  type BuyerQuestionBrief,
} from "./buyer-question-brief-core.ts";

/** Server-only, tenant/project-scoped read model. No new provider or web call. */
export async function loadBuyerQuestionBrief(viewer: Viewer): Promise<BuyerQuestionBrief> {
  const fictional = buildBuyerQuestionBrief({ run: null, verifiedAnswers: [], competitors: [], reviewedSources: [], fictional: true });
  if (viewer.mode === "demo") return fictional;
  const unavailable = (reason: string): BuyerQuestionBrief => ({
    ...fictional, state: "withheld", reason,
  });
  if (!viewer.accessToken) return unavailable("Your authenticated session is required to inspect private buyer-question evidence.");
  try {
    const context = await loadWorkspaceContext(viewer);
    if (!context) return unavailable("A configured and accessible workspace is required for a buyer-question evidence packet.");
    const runs = await supabaseRest<BuyerBriefRun[]>(
      "runs?select=id,status,created_at,methodology_version&organization_id=eq." + context.organizationId +
        "&project_id=eq." + context.projectId + "&status=in.(complete,partial)&order=created_at.desc&limit=1",
      { token: viewer.accessToken },
    );
    if (!runs[0]) return buildBuyerQuestionBrief({ run: null, verifiedAnswers: [], competitors: [], reviewedSources: [] });
    const run = runs[0];
    const [answers, competitors, sources] = await Promise.all([
      supabaseRest<BuyerBriefAnswer[]>(
        "run_answers?select=run_id,prompt_key,prompt_text,provider,model,review_status,answer_text,brand_present,citations_json" +
          "&organization_id=eq." + context.organizationId + "&run_id=eq." + run.id +
          "&review_status=eq.verified&order=collected_at.asc&limit=501",
        { token: viewer.accessToken },
      ),
      supabaseRest<BuyerBriefCompetitor[]>(
        "competitors?select=id,name,active&organization_id=eq." + context.organizationId +
          "&project_id=eq." + context.projectId + "&active=eq.true&order=name.asc&limit=101",
        { token: viewer.accessToken },
      ),
      loadTruthfulSourceMap(viewer, { runId: run.id }),
    ]);
    return buildBuyerQuestionBrief({
      run, verifiedAnswers: answers, competitors,
      // Only annotations attached to a published Source Map for this exact run.
      reviewedSources: sources.map(source => ({
        url: source.url, reviewedAt: source.reviewedAt,
        clientPresent: source.clientPresent, competitors: source.competitors,
      })),
    });
  } catch {
    // A failed query is not evidence of no competitors, citations, or buyer gaps.
    return unavailable("The private evidence packet could not be verified. Inspect the reviewed collection directly.");
  }
}
