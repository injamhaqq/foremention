import { Inngest } from "inngest";
import { toInngestProviderStepError } from "./provider-step-error";
import { recordAgentExecution } from "@/lib/agent-control-plane";
import {
  canonicalizeEvidenceUrl,
  estimateMaximumRunCost,
  estimateReservedRunCost,
  estimateProviderCost,
  GROQ_SPEND_LIMITS,
  getProviderCostRates,
  hasOpenProviderCircuit,
  hostnameFromUrl,
  LIVE_COLLECTION_LIMITS,
  roundUsd,
  safeOperationalError,
} from "@/lib/collection-policy";
import { getProvider } from "@/lib/providers";
import { ProviderRequestError, type ProviderAnswer, type ProviderId } from "@/lib/providers/types";
import { finalizeResolutionFollowUpsForRun } from "@/lib/resolution-follow-ups";
import { supabaseRest } from "@/lib/supabase-rest";
import { generateObservedSourceMap } from "@/lib/source-map-generation";
import { sendWorkspaceEmailAlert } from "@/lib/workspace-email-alerts";
import { deliverWorkspaceWebhooks, type DeliveryEvent } from "@/lib/workspace-webhooks";
import { deliverHubSpotCompletedAction } from "@/lib/hubspot-connector";
import { exportWeeklyDigestToNotion } from "@/lib/notion-connector";
import { logOperationalEvent } from "@/lib/structured-logger";

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

type ScheduledRunSeed = RunRow & { completed_at: string | null };

const includesName = (text: string, value: string) =>
  Boolean(value.trim()) && text.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());

async function notifyFirstCompletedRun(run: RunRow, answerCount: number, citationCount: number, sourceCount: number) {
  if (!run.created_by) return;
  const earlier = await supabaseRest<Array<{ id: string }>>(
    `runs?select=id&organization_id=eq.${run.organization_id}&id=neq.${run.id}&status=in.(review,complete,partial)&limit=1`,
    { serviceRole: true },
  );
  if (earlier.length) return;
  await sendWorkspaceEmailAlert({
    organizationId: run.organization_id,
    userId: run.created_by,
    eventKey: `first_run_completed:${run.id}`,
    kind: "first_run_completed",
    subject: "Your first Foremention collection is ready",
    text: `${answerCount} provider answer${answerCount === 1 ? "" : "s"}, ${citationCount} returned citation${citationCount === 1 ? "" : "s"}, and ${sourceCount} mapped source${sourceCount === 1 ? "" : "s"} are ready for human review. These are observations, not guaranteed outcomes.`,
    href: `/app/runs/${run.id}`,
  });
}

async function sendWeeklyDigest(seed: ScheduledRunSeed, weekKey: string, queued: boolean) {
  if (!seed.created_by) return;
  await sendWorkspaceEmailAlert({
    organizationId: seed.organization_id,
    userId: seed.created_by,
    eventKey: `weekly_digest:${seed.organization_id}:${weekKey}`,
    kind: "weekly_digest",
    subject: "Your weekly Foremention evidence digest",
    text: queued
      ? "Your latest reviewed evidence remains available and a new capped weekly collection was queued. Return after it completes to inspect changes before acting."
      : "Your latest reviewed evidence remains available. No new weekly collection was queued because configuration, capacity, or cost limits did not permit a safe run.",
    href: "/app/analytics",
  });
}

async function prepareWeeklyRun(seed: ScheduledRunSeed, weekKey: string) {
  const providerId = seed.provider_ids[0];
  if (!providerId) return null;
  const rates = getProviderCostRates(providerId);
  if (!rates || !getProvider(providerId).configured()) return null;
  const [prompts, entitlements, activeRuns, monthlyUsage, monthlyRuns] = await Promise.all([
    supabaseRest<PromptSelection[]>(`run_prompt_selections?select=prompt_id,prompt_key,prompt_text,locale&organization_id=eq.${seed.organization_id}&run_id=eq.${seed.id}&order=created_at.asc`, { serviceRole: true }),
    supabaseRest<Array<{ monthly_run_units: number; monthly_ai_spend_cap_usd: number | string; status: string }>>(`organization_entitlements?select=monthly_run_units,monthly_ai_spend_cap_usd,status&organization_id=eq.${seed.organization_id}&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ id: string }>>(`runs?select=id&organization_id=eq.${seed.organization_id}&status=in.(queued,running)&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ units: number }>>(`usage_events?select=units&organization_id=eq.${seed.organization_id}&period_start=eq.${new Date().toISOString().slice(0, 7)}-01`, { serviceRole: true }),
    supabaseRest<Array<{ actual_cost_usd: number | string; estimated_max_cost_usd: number | string; status: string; started_at: string | null }>>(`runs?select=actual_cost_usd,estimated_max_cost_usd,status,started_at&organization_id=eq.${seed.organization_id}&created_at=gte.${encodeURIComponent(`${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`)}`, { serviceRole: true }),
  ]);
  const entitlement = entitlements[0];
  if (!entitlement || entitlement.status !== "active" || activeRuns.length || !prompts.length) return null;
  const requestedUnits = prompts.length;
  const usedUnits = monthlyUsage.reduce((sum, row) => sum + Number(row.units || 0), 0);
  const estimatedMaximumCost = estimateReservedRunCost(providerId, prompts.length, rates);
  const reservedSpend = monthlyRuns.reduce((sum, row) => sum + (["failed", "cancelled"].includes(row.status) && !row.started_at ? 0 : Number(row.actual_cost_usd || row.estimated_max_cost_usd || 0)), 0);
  if (usedUnits + requestedUnits > entitlement.monthly_run_units || reservedSpend + estimatedMaximumCost > Number(entitlement.monthly_ai_spend_cap_usd)) return null;
  const runId = crypto.randomUUID();
  const idempotencyKey = `weekly:${seed.organization_id}:${weekKey}`;
  const activeRequestKey = `${providerId}:${prompts.map((prompt) => prompt.prompt_id).sort().join(",")}`;
  try {
    await supabaseRest("runs", { method: "POST", serviceRole: true, prefer: "return=minimal", body: { id: runId, organization_id: seed.organization_id, project_id: seed.project_id, category_id: seed.category_id, status: "queued", provider_ids: [providerId], prompt_count: prompts.length, requested_units: requestedUnits, estimated_max_cost_usd: estimatedMaximumCost, idempotency_key: idempotencyKey, active_request_key: activeRequestKey, methodology_version: "3.0", created_by: seed.created_by } });
    await Promise.all([
      supabaseRest("run_prompt_selections", { method: "POST", serviceRole: true, prefer: "return=minimal", body: prompts.map((prompt) => ({ organization_id: seed.organization_id, run_id: runId, prompt_id: prompt.prompt_id, prompt_key: prompt.prompt_key, prompt_text: prompt.prompt_text, locale: prompt.locale })) }),
      supabaseRest("usage_events", { method: "POST", serviceRole: true, prefer: "return=minimal", body: { organization_id: seed.organization_id, meter: "provider_prompt_observation", units: requestedUnits, period_start: `${new Date().toISOString().slice(0, 7)}-01`, run_id: runId } }),
    ]);
    return { runId, organizationId: seed.organization_id };
  } catch (error) {
    await supabaseRest(`usage_events?organization_id=eq.${seed.organization_id}&run_id=eq.${runId}`, { method: "DELETE", serviceRole: true }).catch(() => undefined);
    await supabaseRest(`runs?id=eq.${runId}&organization_id=eq.${seed.organization_id}`, { method: "DELETE", serviceRole: true }).catch(() => undefined);
    console.warn("Scheduled run preparation failed.", safeOperationalError(error));
    return null;
  }
}

async function recordedRunCost(data: RunRequestedData) {
  const events = await supabaseRest<Array<{ estimated_cost_usd: number | string | null }>>(
    `ai_cost_events?select=estimated_cost_usd&organization_id=eq.${data.organizationId}&run_id=eq.${data.runId}`,
    { serviceRole: true },
  );
  return roundUsd(events.reduce((total, event) => total + Number(event.estimated_cost_usd || 0), 0));
}

async function recordedOrganizationMonthlyCost(data: RunRequestedData) {
  const cycleStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const events = await supabaseRest<Array<{ estimated_cost_usd: number | string | null }>>(
    `ai_cost_events?select=estimated_cost_usd&organization_id=eq.${data.organizationId}&created_at=gte.${encodeURIComponent(cycleStart)}`,
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
  const runs = await supabaseRest<Array<{ id: string; organization_id: string; project_id: string; created_by: string | null; status: string; started_at: string | null }>>(
    `runs?select=id,organization_id,project_id,created_by,status,started_at&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&limit=1`,
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
  await finalizeResolutionFollowUpsForRun({
    organizationId: data.organizationId,
    runId: data.runId,
    runStatus: "failed",
  });
  await recordAgentExecution({
    runId: run.id,
    organizationId: run.organization_id,
    projectId: run.project_id,
    agentId: "run-supervisor",
    status: "failed",
    error: reason,
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
  const uniqueCitations: Array<{ canonicalUrl: string; title: string; ordinal: number }> = [];
  for (const [index, citation] of answer.citations.entries()) {
    const canonicalUrl = canonicalizeEvidenceUrl(citation.url);
    if (!canonicalUrl || seen.has(canonicalUrl)) continue;
    seen.add(canonicalUrl);
    uniqueCitations.push({
      canonicalUrl,
      title: citation.title || hostnameFromUrl(canonicalUrl),
      ordinal: index + 1,
    });
  }

  if (!uniqueCitations.length) return { answer, citationCount: 0, estimatedCost };

  const sourceRows = await supabaseRest<Array<{ id: string; canonical_url: string }>>("sources?on_conflict=organization_id,canonical_url", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=representation",
      body: uniqueCitations.map((citation) => ({
        organization_id: run.organization_id,
        canonical_url: citation.canonicalUrl,
        domain: hostnameFromUrl(citation.canonicalUrl),
        page_title: citation.title,
        source_type: "provider-returned citation",
        last_observed_at: answer.collectedAt,
      })),
    });
  const sourceByUrl = new Map(sourceRows.map((source) => [source.canonical_url, source.id]));
  const persistedCitations = uniqueCitations.flatMap((citation) => {
    const sourceId = sourceByUrl.get(citation.canonicalUrl);
    return sourceId ? [{ ...citation, sourceId }] : [];
  });
  if (!persistedCitations.length) return { answer, citationCount: 0, estimatedCost };

  await Promise.all([
      supabaseRest("citations?on_conflict=run_answer_id,source_id", {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=merge-duplicates,return=minimal",
        body: persistedCitations.map((citation) => ({
          organization_id: run.organization_id,
          run_answer_id: answerId,
          source_id: citation.sourceId,
          ordinal: citation.ordinal,
        })),
      }),
      supabaseRest("source_observations?on_conflict=observation_key", {
        method: "POST",
        serviceRole: true,
        prefer: "resolution=merge-duplicates,return=minimal",
        body: persistedCitations.map((citation) => ({
          organization_id: run.organization_id,
          source_id: citation.sourceId,
          run_answer_id: answerId,
          observation_key: `${answerId}:${citation.sourceId}`,
          prompt_id: prompt.prompt_id,
          provider: providerId,
          citation_ordinal: citation.ordinal,
          observed_at: answer.collectedAt,
          review_status: "unreviewed",
        })),
      }),
  ]);
  return { answer, citationCount: persistedCitations.length, estimatedCost };
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
    await step.run("start-run-supervisor", () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "run-supervisor",
        status: "running",
        attemptCount: attempt + 1,
      }));

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
    await step.run("record-question-scout", () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "question-scout",
        status: "complete",
        attemptCount: attempt + 1,
        result: {
          promptCount: prompts.length,
          competitorCount: identity.competitors.length,
          brandConfigured: Boolean(identity.brand),
        },
      }));


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
      await step.run("record-open-circuit-agent-failure", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "answer-collector",
          status: "failed",
          attemptCount: attempt + 1,
          result: { answerCount: 0, failureCount: prompts.length },
          error: "Provider circuit is temporarily open after repeated failures.",
        }));
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
    await step.run("start-answer-collector", () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "answer-collector",
        status: "running",
        attemptCount: attempt + 1,
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
      let answer: ProviderAnswer;
      try {
        answer = await step.run(`collect-${providerId}-${prompt.prompt_key}`, async () => {
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
            logOperationalEvent("provider_request_started", { runId: run.id, provider: providerId, attempt: attempt + 1 });
            const budget = providerId === "groq"
              ? await Promise.all([recordedRunCost(data), recordedOrganizationMonthlyCost(data)]).then(([runSpendSoFarUsd, monthlySpendSoFarUsd]) => ({
                runSpendSoFarUsd,
                monthlySpendSoFarUsd,
                runLimitUsd: GROQ_SPEND_LIMITS.maxRunCostUsd,
                monthlyLimitUsd: GROQ_SPEND_LIMITS.maxMonthlyOrgSpendUsd,
              }))
              : undefined;
            const answer = await adapter.run(
              { promptId: prompt.prompt_id, text: prompt.prompt_text, locale: prompt.locale },
              { signal: controller.signal, maxOutputTokens: LIVE_COLLECTION_LIMITS.maxOutputTokensPerAnswer, budget },
            );
            if (!answer.answer.trim()) throw new Error("The provider returned an empty answer.");
            logOperationalEvent("provider_request_completed", { runId: run.id, provider: providerId, attempt: attempt + 1, status: 200, durationMs: answer.latencyMs });
            return answer;
          } catch (error) {
            logOperationalEvent("provider_request_failed", { runId: run.id, provider: providerId, attempt: attempt + 1, errorCode: error instanceof ProviderRequestError ? error.code : "provider_failure" });
            await persistFailureAttempt(run, prompt, providerId, model, attempt + 1, error);
            throw toInngestProviderStepError(error);
          } finally {
            clearTimeout(timer);
          }
        });
      } catch (error) {
        failures.push({ promptId: prompt.prompt_id, error: safeOperationalError(error) });
        continue;
      }
      // Persistence is a separate durable step so a database retry cannot
      // issue and bill a second provider request.
      const result = await step.run(
        `persist-${providerId}-${prompt.prompt_key}`,
        () => persistAnswer(run, prompt, providerId, answer, identity, attempt + 1),
      );
      results.push(result);
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
      const failureReasons = Array.from(new Set(failures.map((failure) => failure.error).filter(Boolean)));
      await step.run("record-answer-collector-failure", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "answer-collector",
          status: "failed",
          attemptCount: attempt + 1,
          result: { answerCount: 0, failureCount: failures.length },
          error: failureReasons[0] || "Every provider attempt failed.",
        }));
      await markRunFailed(
        data,
        failureReasons[0] || "Every provider attempt failed. No evidence was invented.",
      );
      return { runId: run.id, answers: 0, citations: 0, failures: failures.length };
    }
    await step.run("record-answer-collector", () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "answer-collector",
        status: "complete",
        attemptCount: attempt + 1,
        result: { answerCount, failureCount: failures.length },
      }));

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
    await Promise.all([
      step.run("record-evidence-mapper", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "evidence-mapper",
          status: "complete",
          attemptCount: attempt + 1,
          result: { citationCount, sourceCount: uniqueSources },
        })),
      step.run("record-brand-observer", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "brand-observer",
          status: "complete",
          attemptCount: attempt + 1,
          result: {
            presencePct: Math.round((presenceAnswers.length / answerCount) * 10_000) / 100,
            firstMentionPct: Math.round((firstMentionAnswers.length / answerCount) * 10_000) / 100,
          },
        })),
    ]);

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
    let mappedSourceCount = 0;
    try {
      const generated = await step.run("generate-observed-source-map", () => generateObservedSourceMap(run));
      mappedSourceCount = generated.sourceCount;
    } catch (error) {
      console.warn("Observed Source Map generation will be retried after review.", safeOperationalError(error));
    }
    await step.run("notify-run-owner", () =>
      notifyRunOwner(
        run,
        "run_ready",
        "Collection is ready for review",
        `${answerCount} real answer${answerCount === 1 ? "" : "s"} and ${citationCount} returned citation${citationCount === 1 ? "" : "s"} are ready for human review.`,
      ));
    await step.run("email-first-run-owner", () => notifyFirstCompletedRun(run, answerCount, citationCount, mappedSourceCount));
    await step.sendEvent("deliver-collection-webhooks", {
      id: `workspace-event-collection-${run.id}`,
      name: "foremention/workspace.event",
      data: { organizationId: run.organization_id, eventKey: `collection.completed:${run.id}`, eventType: "collection.completed", occurredAt: completedAt, href: `/app/runs/${run.id}` } satisfies DeliveryEvent,
    });
    await Promise.all([
      step.run("record-human-review-gate", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "human-review-gate",
          status: "complete",
          attemptCount: attempt + 1,
        result: { nextState: "human_review_required", answerCount, citationCount, sourceCount: mappedSourceCount },
        })),
      step.run("complete-run-supervisor", () =>
        recordAgentExecution({
          runId: run.id,
          organizationId: run.organization_id,
          projectId: run.project_id,
          agentId: "run-supervisor",
          status: "complete",
          attemptCount: attempt + 1,
          result: { retryCount: attempt, failedAgents: 0, failedPrompts: failures.length },
        })),
    ]);
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
      await finalizeResolutionFollowUpsForRun({
        organizationId: data.organizationId,
        runId: data.runId,
        runStatus: "cancelled",
      });
    });
    return { runId: data.runId, cancelled: true };
  },
);

export const scheduleWeeklyWorkspaceRuns = inngest.createFunction(
  {
    id: "schedule-weekly-workspace-runs",
    retries: 2,
    triggers: { cron: "0 8 * * 1" },
  },
  async ({ step }) => {
    const seeds = await step.run("load-weekly-workspaces", async () => {
      const rows = await supabaseRest<ScheduledRunSeed[]>(
        "runs?select=id,organization_id,project_id,category_id,status,provider_ids,created_by,completed_at&status=in.(complete,partial)&order=created_at.desc&limit=1000",
        { serviceRole: true },
      );
      const byOrganization = new Map<string, ScheduledRunSeed>();
      for (const row of rows) if (!byOrganization.has(row.organization_id)) byOrganization.set(row.organization_id, row);
      return Array.from(byOrganization.values());
    });
    const weekKey = new Date().toISOString().slice(0, 10);
    const queued: RunRequestedData[] = [];
    for (const seed of seeds) {
      const prepared = await step.run(`prepare-weekly-${seed.organization_id}`, () => prepareWeeklyRun(seed, weekKey));
      if (prepared) queued.push(prepared);
      await step.run(`email-weekly-digest-${seed.organization_id}`, () => sendWeeklyDigest(seed, weekKey, Boolean(prepared)));
      await step.run(`notion-weekly-digest-${seed.organization_id}`, () => exportWeeklyDigestToNotion(seed.organization_id, weekKey));
    }
    if (queued.length) {
      await step.sendEvent("queue-weekly-runs", queued.map((data) => ({
        id: `foremention-weekly-${data.runId}`,
        name: "foremention/run.requested",
        data,
      })));
    }
    return { eligibleWorkspaces: seeds.length, queuedRuns: queued.length, weekKey };
  },
);

export const deliverWorkspaceWebhookEvents = inngest.createFunction(
  { id: "deliver-workspace-webhook-events", retries: 3, triggers: { event: "foremention/workspace.event" } },
  async ({ event, step }) => step.run("deliver-signed-webhooks", () => deliverWorkspaceWebhooks(event.data as DeliveryEvent)),
);

export const deliverHubSpotActionEvents = inngest.createFunction(
  { id: "deliver-hubspot-action-events", retries: 3, triggers: { event: "foremention/integration.hubspot-action" } },
  async ({ event, step }) => step.run("write-hubspot-activity", () => deliverHubSpotCompletedAction(event.data as { organizationId: string; placementId: string; eventKey: string; stage: string; occurredAt: string })),
);
