import { Inngest } from "inngest";
import {
  canonicalizeEvidenceUrl,
  estimateMaximumRunCost,
  estimateProviderCost,
  getProviderCostRates,
  hasOpenProviderCircuit,
  hostnameFromUrl,
  LIVE_COLLECTION_LIMITS,
  roundUsd,
  safeOperationalError,
} from "@/lib/collection-policy";
import { getProvider } from "@/lib/providers";
import { ProviderRequestError, type ProviderAnswer, type ProviderId } from "@/lib/providers/types";
import { supabaseRest } from "@/lib/supabase-rest";

export const inngest = new Inngest({ id: "foremention" });

type LiveProviderId = Exclude<ProviderId, "mock">;
type RunRequestedData = {
  runId: string;
  organizationId: string;
};
type RunRow = {
  id: string;
  organization_id: string;
  project_id: string;
  category_id: string;
  status: string;
  provider_ids: LiveProviderId[];
  created_by: string | null;
};
type PromptSelection = {
  prompt_id: string;
  prompt_key: string;
  prompt_text: string;
  locale: string;
};
type Identity = {
  brand: string;
  competitors: string[];
};

const includesName = (text: string, value: string) =>
  Boolean(value.trim()) && text.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());

async function recordedRunCost(data: RunRequestedData) {
  const events = await supabaseRest<Array<{ estimated_cost_usd: number | string | null }>>(
    `ai_cost_events?select=estimated_cost_usd&organization_id=eq.${data.organizationId}&run_id=eq.${data.runId}`,
    { serviceRole: true },
  );
  return roundUsd(events.reduce((total, event) => total + Number(event.estimated_cost_usd || 0), 0));
}

async function notifyRunOwner(
  run: Pick<RunRow, "id" | "organization_id" | "created_by">,
  kind: "run_ready" | "run_failed",
  title: string,
  body: string,
) {
  if (!run.created_by) return;
  try {
    await supabaseRest("notifications?on_conflict=organization_id,user_id,event_key", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=ignore-duplicates,return=minimal",
      body: {
        organization_id: run.organization_id,
        user_id: run.created_by,
        event_key: `${kind}:${run.id}`,
        kind,
        title,
        body,
        href: `/app/runs/${run.id}`,
      },
    });
  } catch (error) {
    console.warn("Operational notification could not be recorded.", safeOperationalError(error));
  }
}

async function markRunFailed(data: RunRequestedData, reason: string, releaseIfNeverStarted = false) {
  const runs = await supabaseRest<Array<{ id: string; organization_id: string; created_by: string | null; status: string; started_at: string | null }>>(
    `runs?select=id,organization_id,created_by,status,started_at&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&limit=1`,
    { serviceRole: true },
  );
  const run = runs[0];
  if (!run || ["complete", "partial", "failed", "cancelled"].includes(run.status)) return;
  if (releaseIfNeverStarted && !run.started_at) {
    await supabaseRest(`usage_events?organization_id=eq.${data.organizationId}&run_id=eq.${data.runId}`, {
      method: "DELETE",
      serviceRole: true,
    });
  }
  const actualCostUsd = await recordedRunCost(data);
  await supabaseRest(`runs?id=eq.${data.runId}&organization_id=eq.${data.organizationId}`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: {
      status: "failed",
      completed_at: new Date().toISOString(),
      estimated_max_cost_usd: releaseIfNeverStarted && !run.started_at ? 0 : undefined,
      actual_cost_usd: actualCostUsd,
      error_summary: safeOperationalError(reason),
    },
  });
  await notifyRunOwner(
    run,
    "run_failed",
    "Collection run needs attention",
    "The run failed without inventing evidence. Open the run to inspect the provider error and retry safely.",
  );
}

async function loadRun(data: RunRequestedData) {
  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,organization_id,project_id,category_id,status,provider_ids,created_by&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&limit=1`,
    { serviceRole: true },
  );
  const run = runs[0];
  if (!run) throw new Error("Queued collection run was not found.");
  if (!["queued", "running"].includes(run.status)) return null;
  if (!run.project_id || !run.category_id) throw new Error("The queued run is missing its validated project or category.");
  if (run.provider_ids.length !== 1) throw new Error("A live run must contain exactly one configured provider.");
  return run;
}

async function persistFailureAttempt(
  run: RunRow,
  prompt: PromptSelection,
  providerId: LiveProviderId,
  model: string,
  attemptNumber: number,
  error: unknown,
) {
  const status = error instanceof ProviderRequestError && error.status === 429 ? "rate_limited" : "failed";
  const code = error instanceof ProviderRequestError ? error.code : error instanceof DOMException && error.name === "AbortError" ? "timeout" : "provider_failure";
  const rates = getProviderCostRates(providerId);
  const estimatedCost = rates ? estimateMaximumRunCost(1, rates) : 0;
  const attemptRows = await supabaseRest<Array<{ id: string }>>("run_attempts?on_conflict=run_id,prompt_id,provider,attempt_number", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: run.organization_id,
      run_id: run.id,
      prompt_id: prompt.prompt_id,
      prompt_key: prompt.prompt_key,
      provider: providerId,
      model,
      attempt_number: attemptNumber,
      status,
      error_code: code,
      error_detail: safeOperationalError(error),
      estimated_cost_usd: estimatedCost,
      cost_source: "estimated",
      retryable: error instanceof ProviderRequestError ? error.retryable : error instanceof DOMException && error.name === "AbortError",
      completed_at: new Date().toISOString(),
    },
  });
  const attemptId = attemptRows[0]?.id;
  if (attemptId) {
    await supabaseRest("ai_cost_events?on_conflict=run_attempt_id", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        organization_id: run.organization_id,
        run_id: run.id,
        run_attempt_id: attemptId,
        provider: providerId,
        model,
        estimated_cost_usd: estimatedCost,
        cost_source: "estimated",
        observed_at: new Date().toISOString(),
      },
    });
  }
}
async function persistAnswer(
  run: RunRow,
  prompt: PromptSelection,
  providerId: LiveProviderId,
  answer: ProviderAnswer,
  identity: Identity,
  attemptNumber: number,
) {
  const rates = getProviderCostRates(providerId);
  if (!rates) throw new Error(`${providerId} cost rates are not configured.`);
const providerReportedCost = typeof answer.billedCostUsd === "number" && Number.isFinite(answer.billedCostUsd) && answer.billedCostUsd >= 0
    ? roundUsd(answer.billedCostUsd)
    : null;
  const estimatedCost = providerReportedCost ?? estimateProviderCost(answer.usage, rates) ?? estimateMaximumRunCost(1, rates);
  const costSource = providerReportedCost === null ? "estimated" : "provider_reported";
  const lowerAnswer = answer.answer.toLocaleLowerCase();
  const brandIndex = identity.brand ? lowerAnswer.indexOf(identity.brand.toLocaleLowerCase()) : -1;
  const competitorIndexes = identity.competitors
    .map((name) => lowerAnswer.indexOf(name.toLocaleLowerCase()))
    .filter((index) => index >= 0);
  const firstCompetitorIndex = competitorIndexes.length ? Math.min(...competitorIndexes) : Number.POSITIVE_INFINITY;

  const attemptRows = await supabaseRest<Array<{ id: string }>>("run_attempts?on_conflict=run_id,prompt_id,provider,attempt_number", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: run.organization_id,
      run_id: run.id,
      prompt_id: prompt.prompt_id,
      prompt_key: prompt.prompt_key,
      provider: providerId,
      model: answer.model,
      attempt_number: attemptNumber,
      status: "complete",
      raw_response: answer.raw,
      provider_request_id: answer.requestId,
      usage_input_tokens: answer.usage?.inputTokens,
      usage_output_tokens: answer.usage?.outputTokens,
      usage_total_tokens: answer.usage?.totalTokens,
      estimated_cost_usd: estimatedCost,
      cost_source: costSource,
      retryable: false,
      latency_ms: answer.latencyMs,
      completed_at: answer.collectedAt,
    },
  });
  const attemptId = attemptRows[0]?.id;

  const answerRows = await supabaseRest<Array<{ id: string }>>("run_answers?on_conflict=run_id,prompt_key,provider", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      run_id: run.id,
      organization_id: run.organization_id,
      prompt_id: prompt.prompt_id,
      prompt_key: prompt.prompt_key,
      prompt_text: prompt.prompt_text,
      provider: answer.provider,
      model: answer.model,
      answer_text: answer.answer,
      citations_json: answer.citations,
      raw_json: answer.raw,
      brand_present: includesName(answer.answer, identity.brand),
      brand_position: brandIndex >= 0 ? (brandIndex < firstCompetitorIndex ? 1 : 2) : null,
      collected_at: answer.collectedAt,
      latency_ms: answer.latencyMs,
      review_status: "unreviewed",
      usage_input_tokens: answer.usage?.inputTokens,
      usage_output_tokens: answer.usage?.outputTokens,
      usage_total_tokens: answer.usage?.totalTokens,
      estimated_cost_usd: estimatedCost,
      cost_source: costSource,
      provider_request_id: answer.requestId,
      finish_reason: answer.finishReason,
    },
  });
  const answerId = answerRows[0]?.id;
  if (!answerId) throw new Error("The provider answer could not be persisted.");

  if (attemptId) {
    await supabaseRest("ai_cost_events?on_conflict=run_attempt_id", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=minimal",
      body: {
        organization_id: run.organization_id,
        run_id: run.id,
        run_attempt_id: attemptId,
        provider: providerId,
        model: answer.model,
        input_tokens: answer.usage?.inputTokens,
        output_tokens: answer.usage?.outputTokens,
        total_tokens: answer.usage?.totalTokens,
        estimated_cost_usd: estimatedCost,
        cost_source: costSource,
        observed_at: answer.collectedAt,
      },
    });
  }

  const seen = new Set<string>();
  let citationCount = 0;
  for (const [index, citation] of answer.citations.entries()) {
    const canonicalUrl = canonicalizeEvidenceUrl(citation.url);
    if (!canonicalUrl || seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);
    const sourceRows = await supabaseRest<Array<{ id: string }>>("sources?on_conflict=organization_id,canonical_url", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=representation",
      body: {
        organization_id: run.organization_id,
        canonical_url: canonicalUrl,
        domain: hostnameFromUrl(canonicalUrl),
        page_title: citation.title || hostnameFromUrl(canonicalUrl),
        source_type: "provider-returned citation",
        last_observed_at: answer.collectedAt,
      },
    });
    const sourceId = sourceRows[0]?.id;
    if (!sourceId) continue;
    await Promise.all([
      supabaseRest("citations?on_conflict=run_answer_id,source_id", {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=merge-duplicates,return=minimal",
        body: { organization_id: run.organization_id, run_answer_id: answerId, source_id: sourceId, ordinal: index + 1 },
      }),
      supabaseRest("source_observations?on_conflict=observation_key", {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=merge-duplicates,return=minimal",
        body: {
          organization_id: run.organization_id,
          source_id: sourceId,
          run_answer_id: answerId,
          observation_key: `${answerId}:${sourceId}`,
          prompt_id: prompt.prompt_id,
          provider: providerId,
          citation_ordinal: index + 1,
          observed_at: answer.collectedAt,
          review_status: "unreviewed",
        },
      }),
    ]);
    citationCount += 1;
  }
  return { answer, citationCount, estimatedCost };
}

export const runMultiEngineScan = inngest.createFunction(
  {
    id: "run-multi-engine-scan",
    idempotency: "event.data.runId",
    retries: LIVE_COLLECTION_LIMITS.providerRetries,
    concurrency: [{ limit: 4 }, { limit: 1, key: "event.data.organizationId" }],
    timeouts: { start: "5m", finish: "10m" },
    cancelOn: [{ event: "foremention/run.cancelled", if: "async.data.runId == event.data.runId" }],
    triggers: { event: "foremention/run.requested" },
    onFailure: async ({ event }) => {
      const original = event.data.event as { data?: RunRequestedData } | undefined;
      if (original?.data?.runId && original.data.organizationId) {
        await markRunFailed(original.data, "Background collection exhausted its retry limit.", true);
      }
    },
  },
  async ({ event, step, attempt }) => {
    const data = event.data as RunRequestedData;
    const run = await step.run("load-and-revalidate-run", () => loadRun(data));
    if (!run) return { runId: data.runId, skipped: true };

    const [prompts, identity] = await Promise.all([
      step.run("load-run-prompt-snapshots", () =>
        supabaseRest<PromptSelection[]>(
          `run_prompt_selections?select=prompt_id,prompt_key,prompt_text,locale&organization_id=eq.${run.organization_id}&run_id=eq.${run.id}&order=created_at.asc`,
          { serviceRole: true },
        )),
      step.run("load-workspace-identity", async () => {
        const [projects, competitors] = await Promise.all([
          supabaseRest<Array<{ client_brand: string }>>(
            `projects?select=client_brand&id=eq.${run.project_id}&organization_id=eq.${run.organization_id}&status=eq.active&limit=1`,
            { serviceRole: true },
          ),
          supabaseRest<Array<{ name: string }>>(
            `competitors?select=name&project_id=eq.${run.project_id}&organization_id=eq.${run.organization_id}&active=eq.true`,
            { serviceRole: true },
          ),
        ]);
        if (!projects[0]) throw new Error("The validated project is not active.");
        return { brand: projects[0].client_brand, competitors: competitors.map((row) => row.name) };
      }),
    ]);
    if (!prompts.length || prompts.length > LIVE_COLLECTION_LIMITS.maxPromptsPerRun) {
      throw new Error("The queued run has an invalid prompt snapshot.");
    }


    const providerId = run.provider_ids[0];
    const adapter = getProvider(providerId);
    const model = String(process.env[`${providerId.toUpperCase()}_MODEL`] || "");
    const providerRates = getProviderCostRates(providerId);
    if (!model || !providerRates) throw new Error("The selected provider model or cost ceiling is not configured.");
    const recentFailureWindow = new Date(Date.now() - LIVE_COLLECTION_LIMITS.circuitWindowMinutes * 60_000).toISOString();
    const recentFailures = await step.run("check-provider-circuit", () =>
      supabaseRest<Array<{ run_id: string }>>(
        `run_attempts?select=run_id&organization_id=eq.${run.organization_id}&provider=eq.${providerId}&status=in.(failed,rate_limited)&created_at=gte.${encodeURIComponent(recentFailureWindow)}&order=created_at.desc&limit=${LIVE_COLLECTION_LIMITS.circuitFailureThreshold * (LIVE_COLLECTION_LIMITS.providerRetries + 1)}`,
        { serviceRole: true },
      ));
    if (hasOpenProviderCircuit(recentFailures)) {
      for (const prompt of prompts) {
        await supabaseRest("run_attempts", {
          method: "POST",
          serviceRole: true,
          prefer: "return=minimal",
          body: {
            organization_id: run.organization_id,
            run_id: run.id,
            prompt_id: prompt.prompt_id,
            prompt_key: prompt.prompt_key,
            provider: providerId,
            model,
            attempt_number: attempt + 1,
            status: "excluded",
            error_code: "circuit_open",
            error_detail: "Provider calls are paused after repeated recent failures.",
            retryable: true,
            completed_at: new Date().toISOString(),
          },
        });
      }
      await markRunFailed(data, "Provider circuit is temporarily open after repeated failures.", true);
      return { runId: run.id, answers: 0, citations: 0, failures: prompts.length };
    }

    await step.run("mark-run-running", () =>
      supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${run.organization_id}&status=eq.queued`, {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=minimal",
        body: { status: "running", started_at: new Date().toISOString() },
      }));

    const results: Array<{ answer: ProviderAnswer; citationCount: number; estimatedCost: number }> = [];
    const failures: Array<{ promptId: string; error: string }> = [];
    for (const prompt of prompts) {
      const runState = await step.run(`check-cancellation-${prompt.prompt_key}`, () =>
        supabaseRest<Array<{ status: string }>>(
          `runs?select=status&id=eq.${run.id}&organization_id=eq.${run.organization_id}&limit=1`,
          { serviceRole: true },
        ));
      if (runState[0]?.status === "cancelled") return { runId: run.id, cancelled: true };
      try {
        const result = await step.run(`collect-${providerId}-${prompt.prompt_key}`, async () => {
          const startedAt = new Date().toISOString();
          await supabaseRest("run_attempts?on_conflict=run_id,prompt_id,provider,attempt_number", {
            method: "POST",
            serviceRole: true,
            prefer: "resolution=merge-duplicates,return=minimal",
            body: {
              organization_id: run.organization_id,
              run_id: run.id,
              prompt_id: prompt.prompt_id,
              prompt_key: prompt.prompt_key,
              provider: providerId,
              model,
              attempt_number: attempt + 1,
              status: "running",
              started_at: startedAt,
            },
          });
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), LIVE_COLLECTION_LIMITS.providerTimeoutMs);
          try {
            const answer = await adapter.run(
              { promptId: prompt.prompt_id, text: prompt.prompt_text, locale: prompt.locale },
              { signal: controller.signal, maxOutputTokens: LIVE_COLLECTION_LIMITS.maxOutputTokensPerAnswer },
            );
            if (!answer.answer.trim()) throw new Error("The provider returned an empty answer.");
            return await persistAnswer(run, prompt, providerId, answer, identity, attempt + 1);
          } catch (error) {
            await persistFailureAttempt(run, prompt, providerId, model, attempt + 1, error);
            throw error;
          } finally {
            clearTimeout(timer);
          }
        });
        results.push(result);
      } catch (error) {
        failures.push({ promptId: prompt.prompt_id, error: safeOperationalError(error) });
      }
    }

    const answerCount = results.length;
    const citationCount = results.reduce((sum, result) => sum + result.citationCount, 0);
    const actualCostUsd = await step.run("sum-recorded-run-cost", () => recordedRunCost(data));
    const finalState = await step.run("check-final-cancellation", () =>
      supabaseRest<Array<{ status: string }>>(
        `runs?select=status&id=eq.${run.id}&organization_id=eq.${run.organization_id}&limit=1`,
        { serviceRole: true },
      ));
    if (finalState[0]?.status === "cancelled") return { runId: run.id, cancelled: true };
    if (!answerCount) {
      await markRunFailed(data, "Every provider attempt failed. No evidence was invented.");
      return { runId: run.id, answers: 0, citations: 0, failures: failures.length };
    }

    const presenceAnswers = results.filter((result) => includesName(result.answer.answer, identity.brand));
    const firstMentionAnswers = results.filter((result) => {
      const lower = result.answer.answer.toLocaleLowerCase();
      const brandIndex = identity.brand ? lower.indexOf(identity.brand.toLocaleLowerCase()) : -1;
      const competitorIndexes = identity.competitors
        .map((name) => lower.indexOf(name.toLocaleLowerCase()))
        .filter((index) => index >= 0);
      return brandIndex >= 0 && (!competitorIndexes.length || brandIndex < Math.min(...competitorIndexes));
    });
    const uniqueSources = await step.run("count-run-sources", async () => {
      const answerRows = await supabaseRest<Array<{ id: string }>>(
        `run_answers?select=id&organization_id=eq.${run.organization_id}&run_id=eq.${run.id}`,
        { serviceRole: true },
      );
      if (!answerRows.length) return 0;
      const citationRows = await supabaseRest<Array<{ source_id: string }>>(
        `citations?select=source_id&organization_id=eq.${run.organization_id}&run_answer_id=in.(${answerRows.map((row) => row.id).join(",")})`,
        { serviceRole: true },
      );
      return new Set(citationRows.map((row) => row.source_id)).size;
    });

    const completedAt = new Date().toISOString();
    await step.run("mark-run-for-human-review", () =>
      supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${run.organization_id}`, {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=minimal",
        body: {
          status: "review",
          answer_count: answerCount,
          citation_count: citationCount,
          brand_presence_pct: Math.round((presenceAnswers.length / answerCount) * 10_000) / 100,
          first_mention_pct: Math.round((firstMentionAnswers.length / answerCount) * 10_000) / 100,
          new_source_count: uniqueSources,
          actual_cost_usd: actualCostUsd,
          completed_at: completedAt,
          error_summary: failures.length ? `${failures.length} provider attempt(s) failed. Review the successful evidence before publishing.` : null,
        },
      }));
    await step.run("notify-run-owner", () =>
      notifyRunOwner(
        run,
        "run_ready",
        "Collection is ready for review",
        `${answerCount} real answer${answerCount === 1 ? "" : "s"} and ${citationCount} returned citation${citationCount === 1 ? "" : "s"} are ready for human review.`,
      ));
    return { runId: run.id, answers: answerCount, citations: citationCount, failures: failures.length, completedAt };
  },
);

export const cleanupCancelledCollection = inngest.createFunction(
  { id: "cleanup-cancelled-collection", retries: 2, triggers: { event: "inngest/function.cancelled" } },
  async ({ event, step }) => {
    const original = event.data.event as { name?: string; data?: RunRequestedData } | undefined;
    if (original?.name !== "foremention/run.requested" || !original.data?.runId || !original.data.organizationId) {
      return { skipped: true };
    }
    const data = original.data;
    await step.run("mark-cancelled-run", async () => {
      const runs = await supabaseRest<Array<{ status: string; started_at: string | null }>>(
        `runs?select=status,started_at&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&limit=1`,
        { serviceRole: true },
      );
      const run = runs[0];
      if (!run || ["complete", "partial", "failed", "cancelled"].includes(run.status)) return;
      if (!run.started_at) {
        await supabaseRest(`usage_events?organization_id=eq.${data.organizationId}&run_id=eq.${data.runId}`, {
          method: "DELETE",
          serviceRole: true,
        });
      }
      const actualCostUsd = await recordedRunCost(data);
      await supabaseRest(`runs?id=eq.${data.runId}&organization_id=eq.${data.organizationId}`, {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=minimal",
        body: {
          status: "cancelled",
          completed_at: new Date().toISOString(),
          estimated_max_cost_usd: run.started_at ? undefined : 0,
          actual_cost_usd: actualCostUsd,
          error_summary: "Collection was cancelled.",
        },
      });
    });
    return { runId: data.runId, cancelled: true };
  },
);
