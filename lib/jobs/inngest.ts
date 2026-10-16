import { confirmRunReviewTransition, type ReviewTransitionSnapshot } from "./run-review-transition";
import { isStuckActiveRun, settleRunTerminal, STUCK_RUN_GRACE_MINUTES, type ActiveRunRow, type RunSettlementIo, type RunSettlementSnapshot } from "./run-terminal-settlement";
import { isoWeekKey } from "./job-calendar";
import { Inngest, NonRetriableError } from "inngest";
import { toInngestProviderStepError } from "./provider-step-error";
import { measureRunPhase } from "./run-phase-timing";
import { attachProviderAttempt, resolveProviderAttempt, type ProviderAttemptReceipt } from "./provider-attempt-receipt";
import { recordAgentExecution } from "@/lib/agent-control-plane";
import {
  canonicalizeEvidenceUrl,
  estimateMaximumRunCost,
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
import { answerEvidenceReceipt } from "@/lib/evidence-receipt";
import { providerAllowedForMeasurementLane } from "@/lib/measurement-lane.mjs";
import { providerAllowedForLiveCollection } from "@/lib/free-provider-mode";
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
  projectId: string;
};
type RunRow = {
  id: string;
  organization_id: string;
  project_id: string;
  category_id: string;
  status: string;
  provider_ids: LiveProviderId[];
  created_by: string | null;
  idempotency_key: string | null;
  originating_schedule_id: string | null;
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
    `runs?select=id&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&id=neq.${run.id}&status=in.(review,complete,partial)&limit=1`,
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

async function sendWeeklyDigest(seed: ScheduledRunSeed, weekKey: string) {
  if (!seed.created_by) return;
  await sendWorkspaceEmailAlert({
    organizationId: seed.organization_id,
    userId: seed.created_by,
    eventKey: `weekly_digest:${seed.organization_id}:${seed.project_id}:${weekKey}`,
    kind: "weekly_digest",
    subject: "Your weekly Foremention evidence digest",
    text: "Your latest reviewed evidence remains available. Recurring collection follows the active Measurement Schedule for this project; open Foremention to inspect the latest record before acting.",
    href: "/app/analytics",
  });
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

export const INTERRUPTED_RUN_SUMMARY = "Collection was interrupted before completion (worker timeout or platform cancellation). No evidence was invented; start a new collection to retry.";

function scopedRunSettlementIo(data: RunRequestedData): RunSettlementIo {
  const scope = `id=eq.${data.runId}&organization_id=eq.${data.organizationId}&project_id=eq.${data.projectId}`;
  return {
    patchWhere: (filter, body) => supabaseRest<Array<Record<string, unknown>>>(`runs?select=id,status,started_at&${scope}&${filter}`, {
      method: "PATCH",
      serviceRole: true,
      prefer: "return=representation",
      body,
    }),
    reload: async () => (await supabaseRest<RunSettlementSnapshot[]>(
      `runs?select=status,started_at&${scope}&limit=1`,
      { serviceRole: true },
    ))[0] ?? null,
    releaseUsage: async () => {
      await supabaseRest(`usage_events?organization_id=eq.${data.organizationId}&run_id=eq.${data.runId}`, {
        method: "DELETE",
        serviceRole: true,
      });
    },
  };
}

async function markRunFailed(data: RunRequestedData, reason: string, releaseIfNeverStarted = false) {
  const runs = await supabaseRest<Array<{ id: string; organization_id: string; project_id: string; created_by: string | null; status: string; started_at: string | null }>>(
    `runs?select=id,organization_id,project_id,created_by,status,started_at&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&project_id=eq.${data.projectId}&limit=1`,
    { serviceRole: true },
  );
  const run = runs[0];
  if (!run) return { state: "already_settled" as const, currentStatus: null, released: false };
  // Only an ACTIVE run can fail. `review` is a collected, reviewable run: a late
  // onFailure (for example from a notification step) must never erase it. The
  // fenced settlement enforces this at write time; an already-failed unstarted
  // run still has its reservation release completed idempotently.
  const actualCostUsd = await recordedRunCost(data);
  const settlement = await settleRunTerminal(scopedRunSettlementIo(data), {
    status: "failed",
    errorSummary: safeOperationalError(reason),
    releaseIfNeverStarted,
    body: { actual_cost_usd: actualCostUsd },
  });
  if (settlement.state !== "settled") {
    logOperationalEvent("collection_failure_settlement_skipped", { runId: data.runId, reason: "terminal_state" });
    return settlement;
  }
  await finalizeResolutionFollowUpsForRun({
    organizationId: data.organizationId,
    projectId: data.projectId,
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
  return settlement;
}

async function loadRun(data: RunRequestedData) {
  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,organization_id,project_id,category_id,status,provider_ids,created_by,idempotency_key,originating_schedule_id&id=eq.${data.runId}&organization_id=eq.${data.organizationId}&project_id=eq.${data.projectId}&limit=1`,
    { serviceRole: true },
  );
  const run = runs[0];
  if (!run) throw new Error("Queued collection run was not found.");
  if (!["queued", "running"].includes(run.status)) return null;
  if (!run.project_id || !run.category_id) throw new Error("The queued run is missing its validated project or category.");
  if (run.provider_ids.length !== 1) throw new Error("A live run must contain exactly one configured provider.");
  return run;
}

/**
 * The dispatcher verifies entitlement before reservation. The worker must
 * verify it AGAIN before an actual billable call: durable queues can be late.
 * Missing schedule provenance on a legacy scheduled run fails closed.
 */
async function scheduledRunMayCallProvider(run: RunRow): Promise<boolean> {
  if (!run.idempotency_key?.startsWith("measurement-schedule:")) return true;
  if (!run.originating_schedule_id) return false;
  const [schedules, entitlements] = await Promise.all([
    supabaseRest<Array<{ schedule_origin: string; trial_ends_at: string | null; enabled: boolean }>>(
      `measurement_schedules?select=schedule_origin,trial_ends_at,enabled&id=eq.${run.originating_schedule_id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&limit=1`,
      { serviceRole: true },
    ),
    supabaseRest<Array<{ status: string; billing_source: string | null; expires_at: string | null }>>(
      `organization_entitlements?select=status,billing_source,expires_at&organization_id=eq.${run.organization_id}&limit=1`,
      { serviceRole: true },
    ),
  ]);
  const schedule = schedules[0];
  const entitlement = entitlements[0];
  if (!schedule || !schedule.enabled || !entitlement || entitlement.status !== "active") return false;
  if (schedule.schedule_origin === "manual") return true;
  if (schedule.schedule_origin === "paid")
    return ["paddle", "stripe", "creem"].includes(entitlement.billing_source || "")
      && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now());
  if (schedule.schedule_origin !== "trial" || entitlement.billing_source !== "trial" ||
      !schedule.trial_ends_at || !entitlement.expires_at) return false;
  const safeUntil = Math.min(new Date(schedule.trial_ends_at).getTime(), new Date(entitlement.expires_at).getTime());
  return Number.isFinite(safeUntil) && safeUntil - Date.now() > 2 * 60 * 60 * 1000;
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
      // MERGE must clear transient failure details if the same compound row
      // eventually succeeds; otherwise analytics show success plus timeout.
      error_code: null,
      error_detail: null,
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

  // Evidence receipt: hash the exact answer text at write time. The database
  // trigger recomputes the same value authoritatively; a mismatch is logged so
  // normalization drift between runtime and database is visible.
  const receipt = await answerEvidenceReceipt(answer.answer);
  const answerRows = await supabaseRest<Array<{ id: string; answer_text_sha256?: string | null }>>("run_answers?on_conflict=run_id,prompt_key,provider", {
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
      answer_text_sha256: receipt.answer_text_sha256,
      answer_text_hash_version: receipt.answer_text_hash_version,
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
  const storedSha256 = answerRows[0]?.answer_text_sha256;
  if (typeof storedSha256 === "string" && storedSha256 !== receipt.answer_text_sha256) {
    console.warn("Evidence receipt hash differs between runtime and database normalization; the database value is authoritative.", { answerId, version: receipt.answer_text_hash_version });
  }

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
    timeouts: { start: "5m", finish: "30m" },
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
    const run = await step.run("load-and-revalidate-run", () =>
      measureRunPhase("load_run", data.runId, () => loadRun(data)));
    if (!run) return { runId: data.runId, skipped: true };
    // Check active trial/paid schedule ownership at actual worker start.
    const scheduleEntitled = await step.run("scheduled-entitlement-preflight", () => scheduledRunMayCallProvider(run));
    if (!scheduleEntitled) {
      await step.run("fail-expired-scheduled-run", () =>
        markRunFailed(data, "Scheduled collection was held: its confirmed entitlement or original trial window is no longer active.", true));
      return { runId: run.id, skipped: true, reason: "schedule_entitlement_expired" };
    }
    await step.run("start-run-supervisor", () => measureRunPhase("start_supervisor", run.id, () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "run-supervisor",
        status: "running",
        attemptCount: attempt + 1,
      })));

    const [prompts, identity] = await Promise.all([
      step.run("load-run-prompt-snapshots", () => measureRunPhase("load_prompts", run.id, () =>
        supabaseRest<PromptSelection[]>(
          `run_prompt_selections?select=prompt_id,prompt_key,prompt_text,locale&organization_id=eq.${run.organization_id}&run_id=eq.${run.id}&order=created_at.asc`,
          { serviceRole: true },
        ))),
      step.run("load-workspace-identity", () => measureRunPhase("load_identity", run.id, async () => {
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
      })),
    ]);
    if (!prompts.length || prompts.length > LIVE_COLLECTION_LIMITS.maxPromptsPerRun) {
      throw new Error("The queued run has an invalid prompt snapshot.");
    }
    await step.run("record-question-scout", () => measureRunPhase("record_question_scout", run.id, () =>
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
      })));


    const providerId = run.provider_ids[0];
    if (!providerAllowedForLiveCollection(providerId)) {
      await step.run("fail-free-only-blocked-run", () =>
        markRunFailed(data, "The queued provider is disabled by Foremention free-only mode.", true));
      return { runId: run.id, answers: 0, citations: 0, failures: prompts.length, freeOnlyBlocked: true };
    }
    if (!providerAllowedForMeasurementLane(providerId)) {
      await step.run("fail-unpinned-gateway-run", () =>
        markRunFailed(data, "The queued model gateway is not pinned to one exact upstream provider and model, so it cannot produce comparable measurement evidence.", true));
      return { runId: run.id, answers: 0, citations: 0, failures: prompts.length, unpinnedGatewayBlocked: true };
    }
    const adapter = getProvider(providerId);
    // Pin the observation model ONCE per run. Inngest memoizes step output
    // across replays and function-level retries, so a deployment that changes
    // the configured model mid-run cannot split one run across two models.
    const model = await step.run("pin-provider-model", () => String(process.env[`${providerId.toUpperCase()}_MODEL`] || ""));
    // Adapters read the model from configuration at call time, so the pin is
    // enforced by refusing further provider calls once configuration drifts.
    const modelPinHolds = () => model === String(process.env[`${providerId.toUpperCase()}_MODEL`] || "");
    const providerRates = getProviderCostRates(providerId);
    if (!model || !providerRates) throw new Error("The selected provider model or cost ceiling is not configured.");
    const recentFailureWindow = new Date(Date.now() - LIVE_COLLECTION_LIMITS.circuitWindowMinutes * 60_000).toISOString();
    const recentFailures = await step.run("check-provider-circuit", () => measureRunPhase("check_provider_circuit", run.id, () =>
      supabaseRest<Array<{ run_id: string }>>(
        `run_attempts?select=run_id&organization_id=eq.${run.organization_id}&provider=eq.${providerId}&status=in.(failed,rate_limited)&created_at=gte.${encodeURIComponent(recentFailureWindow)}&order=created_at.desc&limit=${LIVE_COLLECTION_LIMITS.circuitFailureThreshold * (LIVE_COLLECTION_LIMITS.providerRetries + 1)}`,
        { serviceRole: true },
      )));
    if (hasOpenProviderCircuit(recentFailures)) {
      // Memoized + conflict-tolerant: code outside step.run re-executes on every
      // Inngest replay, and the old plain inserts hit the unique attempt key
      // on the replay after the next step, failing the function.
      const excludedAttemptNumber = attempt + 1;
      await step.run("record-circuit-open-exclusions", () =>
        supabaseRest("run_attempts?on_conflict=run_id,prompt_id,provider,attempt_number", {
          method: "POST",
          serviceRole: true,
          prefer: "resolution=ignore-duplicates,return=minimal",
          body: prompts.map((prompt) => ({
            organization_id: run.organization_id,
            run_id: run.id,
            prompt_id: prompt.prompt_id,
            prompt_key: prompt.prompt_key,
            provider: providerId,
            model,
            attempt_number: excludedAttemptNumber,
            status: "excluded",
            error_code: "circuit_open",
            error_detail: "Provider calls are paused after repeated recent failures.",
            retryable: true,
            completed_at: new Date().toISOString(),
          })),
        }));
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
      await step.run("fail-circuit-open-run", () =>
        markRunFailed(data, "Provider circuit is temporarily open after repeated failures.", true));
      return { runId: run.id, answers: 0, citations: 0, failures: prompts.length };
    }

    await step.run("mark-run-running", () => measureRunPhase("mark_running", run.id, () =>
      supabaseRest(`runs?id=eq.${run.id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&status=eq.queued`, {
        method: "PATCH",
        serviceRole: true,
        prefer: "return=minimal",
        body: { status: "running", started_at: new Date().toISOString() },
      })));
    await step.run("start-answer-collector", () => measureRunPhase("start_collector", run.id, () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "answer-collector",
        status: "running",
        attemptCount: attempt + 1,
      })));

    const results: Array<{ answer: ProviderAnswer; citationCount: number; estimatedCost: number }> = [];
    const failures: Array<{ promptId: string; error: string }> = [];
    for (const prompt of prompts) {
      const runState = await step.run(`check-cancellation-${prompt.prompt_key}`, () =>
        supabaseRest<Array<{ status: string }>>(
          `runs?select=status&id=eq.${run.id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&limit=1`,
          { serviceRole: true },
        ));
      if (runState[0]?.status === "cancelled") return { runId: run.id, cancelled: true };
      let collected: ProviderAnswer | ProviderAttemptReceipt<ProviderAnswer>;
      try {
        collected = await step.run(`collect-${providerId}-${prompt.prompt_key}`, async () => {
          // Checked only when a NEW provider call would happen (memoized
          // collections from before a configuration change are kept). Answers
          // already collected under the pinned model stay; a second model is
          // never mixed into the same run.
          // Recheck after every durable wait, including between observations.
          // An expired trial can never spend a delayed provider-call step.
          if (!(await scheduledRunMayCallProvider(run))) {
            throw new NonRetriableError("Scheduled collection entitlement expired before this provider call.");
          }
          if (!modelPinHolds()) {
            logOperationalEvent("provider_model_pin_drift", { runId: run.id, provider: providerId });
            throw new NonRetriableError("The configured provider model changed during this run; this question was not collected so the run stays comparable.");
          }
          const startedAt = new Date().toISOString();
          const recordedAttemptNumber = attempt + 1;
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
              attempt_number: recordedAttemptNumber,
              status: "running",
              started_at: startedAt,
            },
          });
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), LIVE_COLLECTION_LIMITS.providerTimeoutMs);
          try {
            logOperationalEvent("provider_request_started", { runId: run.id, provider: providerId, attempt: recordedAttemptNumber });
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
            logOperationalEvent("provider_request_completed", { runId: run.id, provider: providerId, attempt: recordedAttemptNumber, status: 200, durationMs: answer.latencyMs });
            return attachProviderAttempt(answer, recordedAttemptNumber);
          } catch (error) {
            logOperationalEvent("provider_request_failed", { runId: run.id, provider: providerId, attempt: recordedAttemptNumber, errorCode: error instanceof ProviderRequestError ? error.code : "provider_failure" });
            await persistFailureAttempt(run, prompt, providerId, model, recordedAttemptNumber, error);
            throw toInngestProviderStepError(error);
          } finally {
            clearTimeout(timer);
          }
        });
      } catch (error) {
        failures.push({ promptId: prompt.prompt_id, error: safeOperationalError(error) });
        continue;
      }
      // The successful attempt number is serialized inside the collection
      // step result. The function-level "attempt" can change if Inngest
      // replays this separate persistence step, without a fresh provider call.
      const successfulReceipt = resolveProviderAttempt<ProviderAnswer>(collected, attempt + 1);
      if (successfulReceipt.legacy) {
        // In-flight steps from the previous deployment have no stable receipt.
        // Preserve the compatibility path without pretending to know history.
        logOperationalEvent("provider_attempt_legacy_receipt", { runId: run.id, provider: providerId });
      }
      // Persistence stays separate: never re-run a paid provider request to
      // recover an interrupted evidence or cost-ledger write.
      const result = await step.run(
        `persist-${providerId}-${prompt.prompt_key}`,
        () => measureRunPhase("persist_answer", run.id, () =>
          persistAnswer(run, prompt, providerId, successfulReceipt.answer, identity, successfulReceipt.attemptNumber)),
      );
      results.push(result);
    }

    const answerCount = results.length;
    const citationCount = results.reduce((sum, result) => sum + result.citationCount, 0);
    const actualCostUsd = await step.run("sum-recorded-run-cost", () => recordedRunCost(data));
    const finalState = await step.run("check-final-cancellation", () =>
      supabaseRest<Array<{ status: string }>>(
        `runs?select=status&id=eq.${run.id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&limit=1`,
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
      await step.run("fail-all-attempts-run", () => markRunFailed(
        data,
        failureReasons[0] || "Every provider attempt failed. No evidence was invented.",
      ));
      return { runId: run.id, answers: 0, citations: 0, failures: failures.length };
    }
    await step.run("record-answer-collector", () => measureRunPhase("record_collector", run.id, () =>
      recordAgentExecution({
        runId: run.id,
        organizationId: run.organization_id,
        projectId: run.project_id,
        agentId: "answer-collector",
        status: "complete",
        attemptCount: attempt + 1,
        result: { answerCount, failureCount: failures.length },
      })));

    const presenceAnswers = results.filter((result) => includesName(result.answer.answer, identity.brand));
    const firstMentionAnswers = results.filter((result) => {
      const lower = result.answer.answer.toLocaleLowerCase();
      const brandIndex = identity.brand ? lower.indexOf(identity.brand.toLocaleLowerCase()) : -1;
      const competitorIndexes = identity.competitors
        .map((name) => lower.indexOf(name.toLocaleLowerCase()))
        .filter((index) => index >= 0);
      return brandIndex >= 0 && (!competitorIndexes.length || brandIndex < Math.min(...competitorIndexes));
    });
    const uniqueSources = await step.run("count-run-sources", () => measureRunPhase("count_sources", run.id, async () => {
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
    }));
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
    const reviewTransition = await step.run("mark-run-for-human-review", () => measureRunPhase("mark_for_review", run.id, () =>
      confirmRunReviewTransition(
        { runId: run.id, answerCount, citationCount, actualCostUsd },
        {
          // Compare-and-set is essential: cancellation may arrive after the
          // earlier read but before the collector attempts completion.
          markReviewIfRunning: () => supabaseRest<Array<{ id: string }>>(
            `runs?select=id&id=eq.${run.id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&status=eq.running`,
            {
              method: "PATCH",
              serviceRole: true,
              prefer: "return=representation",
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
            },
          ),
          reload: () => supabaseRest<ReviewTransitionSnapshot[]>(
            `runs?select=id,status,answer_count,citation_count,actual_cost_usd&id=eq.${run.id}&organization_id=eq.${run.organization_id}&project_id=eq.${run.project_id}&limit=1`,
            { serviceRole: true },
          ),
        },
      )));
    if (reviewTransition === "terminal") {
      logOperationalEvent("collection_review_skipped_terminal", { runId: run.id, reason: "terminal_state" });
      return { runId: run.id, skipped: true, reason: "terminal_state" };
    }
    let mappedSourceCount = 0;
    try {
      const generated = await step.run("generate-observed-source-map", () =>
        measureRunPhase("generate_source_map", run.id, () => generateObservedSourceMap(run)));
      mappedSourceCount = generated.sourceCount;
    } catch (error) {
      console.warn("Observed Source Map generation will be retried after review.", safeOperationalError(error));
    }
    await step.run("notify-run-owner", () => measureRunPhase("notify_owner", run.id, () =>
      notifyRunOwner(
        run,
        "run_ready",
        "Collection is ready for review",
        `${answerCount} real answer${answerCount === 1 ? "" : "s"} and ${citationCount} returned citation${citationCount === 1 ? "" : "s"} are ready for human review.`,
      )));
    await step.run("email-first-run-owner", () => notifyFirstCompletedRun(run, answerCount, citationCount, mappedSourceCount));
    await step.sendEvent("deliver-collection-webhooks", {
      id: `workspace-event-collection-${run.id}`,
      name: "foremention/workspace.event",
      data: { organizationId: run.organization_id, projectId: run.project_id, eventKey: `collection.completed:${run.id}`, eventType: "collection.completed", occurredAt: completedAt, href: `/app/runs/${run.id}` } satisfies DeliveryEvent,
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
    if (original?.name !== "foremention/run.requested" || !original.data?.runId || !original.data.organizationId || !original.data.projectId) {
      return { skipped: true };
    }
    const data = original.data;
    // A customer cancellation reaches here AFTER the cancel route has already
    // settled the run as `cancelled`. If the run is still active, the Inngest
    // run was cancelled by the platform (start/finish timeout, operator bulk
    // cancel, app removal): that is an interruption, not a customer choice, so
    // it settles as `failed` with an explicit interrupted reason. Either way the
    // write is fenced and never overwrites review/complete/partial runs.
    const outcome = await step.run("settle-cancelled-or-interrupted-run", async () => {
      const actualCostUsd = await recordedRunCost(data);
      const settlement = await settleRunTerminal(scopedRunSettlementIo(data), {
        status: "failed",
        errorSummary: INTERRUPTED_RUN_SUMMARY,
        releaseIfNeverStarted: true,
        body: { actual_cost_usd: actualCostUsd },
      });
      if (settlement.state === "settled") {
        await finalizeResolutionFollowUpsForRun({
          organizationId: data.organizationId,
          projectId: data.projectId,
          runId: data.runId,
          runStatus: "failed",
        });
        logOperationalEvent("collection_interrupted", { runId: data.runId, reason: "platform_cancellation" });
        return "interrupted" as const;
      }
      if (settlement.currentStatus === "cancelled") {
        // Customer cancellation: finish the reservation release idempotently
        // (the route releases only runs its actor created).
        await settleRunTerminal(scopedRunSettlementIo(data), {
          status: "cancelled",
          errorSummary: "Collection was cancelled.",
          releaseIfNeverStarted: true,
        });
        return "cancelled" as const;
      }
      return "already_settled" as const;
    });
    return { runId: data.runId, cancelled: outcome === "cancelled", interrupted: outcome === "interrupted" };
  },
);

export const scheduleWeeklyWorkspaceDigests = inngest.createFunction(
  {
    id: "schedule-weekly-workspace-digests",
    retries: 2,
    triggers: { cron: "0 8 * * 1" },
  },
  async ({ step }) => {
    const seeds = await step.run("load-weekly-digest-projects", async () => {
      const rows = await supabaseRest<ScheduledRunSeed[]>(
        "runs?select=id,organization_id,project_id,category_id,status,provider_ids,created_by,completed_at&status=in.(complete,partial)&order=created_at.desc&limit=1000",
        { serviceRole: true },
      );
      const byProject = new Map<string, ScheduledRunSeed>();
      for (const row of rows) {
        const key = `${row.organization_id}\u0000${row.project_id}`;
        if (!byProject.has(key)) byProject.set(key, row);
      }
      return Array.from(byProject.values());
    });
    // Memoized and week-stable: a retry, replay or manual re-run in the same
    // ISO week reuses the same unique delivery key instead of a new day key.
    const weekKey = await step.run("pin-weekly-digest-week", () => isoWeekKey(new Date()));
    for (const seed of seeds) {
      await step.run(
        `email-weekly-digest-${seed.organization_id}-${seed.project_id}`,
        () => sendWeeklyDigest(seed, weekKey),
      );
      await step.run(
        `notion-weekly-digest-${seed.organization_id}-${seed.project_id}`,
        () => exportWeeklyDigestToNotion(seed.organization_id, seed.project_id, weekKey),
      );
    }
    return { eligibleProjects: seeds.length, weekKey };
  },
);

/**
 * Recovery for interrupted collection runs (CV-12). A run can remain
 * `queued`/`running` forever when its event was lost, the app was unsynced, or
 * the cancellation hook itself failed. Runs active far beyond the collector's
 * hard lifetime (start 5m + finish 30m) are settled through the same fenced
 * terminal write as every other failure, releasing never-started capacity.
 * No provider is called and no evidence is created. Every 3 hours (≈480
 * Inngest executions/month when idle) keeps worst-case detection near five
 * hours without spending a meaningful share of the free execution quota.
 */
export async function reconcileInterruptedCollectionRunsPass(
  step: { run<T>(id: string, fn: () => Promise<T>): Promise<T> },
  now: Date = new Date(),
) {
  const cutoff = new Date(now.getTime() - STUCK_RUN_GRACE_MINUTES * 60_000).toISOString();
  const candidates = await step.run("load-stale-active-runs", () => supabaseRest<ActiveRunRow[]>(
    `runs?select=id,organization_id,project_id,status,created_at,started_at&status=in.(queued,running)&created_at=lt.${encodeURIComponent(cutoff)}&order=created_at.asc&limit=50`,
    { serviceRole: true },
  ));
  let interrupted = 0;
  for (const run of candidates.filter((row) => isStuckActiveRun(row, now))) {
    const result = await step.run(`settle-interrupted-run-${run.id}`, () =>
      markRunFailed({ runId: run.id, organizationId: run.organization_id, projectId: run.project_id }, INTERRUPTED_RUN_SUMMARY, true));
    if (result.state === "settled") interrupted += 1;
  }
  if (interrupted) logOperationalEvent("collection_interrupted_runs_reconciled", { count: interrupted });
  return { candidates: candidates.length, interrupted };
}

export const reconcileInterruptedCollectionRuns = inngest.createFunction(
  { id: "reconcile-interrupted-collection-runs", retries: 2, concurrency: { limit: 1 }, triggers: { cron: "41 */3 * * *" } },
  async ({ step }) => reconcileInterruptedCollectionRunsPass({ run: (id, fn) => step.run(id, fn) as never }),
);

export const deliverWorkspaceWebhookEvents = inngest.createFunction(
  { id: "deliver-workspace-webhook-events", retries: 3, triggers: { event: "foremention/workspace.event" }, concurrency: { limit: 1, key: 'event.data.organizationId + ":" + event.data.eventKey' } },
  async ({ event, step }) => {
    // A crashed sender can leave a 90s fenced receipt lease. Retries must not
    // silently acknowledge an event while the claim is still held.
    for (let leaseRetry = 0; leaseRetry < 4; leaseRetry += 1) {
      const result = await step.run(
        leaseRetry === 0 ? "deliver-signed-webhooks" : `resume-webhook-lease-${leaseRetry}`,
        () => deliverWorkspaceWebhooks(event.data as DeliveryEvent),
      );
      if (result.status !== "deferred") return result;
      if (leaseRetry < 3) await step.sleep(`wait-webhook-lease-${leaseRetry}`, "95s");
    }
    throw new Error("Workspace webhook leases remained active after bounded recovery.");
  },
);

export const deliverHubSpotActionEvents = inngest.createFunction(
  { id: "deliver-hubspot-action-events", retries: 3, triggers: { event: "foremention/integration.hubspot-action" } },
  async ({ event, step }) => step.run("write-hubspot-activity", () => deliverHubSpotCompletedAction(event.data as { organizationId: string; projectId: string; placementId: string; eventKey: string; stage: string; occurredAt: string })),
);
