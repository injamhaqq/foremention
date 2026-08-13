import { supabaseRest } from "@/lib/supabase-rest";
import { inspectSourceUrl } from "@/lib/source-inspection";
import { persistSourceSnapshot } from "@/lib/source-snapshots";

const METHODOLOGY_VERSION = "3.0";

type RunRow = {
  id: string;
  organization_id: string;
  project_id?: string;
  category_id: string;
  created_by: string | null;
};

type ObservationRow = {
  id: string;
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
  observationIds: string[];
  firstObservedAt: string;
  lastObservedAt: string;
  url: string;
};

type PersistedInspection = {
  access: string;
  checkedAt: string | null;
  clientPresent: boolean;
  competitors: string[];
  title: string | null;
};

const engineLabels: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Google AI",
  anthropic: "Claude",
  perplexity: "Perplexity",
  groq: "Groq Compound",
  cloudflare: "Cloudflare Workers AI",
  openrouter: "OpenRouter",
  zenmux: "ZenMux",
  omnirouters: "OmniRouters",
};

/**
 * Builds a Source Map only after the customer verifies the run evidence.
 * Citation recurrence is observed fact. Influence, route and feasibility stay
 * unknown until a separate page-level review records those judgments.
 */
async function inspectMappedSources(run: RunRow, ranked: SourceAggregate[]) {
  if (!run.project_id || !ranked.length) return new Map<string, { access: string; checkedAt: string | null; clientPresent: boolean; competitors: string[]; title: string | null }>();
  const [projects, competitorRows] = await Promise.all([
    supabaseRest<Array<{ client_brand: string }>>(`projects?select=client_brand&id=eq.${run.project_id}&organization_id=eq.${run.organization_id}&limit=1`, { serviceRole: true }),
    supabaseRest<Array<{ name: string }>>(`competitors?select=name&project_id=eq.${run.project_id}&organization_id=eq.${run.organization_id}&active=eq.true`, { serviceRole: true }),
  ]);
  const brand = projects[0]?.client_brand || "";
  const competitors = competitorRows.map((row) => row.name).filter(Boolean);
  const inspected = new Map<string, { access: string; checkedAt: string | null; clientPresent: boolean; competitors: string[]; title: string | null }>();
  for (let offset = 0; offset < ranked.length; offset += 4) {
    await Promise.all(ranked.slice(offset, offset + 4).map(async (source) => {
      try {
        const result = await inspectSourceUrl(source.url, { includePageText: true, maxBytes: 128 * 1024, maxExtractedTextChars: 24_000, timeoutMs: 6_000 });
        const searchable = `${result.pageTitle || ""} ${result.pageDescription || ""} ${result.pageText || ""}`.toLocaleLowerCase();
        const clientPresent = Boolean(brand) && searchable.includes(brand.toLocaleLowerCase());
        const competitorsPresent = competitors.filter((name) => searchable.includes(name.toLocaleLowerCase()));
        const isReachable = result.access === "open" || result.access === "partial";

        await persistSourceSnapshot({
          organizationId: run.organization_id,
          sourceId: source.sourceId,
          canonicalUrl: source.url,
          inspection: result,
          runId: run.id,
          snapshotKey: `${run.id}:${source.sourceId}:source-map-v1`,
          observationIds: source.observationIds,
          createdBy: run.created_by,
          serviceRole: true,
        });

        inspected.set(source.sourceId, { access: result.access, checkedAt: result.checkedAt, clientPresent, competitors: competitorsPresent, title: result.pageTitle });
        await supabaseRest(`sources?id=eq.${source.sourceId}&organization_id=eq.${run.organization_id}`, {
          method: "PATCH",
          serviceRole: true,
          prefer: "return=minimal",
          body: {
            crawler_access: result.access,
            crawler_checked_at: result.checkedAt,
            content_signature: result.contentSignature || null,
            content_length: result.contentLength ?? null,
            ...(isReachable ? { last_reachable_at: result.checkedAt } : {}),
            ...(result.pageTitle ? { page_title: result.pageTitle } : {}),
          },
        });
      } catch {
        inspected.set(source.sourceId, { access: "unknown", checkedAt: null, clientPresent: false, competitors: [], title: null });
      }
    }));
  }
  return inspected;
}

async function loadPersistedInspections(run: RunRow, sourceMapId: string) {
  const rows = await supabaseRest<Array<{
    source_id: string;
    client_present: boolean;
    competitors_present: string[] | null;
    source: { crawler_access: string | null; crawler_checked_at: string | null; page_title: string | null } | null;
  }>>(
    `source_map_entries?select=source_id,client_present,competitors_present,source:sources(crawler_access,crawler_checked_at,page_title)&organization_id=eq.${run.organization_id}&source_map_id=eq.${sourceMapId}`,
    { serviceRole: true },
  );
  return new Map<string, PersistedInspection>(rows.map((row) => [row.source_id, {
    access: row.source?.crawler_access || "unknown",
    checkedAt: row.source?.crawler_checked_at || null,
    clientPresent: Boolean(row.client_present),
    competitors: row.competitors_present || [],
    title: row.source?.page_title || null,
  }]));
}

async function generateSourceMap(run: RunRow, reviewStatus: "all" | "verified") {
  const answerRows = await supabaseRest<Array<{ id: string }>>(
    `run_answers?select=id&organization_id=eq.${run.organization_id}&run_id=eq.${run.id}`,
    { serviceRole: true },
  );
  const answerIds = answerRows.map((row) => row.id);
  const observations = await supabaseRest<ObservationRow[]>(
    answerIds.length
      ? `source_observations?select=id,source_id,provider,observed_at,review_status,source:sources(canonical_url,domain,page_title)&organization_id=eq.${run.organization_id}&run_answer_id=in.(${answerIds.join(",")})${reviewStatus === "verified" ? "&review_status=eq.verified" : ""}`
      : `source_observations?select=id,source_id,provider,observed_at,review_status,source:sources(canonical_url,domain,page_title)&id=eq.00000000-0000-0000-0000-000000000000`,
    { serviceRole: true },
  );

  const aggregates = new Map<string, SourceAggregate>();
  for (const observation of observations) {
    if (!observation.source || (reviewStatus === "verified" && observation.review_status !== "verified")) continue;
    const current = aggregates.get(observation.source_id);
    if (current) {
      current.count += 1;
      current.providers.add(engineLabels[observation.provider] || observation.provider);
      current.observationIds.push(observation.id);
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
      observationIds: [observation.id],
      firstObservedAt: observation.observed_at,
      lastObservedAt: observation.observed_at,
      url: observation.source.canonical_url,
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
      name: `${reviewStatus === "verified" ? "Reviewed" : "Observed"} collection ${run.id.slice(0, 8).toUpperCase()}`,
      evidence_from: evidenceFrom,
      evidence_to: evidenceTo,
      status: "draft",
      methodology_version: METHODOLOGY_VERSION,
      created_by: run.created_by,
    },
  });
  const sourceMapId = mapRows[0]?.id;
  if (!sourceMapId) throw new Error("The reviewed Source Map could not be created.");

  // The background observed-map job performs bounded page inspection once and
  // stores only immutable retrieval metadata plus bounded text fingerprints.
  // Human approval reuses that persisted result so the review click never waits
  // on or repeats an external crawl for every cited page.
  const inspected = reviewStatus === "all"
    ? await inspectMappedSources(run, ranked)
    : await loadPersistedInspections(run, sourceMapId);

  if (ranked.length) {
    await supabaseRest("source_map_entries?on_conflict=source_map_id,source_id", {
      method: "POST",
      serviceRole: true,
      prefer: "resolution=merge-duplicates,return=minimal",
      body: ranked.map((item, index) => {
        const inspection = inspected.get(item.sourceId);
        return {
          organization_id: run.organization_id,
          source_map_id: sourceMapId,
          source_id: item.sourceId,
          rank: index + 1,
          citation_observations: item.count,
          engines: Array.from(item.providers).sort(),
          client_present: inspection?.clientPresent || false,
          competitors_present: inspection?.competitors || [],
          entry_route: null,
          feasibility: "unknown",
          influence: "unknown",
          analyst_note: reviewStatus === "verified"
            ? inspection?.checkedAt
              ? "Verified citation observation using the persisted bounded page inspection. Influence, route and feasibility still require a human decision."
              : "Verified citation observation. Page presence, influence, route and feasibility still require a separate review."
            : "Provider-returned citation with bounded automated page inspection. Answer evidence and page presence remain explicitly unreviewed until a person approves the run.",
        };
      }),
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

export function generateObservedSourceMap(run: RunRow) {
  return generateSourceMap(run, "all");
}

export function generateReviewedSourceMap(run: RunRow) {
  return generateSourceMap(run, "verified");
}
