import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import {
  configuredMaxRunCostUsd,
  estimateMaximumRunCost,
  getProviderCostRates,
  LIVE_COLLECTION_LIMITS,
  safeOperationalError,
} from "@/lib/collection-policy";
import { getPrimaryWorkspaceRole, getProviderStatuses, loadPrompts, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { inngest } from "@/lib/jobs/inngest";
import { runUnits } from "@/lib/product-limits";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import { supabaseRest } from "@/lib/supabase-rest";

type LiveProviderId = Exclude<ProviderId, "mock">;

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadRuns(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { promptIds?: string[]; providers?: ProviderId[] };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "The collection request is not valid JSON." }, { status: 400 });
  }
  if (!body.promptIds?.length || !body.providers?.length) {
    return NextResponse.json({ error: "Choose at least one active buyer question and one configured provider." }, { status: 400 });
  }
  const promptIds = Array.from(new Set(body.promptIds));
  const providers = Array.from(new Set(body.providers));
  if (
    promptIds.length > LIVE_COLLECTION_LIMITS.maxPromptsPerRun
    || promptIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))
  ) {
    return NextResponse.json({ error: `Select between 1 and ${LIVE_COLLECTION_LIMITS.maxPromptsPerRun} active buyer questions.` }, { status: 400 });
  }
  if (providers.length !== LIVE_COLLECTION_LIMITS.maxProvidersPerRun) {
    return NextResponse.json({ error: "Choose exactly one provider for this controlled collection." }, { status: 400 });
  }
  const allowedProviders = new Set<ProviderId>(["openai", "gemini", "anthropic", "perplexity", "groq", "cloudflare", "openrouter", "zenmux", "omnirouters", "mock"]);
  if (providers.some((provider) => !allowedProviders.has(provider))) {
    return NextResponse.json({ error: "The selected provider is not supported." }, { status: 400 });
  }

  if (viewer.mode === "demo") {
    if (providers[0] !== "mock") return NextResponse.json({ error: "The fictional demo can use only its isolated mock provider." }, { status: 400 });
    return NextResponse.json({
      id: crypto.randomUUID(),
      status: "demo-queued",
      note: "Demo mode shows the workflow without writing customer data or calling a paid provider.",
    }, { status: 202 });
  }
  if (providers[0] === "mock") {
    return NextResponse.json({ error: "The mock provider is isolated to the labelled demo." }, { status: 400 });
  }
  const providerId = providers[0] as LiveProviderId;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || !/^[a-zA-Z0-9:_-]{16,100}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: "A valid idempotency key is required to start a collection safely." }, { status: 400 });
  }

  const [context, role, workspacePrompts] = await Promise.all([
    loadWorkspaceContext(viewer),
    getPrimaryWorkspaceRole(viewer),
    loadPrompts(viewer),
  ]);
  if (!context || !role) return NextResponse.json({ error: "Complete onboarding before starting a collection run." }, { status: 409 });
  if (role === "viewer") return NextResponse.json({ error: "Only owners and analysts can start collection runs." }, { status: 403 });

  const existingRuns = await supabaseRest<Array<{ id: string; status: string }>>(
    `runs?select=id,status&organization_id=eq.${context.organizationId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`,
    { token: viewer.accessToken },
  );
  if (existingRuns[0]) {
    return NextResponse.json({ id: existingRuns[0].id, status: existingRuns[0].status, duplicate: true }, { status: 202 });
  }

  const requested = new Set(promptIds);
  const prompts = workspacePrompts
    .filter((prompt) => requested.has(prompt.id) && prompt.approved)
    .map((prompt) => ({ promptId: prompt.id, promptKey: prompt.id, text: prompt.text, locale: "en-US" }));
  if (prompts.length !== requested.size) {
    return NextResponse.json({ error: "Every selected buyer question must be active in your workspace." }, { status: 403 });
  }

  const configured = new Set(
    getProviderStatuses().filter((provider) => provider.configured).map((provider) => provider.id),
  );
  const rates = getProviderCostRates(providerId);
  if (!configured.has(providerId) || !rates) {
    return NextResponse.json({
      error: "This provider requires a secure server connection, explicit model ID, and current input/output cost rates before it can run.",
    }, { status: 503 });
  }
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY
    || !process.env.INNGEST_EVENT_KEY
    || !process.env.INNGEST_SIGNING_KEY
  ) {
    return NextResponse.json({
      error: "Live collection needs the server database secret and verified Inngest event/signing keys.",
    }, { status: 503 });
  }
  try {
    getProvider(providerId);
  } catch {
    return NextResponse.json({ error: "The selected provider is not configured for live collection." }, { status: 503 });
  }
  const estimatedMaximumCost = estimateMaximumRunCost(prompts.length, rates);
  if (estimatedMaximumCost > configuredMaxRunCostUsd()) {
    return NextResponse.json({
      error: "This collection exceeds the configured per-run spending ceiling. Select fewer questions or raise the ceiling privately.",
    }, { status: 422 });
  }

  const runId = crypto.randomUUID();
  const requestedUnits = runUnits(prompts.length, 1);
  let quotaReserved = false;
  let capacityStage = "create-run";
  try {
    await supabaseRest("runs", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: {
        id: runId,
        organization_id: context.organizationId,
        project_id: context.projectId,
        category_id: context.categoryId,
        status: "queued",
        provider_ids: [providerId],
        prompt_count: prompts.length,
        requested_units: requestedUnits,
        estimated_max_cost_usd: estimatedMaximumCost,
        idempotency_key: idempotencyKey,
        methodology_version: "3.0",
        created_by: viewer.id,
      },
    });
    capacityStage = "snapshot-prompts";
    await supabaseRest("run_prompt_selections", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=minimal",
      body: prompts.map((prompt) => ({
        organization_id: context.organizationId,
        run_id: runId,
        prompt_id: prompt.promptId,
        prompt_key: prompt.promptKey,
        prompt_text: prompt.text,
        locale: prompt.locale,
      })),
    });
    capacityStage = "reserve-usage";
    await supabaseRest("rpc/reserve_run_quota", {
      method: "POST",
      token: viewer.accessToken,
      body: { p_organization_id: context.organizationId, p_units: requestedUnits, p_run_id: runId },
    });
    quotaReserved = true;
    capacityStage = "reserve-budget";
    await supabaseRest("rpc/reserve_run_budget", {
      method: "POST",
      token: viewer.accessToken,
      body: {
        p_organization_id: context.organizationId,
        p_run_id: runId,
        p_estimated_max_cost_usd: estimatedMaximumCost,
      },
    });
  } catch (error) {
    console.warn(`Collection capacity failed during ${capacityStage}.`, safeOperationalError(error));
    const concurrentDuplicate = await supabaseRest<Array<{ id: string; status: string }>>(
      `runs?select=id,status&organization_id=eq.${context.organizationId}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&limit=1`,
      { token: viewer.accessToken },
    ).catch(() => []);
    if (concurrentDuplicate[0] && concurrentDuplicate[0].id !== runId) {
      return NextResponse.json({ id: concurrentDuplicate[0].id, status: concurrentDuplicate[0].status, duplicate: true }, { status: 202 });
    }
    if (quotaReserved) {
      await supabaseRest("rpc/release_queued_run", {
        method: "POST",
        token: viewer.accessToken,
        body: {
          p_organization_id: context.organizationId,
          p_run_id: runId,
          p_reason: safeOperationalError(error),
        },
      }).catch(() => undefined);
    } else {
      await supabaseRest(`runs?id=eq.${runId}&organization_id=eq.${context.organizationId}`, {
        method: "DELETE",
        token: viewer.accessToken,
      }).catch(() => undefined);
    }
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not reserve this workspace's collection capacity.",
    }, { status: 429 });
  }

  try {
    const sent = await inngest.send({
      id: `foremention-run-${runId}`,
      name: "foremention/run.requested",
      data: { runId, organizationId: context.organizationId },
    });
    const queueEventId = sent.ids[0];
    if (queueEventId) {
      await supabaseRest(`runs?id=eq.${runId}&organization_id=eq.${context.organizationId}`, {
        method: "PATCH",
        token: viewer.accessToken,
        prefer: "return=minimal",
        body: { queue_event_id: queueEventId },
      });
    }
  } catch (error) {
    console.warn("Background collection could not be queued.", safeOperationalError(error));
    await supabaseRest("rpc/release_queued_run", {
      method: "POST",
      token: viewer.accessToken,
      body: {
        p_organization_id: context.organizationId,
        p_run_id: runId,
        p_reason: "The background collection service could not accept this run.",
      },
    }).catch(() => undefined);
    return NextResponse.json({
      error: "The run was not queued. Reserved capacity was released; no provider call was made.",
    }, { status: 503 });
  }

  return NextResponse.json({
    id: runId,
    status: "queued",
    estimatedMaximumCostUsd: estimatedMaximumCost,
  }, { status: 202 });
}
