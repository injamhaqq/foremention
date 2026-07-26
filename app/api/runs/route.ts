import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getProviderStatuses, loadPrompts, loadRuns, loadWorkspaceContext } from "@/lib/data";
import { inngest } from "@/lib/jobs/inngest";
import { runUnits } from "@/lib/product-limits";
import { getProvider } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadRuns(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as { promptIds?: string[]; providers?: ProviderId[] };
  if (!body.promptIds?.length || !body.providers?.length) {
    return NextResponse.json({ error: "Choose at least one approved question and one connected provider." }, { status: 400 });
  }
  if (body.promptIds.length > 10 || body.promptIds.some((id) => !id || id.length > 100)) {
    return NextResponse.json({ error: "Select between 1 and 10 active buyer questions." }, { status: 400 });
  }
  const allowedProviders = new Set<ProviderId>(["openai", "gemini", "anthropic", "perplexity", "mock"]);
  if (body.providers.some((provider) => !allowedProviders.has(provider))) return NextResponse.json({ error: "One or more providers are not supported." }, { status: 400 });

  const runId = crypto.randomUUID();
  if (viewer.mode === "demo") return NextResponse.json({ id: runId, status: "demo-queued", note: "Demo mode validates the workflow without calling providers." }, { status: 202 });
  if (body.providers.includes("mock")) return NextResponse.json({ error: "The mock provider is available only in demo mode." }, { status: 400 });

  const [context, workspacePrompts] = await Promise.all([loadWorkspaceContext(viewer), loadPrompts(viewer)]);
  if (!context) return NextResponse.json({ error: "Complete onboarding before starting a collection run." }, { status: 409 });
  const requested = new Set(body.promptIds);
  const prompts = workspacePrompts.filter((prompt) => requested.has(prompt.id) && prompt.approved).map((prompt) => ({ promptId: prompt.id, text: prompt.text }));
  if (prompts.length !== requested.size) return NextResponse.json({ error: "Every selected question must be active in your workspace." }, { status: 403 });

  const configured = new Set(getProviderStatuses().filter((provider) => provider.configured).map((provider) => provider.id));
  if (body.providers.some((provider) => !configured.has(provider as Exclude<ProviderId, "mock">))) return NextResponse.json({ error: "One or more selected providers are not connected." }, { status: 503 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.INNGEST_EVENT_KEY) {
    return NextResponse.json({ error: "Live collection is not enabled yet. A server-side database key and background-job connection are required." }, { status: 503 });
  }
  try { body.providers.forEach((provider) => getProvider(provider)); }
  catch { return NextResponse.json({ error: "One or more selected providers are not configured for live runs." }, { status: 503 }); }

  await supabaseRest("runs", {
    method: "POST", token: viewer.accessToken, prefer: "return=minimal",
    body: { id: runId, organization_id: context.organizationId, category_id: context.categoryId, status: "queued", provider_ids: body.providers, prompt_count: prompts.length, created_by: viewer.id },
  });
  try {
    await supabaseRest("rpc/reserve_run_quota", {
      method: "POST", token: viewer.accessToken,
      body: { p_organization_id: context.organizationId, p_units: runUnits(prompts.length, body.providers.length), p_run_id: runId },
    });
  } catch (error) {
    await supabaseRest(`runs?id=eq.${runId}`, { method: "DELETE", token: viewer.accessToken });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reserve this workspace's capacity." }, { status: 429 });
  }

  await inngest.send({ name: "foremention/run.requested", data: { runId, organizationId: context.organizationId, categoryId: context.categoryId, projectId: context.projectId, prompts, providers: body.providers } });
  return NextResponse.json({ id: runId, status: "queued" }, { status: 202 });
}
