import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getPrimaryOrganizationId, loadRuns } from "@/lib/data";
import { inngest } from "@/lib/jobs/inngest";
import { runUnits } from "@/lib/product-limits";
import { getProvider } from "@/lib/providers";
import type { ProviderId, ProviderPrompt } from "@/lib/providers/types";
import { supabaseRest } from "@/lib/supabase-rest";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await loadRuns(viewer), mode: viewer.mode });
}

export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { organizationId?: string; categoryId?: string; prompts?: ProviderPrompt[]; providers?: ProviderId[] };
  if (!body.organizationId || !body.categoryId || !body.prompts?.length || !body.providers?.length) {
    return NextResponse.json({ error: "organizationId, categoryId, prompts, and providers are required." }, { status: 400 });
  }
  if (body.prompts.length > 100 || body.prompts.some((prompt) => !prompt.promptId || !prompt.text?.trim() || prompt.text.length > 1000)) {
    return NextResponse.json({ error: "Use 1–100 prompts; every prompt needs an ID and no more than 1,000 characters." }, { status: 400 });
  }

  const allowedProviders = new Set<ProviderId>(["openai", "gemini", "anthropic", "perplexity", "mock"]);
  if (body.providers.some((provider) => !allowedProviders.has(provider))) return NextResponse.json({ error: "One or more providers are not supported." }, { status: 400 });

  const runId = crypto.randomUUID();
  if (viewer.mode === "demo") return NextResponse.json({ id: runId, status: "demo-queued", note: "Demo mode validates the run without calling providers." }, { status: 202 });
  if (body.providers.includes("mock")) return NextResponse.json({ error: "The mock provider is available only in demo mode." }, { status: 400 });

  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId || organizationId !== body.organizationId) return NextResponse.json({ error: "Choose the organization attached to your signed-in workspace." }, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.INNGEST_EVENT_KEY) {
    return NextResponse.json({ error: "Live scans are not enabled yet. Foremention keeps provider credentials server-side and does not store customer API keys in the beta." }, { status: 503 });
  }
  try { body.providers.forEach((provider) => getProvider(provider)); }
  catch { return NextResponse.json({ error: "One or more selected providers are not configured for live runs." }, { status: 503 }); }

  await supabaseRest("runs", {
    method: "POST", token: viewer.accessToken, prefer: "return=minimal",
    body: { id: runId, organization_id: organizationId, category_id: body.categoryId, status: "queued", provider_ids: body.providers, prompt_count: body.prompts.length, created_by: viewer.id },
  });
  try {
    await supabaseRest("rpc/reserve_run_quota", {
      method: "POST", token: viewer.accessToken,
      body: { p_organization_id: organizationId, p_units: runUnits(body.prompts.length, body.providers.length), p_run_id: runId },
    });
  } catch (error) {
    await supabaseRest(`runs?id=eq.${runId}`, { method: "DELETE", token: viewer.accessToken });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not reserve this workspace's beta capacity." }, { status: 429 });
  }

  await inngest.send({ name: "foremention/run.requested", data: { runId, organizationId, prompts: body.prompts, providers: body.providers } });
  return NextResponse.json({ id: runId, status: "queued" }, { status: 202 });
}
