import { Inngest } from "inngest";
import { getProvider } from "@/lib/providers";
import type { ProviderAnswer, ProviderId, ProviderPrompt } from "@/lib/providers/types";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const inngest = new Inngest({ id: "foremention" });

type RunRequestedData = {
  runId: string;
  organizationId: string;
  categoryId: string;
  projectId: string;
  prompts: ProviderPrompt[];
  providers: ProviderId[];
};
type SourceStat = { id: string; title: string; count: number; engines: Set<string> };

const engineLabel: Record<ProviderId, string> = { openai: "ChatGPT", gemini: "Google AI", anthropic: "Claude", perplexity: "Perplexity", mock: "Mock" };
const canonicalize = (value: string) => {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of Array.from(url.searchParams.keys())) if (/^(utm_|gclid|fbclid|ref$)/i.test(key)) url.searchParams.delete(key);
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
    return url.toString();
  } catch { return null; }
};
const hostname = (value: string) => { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; } };
const includesName = (text: string, value: string) => Boolean(value.trim()) && text.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase());

export const runMultiEngineScan = inngest.createFunction(
  { id: "run-multi-engine-scan", retries: 2, concurrency: { limit: 4 }, triggers: { event: "foremention/run.requested" } },
  async ({ event, step }) => {
    const { runId, organizationId, categoryId, projectId, prompts, providers } = event.data as RunRequestedData;
    const results: ProviderAnswer[] = [];
    const failures: Array<{ provider: ProviderId; promptId: string; error: string }> = [];
    const sourceStats = new Map<string, SourceStat>();

    const identity = await step.run("load-workspace-identity", async () => {
      const [projects, competitors] = await Promise.all([
        supabaseRest<Array<{ client_brand: string }>>(`projects?select=client_brand&id=eq.${projectId}&organization_id=eq.${organizationId}&limit=1`, { serviceRole: true }),
        supabaseRest<Array<{ name: string }>>(`competitors?select=name&project_id=eq.${projectId}&organization_id=eq.${organizationId}&active=eq.true`, { serviceRole: true }),
      ]);
      return { brand: projects[0]?.client_brand || "", competitors: competitors.map((row) => row.name) };
    });

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
        const lowerAnswer = answer.answer.toLocaleLowerCase();
        const brandIndex = identity.brand ? lowerAnswer.indexOf(identity.brand.toLocaleLowerCase()) : -1;
        const competitorIndexes = identity.competitors.map((name) => lowerAnswer.indexOf(name.toLocaleLowerCase())).filter((index) => index >= 0);
        const firstCompetitorIndex = competitorIndexes.length ? Math.min(...competitorIndexes) : Number.POSITIVE_INFINITY;
        const answerRows = await step.run(`persist-answer-${providerId}-${prompt.promptId}`, () => supabaseRest<Array<{ id: string }>>("run_answers?on_conflict=run_id,prompt_key,provider", {
          method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=representation",
          body: {
            run_id: runId,
            organization_id: organizationId,
            prompt_id: prompt.promptId,
            prompt_key: prompt.promptId,
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
          },
        }));
        const answerId = answerRows[0]?.id;
        if (!answerId) continue;

        const seen = new Set<string>();
        for (const [index, citation] of answer.citations.entries()) {
          const canonicalUrl = canonicalize(citation.url);
          if (!canonicalUrl || seen.has(canonicalUrl)) continue;
          seen.add(canonicalUrl);
          const sourceRows = await step.run(`source-${providerId}-${prompt.promptId}-${index}`, () => supabaseRest<Array<{ id: string }>>("sources?on_conflict=organization_id,canonical_url", {
            method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=representation",
            body: { organization_id: organizationId, canonical_url: canonicalUrl, domain: hostname(canonicalUrl), page_title: citation.title || hostname(canonicalUrl), source_type: "web source", last_observed_at: answer.collectedAt },
          }));
          const sourceId = sourceRows[0]?.id;
          if (!sourceId) continue;
          await step.run(`citation-${providerId}-${prompt.promptId}-${index}`, () => supabaseRest("citations?on_conflict=run_answer_id,source_id", {
            method: "POST", serviceRole: true, prefer: "resolution=merge-duplicates,return=minimal",
            body: { organization_id: organizationId, run_answer_id: answerId, source_id: sourceId, ordinal: index + 1 },
          }));
          await step.run(`observation-${providerId}-${prompt.promptId}-${index}`, () => supabaseRest("source_observations", {
            method: "POST", serviceRole: true, prefer: "return=minimal",
            body: { organization_id: organizationId, source_id: sourceId, run_answer_id: answerId, prompt_id: prompt.promptId, provider: providerId, citation_ordinal: index + 1, observed_at: answer.collectedAt, review_status: "unreviewed" },
          }));
          const stat = sourceStats.get(sourceId) || { id: sourceId, title: citation.title || hostname(canonicalUrl), count: 0, engines: new Set<string>() };
          stat.count += 1;
          stat.engines.add(engineLabel[providerId]);
          sourceStats.set(sourceId, stat);
        }
      }
    }

    const presenceAnswers = results.filter((answer) => includesName(answer.answer, identity.brand));
    const firstMentionAnswers = results.filter((answer) => {
      const lower = answer.answer.toLocaleLowerCase();
      const brandIndex = identity.brand ? lower.indexOf(identity.brand.toLocaleLowerCase()) : -1;
      const competitorIndexes = identity.competitors.map((name) => lower.indexOf(name.toLocaleLowerCase())).filter((index) => index >= 0);
      return brandIndex >= 0 && (!competitorIndexes.length || brandIndex < Math.min(...competitorIndexes));
    });

    if (sourceStats.size) {
      const mapRows = await step.run("create-source-map", () => supabaseRest<Array<{ id: string }>>("source_maps", {
        method: "POST", serviceRole: true, prefer: "return=representation",
        body: { organization_id: organizationId, category_id: categoryId, name: `Collection ${new Date().toISOString().slice(0, 10)}`, evidence_from: results.at(0)?.collectedAt || new Date().toISOString(), evidence_to: results.at(-1)?.collectedAt || new Date().toISOString(), status: "draft", methodology_version: "2.0" },
      }));
      const sourceMapId = mapRows[0]?.id;
      if (sourceMapId) {
        const ranked = Array.from(sourceStats.values()).sort((a, b) => b.count - a.count);
        for (const [index, stat] of ranked.entries()) {
          await step.run(`map-entry-${index + 1}`, () => supabaseRest("source_map_entries", {
            method: "POST", serviceRole: true, prefer: "return=minimal",
            body: {
              organization_id: organizationId,
              source_map_id: sourceMapId,
              source_id: stat.id,
              rank: index + 1,
              citation_observations: stat.count,
              engines: Array.from(stat.engines),
              client_present: false,
              competitors_present: [],
              entry_route: null,
              feasibility: "unknown",
              influence: stat.count >= 3 ? "high" : stat.count === 2 ? "medium" : "low",
              analyst_note: "Source presence has not been reviewed. This record reflects citation observations only.",
            },
          }));
        }
      }
    }

    const citations = results.reduce((sum, item) => sum + item.citations.length, 0);
    const completedAt = new Date().toISOString();
    if (supabaseConfigured()) {
      await step.run("mark-run-review", () => supabaseRest(`runs?id=eq.${runId}`, {
        method: "PATCH", serviceRole: true, prefer: "return=minimal",
        body: {
          status: "review",
          answer_count: results.length,
          citation_count: citations,
          brand_presence_pct: results.length ? Math.round((presenceAnswers.length / results.length) * 10000) / 100 : 0,
          first_mention_pct: results.length ? Math.round((firstMentionAnswers.length / results.length) * 10000) / 100 : 0,
          new_source_count: sourceStats.size,
          completed_at: completedAt,
          error_summary: failures.length ? `${failures.length} provider attempt(s) failed. Review the run before publishing.` : null,
        },
      }));
    }
    return { runId, answers: results.length, citations, mappedSources: sourceStats.size, failures, completedAt };
  },
);
