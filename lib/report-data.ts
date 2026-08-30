import type { Viewer } from "./auth.ts";
import { loadWorkspaceContext } from "./data.ts";
import { buildOutcomeLedger, type OutcomeLedgerAssetRow, type OutcomeLedgerFollowUpRow, type OutcomeLedgerRunRow } from "./outcome-ledger.ts";
import { isMissingRelationError, supabaseRest } from "./supabase-rest.ts";
import type { ReportAction, ReportCompetitor, ReportOutcome, ReportSource } from "./reporting.ts";

type ReportRunRow = {
  id: string;
  status: string;
  provider_ids: string[] | null;
  created_at: string;
  completed_at: string | null;
  prompt_count: number;
  answer_count: number;
  citation_count: number;
  brand_presence_pct: number | string | null;
  first_mention_pct: number | string | null;
  new_source_count: number | string | null;
};

type ReportAnswerRow = {
  id: string;
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  citations_json: Array<{ url?: string; title?: string }> | null;
  review_status: "unreviewed" | "verified" | "excluded";
  collected_at: string;
  answer_text: string;
};

type ReportPlacementRow = {
  id: string;
  page_title: string | null;
  source_url: string;
  stage: string;
  owner_id: string | null;
  due_at: string | null;
  baseline_run_id: string | null;
};

type CompetitorRow = { name: string };

const pct = (value: number, total: number) => total > 0 ? Math.round((value / total) * 10_000) / 100 : 0;
const unique = <T>(values: T[], key: (value: T) => string) => Array.from(new Map(values.map((value) => [key(value), value])).values());

async function loadOutcomeRows(viewer: Viewer, organizationId: string, projectId: string, runIds: string[]) {
  const empty = { assets: [] as OutcomeLedgerAssetRow[], followUps: [] as OutcomeLedgerFollowUpRow[], runs: [] as OutcomeLedgerRunRow[] };
  try {
    const assets = await supabaseRest<OutcomeLedgerAssetRow[]>(
      `resolution_assets?select=id,opportunity_id,source_id,baseline_run_id,asset_type,title,problem_statement,status,review_decision,submitted_at,approved_at,decision_at,approval_note,applied_at,application_reference,application_note,created_at,updated_at&organization_id=eq.${organizationId}&project_id=eq.${projectId}&baseline_run_id=in.(${runIds.join(",")})&limit=200`,
      { token: viewer.accessToken },
    );
    if (!assets.length) return empty;
    const assetIds = assets.map((asset) => asset.id);
    const followUps = await supabaseRest<OutcomeLedgerFollowUpRow[]>(
      `resolution_follow_ups?select=id,resolution_asset_id,baseline_run_id,rerun_id,status,requested_at,completed_at,outcome,limitation&organization_id=eq.${organizationId}&resolution_asset_id=in.(${assetIds.join(",")})&order=requested_at.desc&limit=400`,
      { token: viewer.accessToken },
    );
    const outcomeRunIds = Array.from(new Set([...assets.map((asset) => asset.baseline_run_id), ...followUps.map((item) => item.rerun_id)].filter((id): id is string => Boolean(id))));
    const runs = outcomeRunIds.length ? await supabaseRest<OutcomeLedgerRunRow[]>(
      `runs?select=id,status,brand_presence_pct,first_mention_pct,citation_count,new_source_count,completed_at&organization_id=eq.${organizationId}&project_id=eq.${projectId}&id=in.(${outcomeRunIds.join(",")})`,
      { token: viewer.accessToken },
    ) : [];
    return { assets, followUps, runs };
  } catch (error) {
    if (isMissingRelationError(error)) return empty;
    throw error;
  }
}

const outcomeMetrics = (ledger: ReturnType<typeof buildOutcomeLedger>) => {
  const byBaseline = new Map<string, ReportOutcome[]>();
  for (const record of ledger) {
    const baseline = record.steps[0]?.done ? record.steps[0] : null;
    const asset = record.id;
    if (!record.comparison || !baseline) continue;
    const limitation = record.comparison.interpretation || record.limitation;
    const values: ReportOutcome[] = [
      { id: `${asset}:brand-presence`, label: "Brand presence", ...record.comparison.brandPresencePct, limitation },
      { id: `${asset}:first-mention`, label: "First mention", ...record.comparison.firstMentionPct, limitation },
      { id: `${asset}:citations`, label: "Returned citations", ...record.comparison.citationCount, limitation },
      { id: `${asset}:new-sources`, label: "New sources", ...record.comparison.newSourceCount, limitation },
    ];
    const key = record.comparison.baselineRunId;
    byBaseline.set(key, [...(byBaseline.get(key) || []), ...values]);
  }
  return byBaseline;
};

function buildCompetitors(answers: ReportAnswerRow[], competitorNames: string[]): ReportCompetitor[] {
  if (!answers.length || !competitorNames.length) return [];
  return competitorNames.map((name) => {
    const normalized = name.toLocaleLowerCase();
    const mentions = answers.filter((answer) => answer.answer_text.toLocaleLowerCase().includes(normalized)).length;
    return { name, before: null, after: pct(mentions, answers.length), delta: null };
  });
}

export async function buildReportSourcesForRuns(viewer: Viewer, requestedRunIds: string[]): Promise<{ organizationId: string; projectId: string; sources: ReportSource[] }> {
  const context = await loadWorkspaceContext(viewer);
  if (!context) throw new Error("Workspace context is required before a report can be generated.");
  if (viewer.mode === "demo") throw new Error("Report snapshots are not persisted from the fictional demo workspace.");
  const runIds = Array.from(new Set(requestedRunIds.map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))).slice(0, 50);
  if (!runIds.length) throw new Error("At least one Recommendation Record id is required.");

  const [runs, answers, placements, competitors, outcomes] = await Promise.all([
    supabaseRest<ReportRunRow[]>(
      `runs?select=id,status,provider_ids,created_at,completed_at,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${runIds.join(",")})&order=created_at.asc`,
      { token: viewer.accessToken },
    ),
    supabaseRest<ReportAnswerRow[]>(
      `run_answers?select=id,run_id,prompt_key,prompt_text,provider,model,citations_json,review_status,collected_at,answer_text&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&order=collected_at.asc&limit=5000`,
      { token: viewer.accessToken },
    ),
    supabaseRest<ReportPlacementRow[]>(
      `placements?select=id,page_title,source_url,stage,owner_id,due_at,baseline_run_id&organization_id=eq.${context.organizationId}&baseline_run_id=in.(${runIds.join(",")})&limit=500`,
      { token: viewer.accessToken },
    ).catch((error) => isMissingRelationError(error) ? [] : Promise.reject(error)),
    supabaseRest<CompetitorRow[]>(
      `competitors?select=name&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&active=eq.true&order=name.asc&limit=100`,
      { token: viewer.accessToken },
    ),
    loadOutcomeRows(viewer, context.organizationId, context.projectId, runIds),
  ]);

  if (runs.length !== runIds.length) throw new Error("One or more Recommendation Records were not found in this workspace.");
  const ledgerOutcomes = outcomeMetrics(buildOutcomeLedger(outcomes));

  const sources = runs.map((run): ReportSource => {
    const runAnswers = answers.filter((answer) => answer.run_id === run.id);
    const reviewedDecisions = runAnswers.filter((answer) => answer.review_status === "verified" || answer.review_status === "excluded");
    const verified = runAnswers.filter((answer) => answer.review_status === "verified");
    const cited = verified.filter((answer) => (answer.citations_json || []).some((citation) => Boolean(citation.url)));
    const customerReviewed = runAnswers.length > 0 && reviewedDecisions.length === runAnswers.length && verified.length > 0 && ["complete", "partial"].includes(run.status);
    const uncertaintyState = !customerReviewed ? "review_required" : cited.length < verified.length ? "bounded" : "low";
    const providerModels = unique(runAnswers.map((answer) => ({ provider: answer.provider, model: answer.model })), (item) => `${item.provider}\u0000${item.model || ""}`);
    const questions = unique(runAnswers.map((answer) => ({ id: answer.prompt_key, text: answer.prompt_text || answer.prompt_key })), (item) => `${item.id}\u0000${item.text}`);
    const runActions: ReportAction[] = placements.filter((item) => item.baseline_run_id === run.id).map((item) => ({
      id: item.id,
      title: item.page_title || item.source_url,
      status: item.stage,
      owner: item.owner_id ? "Assigned workspace member" : null,
      dueAt: item.due_at,
    }));

    return {
      recordId: run.id,
      measurementRunId: run.id,
      title: `Recommendation Record ${run.id.slice(0, 8).toUpperCase()}`,
      measuredAt: run.completed_at || run.created_at,
      measurementEnvironment: {
        source: "persisted Foremention collection",
        schedule: "not_recorded_on_run",
        methodology: "not_recorded_on_run",
        locale: "not_recorded_on_run",
        market: "not_recorded_on_run",
      },
      questions,
      providerModels,
      evidenceState: {
        claimCount: verified.length,
        citedClaimCount: cited.length,
        unsupportedClaimCount: Math.max(0, verified.length - cited.length),
        coveragePct: pct(cited.length, verified.length),
      },
      comparisonEligibility: {
        eligible: false,
        reason: "Comparison eligibility is withheld in the report snapshot because exact methodology, locale, market, question-set fingerprint, and reviewed comparison pair are not all asserted by the run row.",
      },
      uncertainty: {
        state: uncertaintyState,
        notes: [
          ...(customerReviewed ? [] : ["Human review is incomplete or no verified answer is available."]),
          ...(verified.length > cited.length ? [`${verified.length - cited.length} verified answer(s) do not contain a returned citation URL.`] : []),
          "A returned citation is provider evidence, not proof of causal influence.",
        ],
      },
      customerReview: { required: true, state: customerReviewed ? "reviewed" : "review_required", reviewedAt: null },
      summary: `${verified.length} verified answer${verified.length === 1 ? "" : "s"}; ${cited.length} with returned citation evidence; ${runActions.length} linked action${runActions.length === 1 ? "" : "s"}.`,
      actions: runActions,
      outcomes: ledgerOutcomes.get(run.id) || [],
      competitors: buildCompetitors(runAnswers, competitors.map((item) => item.name)),
    };
  });

  return { organizationId: context.organizationId, projectId: context.projectId, sources };
}
