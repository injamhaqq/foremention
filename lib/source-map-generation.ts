import { supabaseRest } from "@/lib/supabase-rest";

const METHODOLOGY_VERSION = "3.0";

type RunRow = {
  id: string;
  organization_id: string;
  category_id: string;
  created_by: string | null;
};

type ObservationRow = {
  source_id: string;
  provider: string;
  observed_at: string;
  review_status: string;
  source: {
    canonical_url: string;
    domain: string;
    page_title: string | null;
  } | null;
};

type SourceAggregate = {
  sourceId: string;
  domain: string;
  title: string;
  count: number;
  providers: Set<string>;
  firstObservedAt: string;
  lastObservedAt: string;
};

const engineLabels: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Google AI",
  anthropic: "Claude",
  perplexity: "Perplexity",
  groq: "Groq Compound",
  cloudflare: "Cloudflare Workers AI",
};

/**
 * Builds a Source Map only after the customer verifies the run evidence.
 * Citation recurrence is observed fact. Influence, route and feasibility stay
 * unknown until a separate page-level review records those judgments.
 */
export async function generateReviewedSourceMap(run: RunRow) {
  const answerRows = await supabaseRest<Array<{ id: string }>>(
    `run_answers?select=id&organization_id=eq.${run.organization_id}&run_id=eq.${run.id}`,
    { serviceRole: true },
  );
  const answerIds = answerRows.map((row) => row.id);
  const observations = await supabaseRest<ObservationRow[]>(
    answerIds.length
      ? `source_observations?select=source_id,provider,observed_at,review_status,source:sources(canonical_url,domain,page_title)&organization_id=eq.${run.organization_id}&run_answer_id=in.(${answerIds.join(",")})&review_status=eq.verified`
      : `source_observations?select=source_id,provider,observed_at,review_status,source:sources(canonical_url,domain,page_title)&id=eq.00000000-0000-0000-0000-000000000000`,
    { serviceRole: true },
  );

  const aggregates = new Map<string, SourceAggregate>();
  for (const observation of observations) {
    if (!observation.source || observation.review_status !== "verified") continue;
    const current = aggregates.get(observation.source_id);
    if (current) {
      current.count += 1;
      current.providers.add(engineLabels[observation.provider] || observation.provider);
      if (observation.observed_at < current.firstObservedAt) current.firstObservedAt = observation.observed_at;
      if (observation.observed_at > current.lastObservedAt) current.lastObservedAt = observation.observed_at;
      continue;
    }
    aggregates.set(observation.source_id, {
      sourceId: observation.source_id,
      domain: observation.source.domain,
      title: observation.source.page_title || observation.source.domain,
      count: 1,
      providers: new Set([engineLabels[observation.provider] || observation.provider]),
      firstObservedAt: observation.observed_at,
      lastObservedAt: observation.observed_at,
    });
  }

  const ranked = Array.from(aggregates.values())
    .sort((left, right) => right.count - left.count || left.domain.localeCompare(right.domain));
  const evidenceFrom = ranked.reduce<string | null>(
    (earliest, item) => !earliest || item.firstObservedAt < earliest ? item.firstObservedAt : earliest,
    null,
  );
  const evidenceTo = ranked.reduce<string | null>(
    (latest, item) => !latest || item.lastObservedAt > latest ? item.lastObservedAt : latest,
    null,
  );

  const mapRows = await supabaseRest<Array<{ id: string }>>("source_maps?on_conflict=run_id", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      organization_id: run.organization_id,
      category_id: run.category_id,
      run_id: run.id,
      name: `Reviewed collection ${run.id.slice(0, 8).toUpperCase()}`,
      evidence_from: evidenceFrom,
      evidence_to: evidenceTo,
      status: "draft",
      methodology_version: METHODOLOGY_VERSION,
      created_by: run.created_by,
    },
  });
  const sourceMapId = mapRows[0]?.id;
  if (!sourceMapId) throw new Error("The reviewed Source Map could not be created.");

  if (ranked.length) {
    await supabaseRest("source_map_entries?on_conflict=source_map_id,source_id", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=minimal",
      body: ranked.map((item, index) => ({
        organization_id: run.organization_id,
        source_map_id: sourceMapId,
        source_id: item.sourceId,
        rank: index + 1,
        citation_observations: item.count,
        engines: Array.from(item.providers).sort(),
        client_present: false,
        competitors_present: [],
        entry_route: null,
        feasibility: "unknown",
        influence: "unknown",
        analyst_note: "Verified citation observation only. Page contents, brand presence, influence and entry feasibility have not been reviewed.",
      })),
    });
  }
  await supabaseRest(`source_maps?id=eq.${sourceMapId}&organization_id=eq.${run.organization_id}`, {
    method: "PATCH",
    serviceRole: true,
    prefer: "return=minimal",
    body: { status: "published" },
  });

  return { sourceMapId, sourceCount: ranked.length };
}
