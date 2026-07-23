import { Inngest } from "inngest";
import { getProvider } from "@/lib/providers";
import type { ProviderAnswer, ProviderId, ProviderPrompt } from "@/lib/providers/types";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const inngest = new Inngest({ id: "foremention" });

type RunRequestedData = { runId: string; organizationId: string; prompts: ProviderPrompt[]; providers: ProviderId[] };

export const runMultiEngineScan = inngest.createFunction(
  { id: "run-multi-engine-scan", retries: 2, concurrency: { limit: 4 }, triggers: { event: "foremention/run.requested" } },
  async ({ event, step }) => {
    const { runId, organizationId, prompts, providers } = event.data as RunRequestedData;
    const results: ProviderAnswer[] = [];
    const failures: Array<{ provider: ProviderId; promptId: string; error: string }> = [];
    if (supabaseConfigured()) {
      await step.run("mark-run-running", () => supabaseRest(`runs?id=eq.${runId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "running", started_at: new Date().toISOString() } }));
    }
    for (const providerId of providers) {
      for (const prompt of prompts) {
        const outcome = await step.run(`${providerId}-${prompt.promptId}`, async () => {
          try { return { ok: true as const, answer: await getProvider(providerId).run(prompt) }; }
          catch (error) { return { ok: false as const, error: error instanceof Error ? error.message : "Unknown provider failure." }; }
        });
        if (!outcome.ok) {
          failures.push({ provider: providerId, promptId: prompt.promptId, error: outcome.error });
          continue;
        }
        const answer = outcome.answer;
        results.push(answer);
        if (supabaseConfigured()) {
          await step.run(`persist-${providerId}-${prompt.promptId}`, () => supabaseRest("run_answers?on_conflict=run_id,prompt_key,provider", { method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal", body: { run_id: runId, organization_id: organizationId, prompt_key: prompt.promptId, provider: answer.provider, model: answer.model, answer_text: answer.answer, citations_json: answer.citations, raw_json: answer.raw, collected_at: answer.collectedAt, latency_ms: answer.latencyMs, review_status: "unreviewed" } }));
        }
      }
    }
    const citations = results.reduce((sum, item) => sum + item.citations.length, 0);
    const completedAt = new Date().toISOString();
    if (supabaseConfigured()) {
      await step.run("mark-run-complete", () => supabaseRest(`runs?id=eq.${runId}`, { method: "PATCH", serviceRole: true, prefer: "return=minimal", body: { status: "review", answer_count: results.length, citation_count: citations, completed_at: completedAt, error_summary: failures.length ? `${failures.length} provider attempt(s) failed. Review the run before publishing.` : null } }));
    }
    return { runId, answers: results.length, citations, failures, completedAt };
  },
);
