import type { Viewer } from "@/lib/auth";
import { canonicalizeEvidenceUrl, roundUsd } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import { demoRuns, sourceMapEntries } from "@/lib/demo-data";
import { supabaseRest } from "@/lib/supabase-rest";

export type IntelligenceRun = {
  id: string;
  date: string;
  providers: string[];
  prompts: number;
  answers: number;
  citations: number;
  presence: number;
  firstMention: number;
  newSources: number;
  costUsd: number | null;
  costSource: "provider reported" | "estimated" | "mixed" | "recorded" | "not recorded";
  tokens: number | null;
};

export type IntelligenceChange = {
  id: string;
  kind: "brand" | "source" | "answer" | "cost" | "baseline";
  tone: "positive" | "attention" | "neutral";
  title: string;
  detail: string;
  href: string;
};

export type ConfidenceCheck = {
  label: string;
  state: "pass" | "attention" | "missing";
  value: string;
  detail: string;
};

export type EvidenceSearchRecord = {
  id: string;
  kind: "Answer" | "Source" | "Evidence" | "Claim";
  title: string;
  detail: string;
  meta: string;
  href: string;
};

export type IntelligenceAction = {
  priority: "now" | "next" | "watch";
  title: string;
  reason: string;
  href: string;
  cta: string;
};

export type WeeklyIntelligence = {
  telemetry: "recorded" | "empty" | "fictional";
  latest: IntelligenceRun | null;
  previous: IntelligenceRun | null;
  changes: IntelligenceChange[];
  confidence: "decision-ready" | "directional" | "insufficient";
  confidenceChecks: ConfidenceCheck[];
  sourceReviewPct: number | null;
  searchRecords: EvidenceSearchRecord[];
  nextAction: IntelligenceAction;
  cadence: {
    mode: "reviewed runs";
    description: string;
  };
};

type RunRow = {
  id: string;
  provider_ids: string[];
  prompt_count: number;
  answer_count: number;
  citation_count: number;
  brand_presence_pct: number | string;
  first_mention_pct: number | string;
  new_source_count: number;
  actual_cost_usd: number | string | null;
  estimated_max_cost_usd: number | string | null;
  created_at: string;
};

type AnswerRow = {
  id: string;
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string; title?: string }> | null;
  brand_present: boolean | null;
  brand_position: number | null;
  estimated_cost_usd: number | string | null;
  cost_source: "estimated" | "provider_reported" | null;
  usage_total_tokens: number | null;
  collected_at: string;
};

type CostRow = {
  run_id: string;
  estimated_cost_usd: number | string;
  cost_source: "estimated" | "provider_reported";
  total_tokens: number | null;
};

type SourceEntryRow = {
  id: string;
  source_id: string;
  citation_observations: number;
  engines: string[];
  client_present: boolean;
  competitors_present: string[];
  source: {
    domain: string;
    page_title: string | null;
    canonical_url: string;
    crawler_access: "open" | "partial" | "blocked" | "unknown";
    crawler_checked_at: string | null;
  } | null;
};

type EvidenceRow = {
  id: string;
  evidence_type: string;
  title: string;
  source_url: string | null;
  verification_status: string;
  verified_at: string | null;
};

type ClaimRow = {
  id: string;
  approved_wording: string;
  limitations: string | null;
  public_use: boolean;
  verified_at: string | null;
};

type ComparableAnswer = {
  key: string;
  prompt: string;
  provider: string;
  model: string | null;
  answer: string;
  brandPresent: boolean | null;
  brandPosition: number | null;
  citationUrls: string[];
  collectedAt: string;
};

type BuildInput = {
  telemetry: WeeklyIntelligence["telemetry"];
  runs: RunRow[];
  answers: AnswerRow[];
  costs: CostRow[];
  sources: SourceEntryRow[];
  evidence: EvidenceRow[];
  claims: ClaimRow[];
};

const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const normalizedText = (value: string) => value.replace(/\s+/g, " ").trim();
const excerpt = (value: string, limit = 220) => {
  const text = normalizedText(value);
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text;
};
const usd = (value: number) => `$${value < 0.01 ? value.toFixed(4) : value.toFixed(2)}`;
const delta = (value: number, suffix = "") => `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}${suffix}`;

function answerView(row: AnswerRow): ComparableAnswer {
  const citationUrls = Array.from(new Set((row.citations_json || []).flatMap((citation) => {
    if (!citation.url) return [];
    const canonical = canonicalizeEvidenceUrl(citation.url);
    return canonical ? [canonical] : [];
  })));
  return {
    key: `${row.prompt_key}\u0000${row.provider}`,
    prompt: row.prompt_text || row.prompt_key,
    provider: row.provider,
    model: row.model,
    answer: normalizedText(row.answer_text),
    brandPresent: row.brand_present,
    brandPosition: row.brand_position,
    citationUrls,
    collectedAt: row.collected_at,
  };
}

function runView(run: RunRow, answers: AnswerRow[], costs: CostRow[]): IntelligenceRun {
  const answerViews = answers.map(answerView);
  const knownPresence = answerViews.filter((answer) => answer.brandPresent !== null);
  const knownPositions = answerViews.filter((answer) => answer.brandPosition !== null);
  const citationCount = answerViews.reduce((total, answer) => total + answer.citationUrls.length, 0);
  const costEvents = costs.filter((event) => event.run_id === run.id);
  const costSources = new Set(costEvents.map((event) => event.cost_source));
  const fallbackCost = Number(run.actual_cost_usd || 0);
  const eventCost = roundUsd(costEvents.reduce((total, event) => total + Number(event.estimated_cost_usd || 0), 0));
  const costSource: IntelligenceRun["costSource"] = costEvents.length
    ? costSources.size > 1
      ? "mixed"
      : costSources.has("provider_reported")
        ? "provider reported"
        : "estimated"
    : fallbackCost > 0
      ? "recorded"
      : "not recorded";
  return {
    id: run.id,
    date: dateLabel(run.created_at),
    providers: Array.from(new Set(answerViews.map((answer) => answer.provider))).sort(),
    prompts: new Set(answerViews.map((answer) => answer.prompt)).size || run.prompt_count,
    answers: answerViews.length,
    citations: citationCount,
    presence: knownPresence.length
      ? clampPct((knownPresence.filter((answer) => answer.brandPresent).length / knownPresence.length) * 100)
      : Number(run.brand_presence_pct),
    firstMention: knownPositions.length
      ? clampPct((knownPositions.filter((answer) => answer.brandPosition === 1).length / knownPositions.length) * 100)
      : Number(run.first_mention_pct),
    newSources: run.new_source_count,
    costUsd: costEvents.length ? eventCost : fallbackCost > 0 ? roundUsd(fallbackCost) : null,
    costSource,
    tokens: costEvents.some((event) => event.total_tokens !== null)
      ? costEvents.reduce((total, event) => total + Number(event.total_tokens || 0), 0)
      : null,
  };
}

function sourceSet(rows: AnswerRow[]) {
  return new Set(rows.flatMap((row) => answerView(row).citationUrls));
}

function comparisonSignature(rows: AnswerRow[]) {
  return rows.map((row) => answerView(row).key).sort().join("\u0001");
}

function buildChanges(
  latest: IntelligenceRun | null,
  previous: IntelligenceRun | null,
  latestAnswers: AnswerRow[],
  previousAnswers: AnswerRow[],
) {
  if (!latest) return [{
    id: "no-baseline",
    kind: "baseline" as const,
    tone: "attention" as const,
    title: "No reviewed baseline exists yet",
    detail: "Collect and review one controlled run before Foremention reports movement.",
    href: "/app/runs",
  }];
  if (!previous) return [{
    id: "first-baseline",
    kind: "baseline" as const,
    tone: "neutral" as const,
    title: "First reviewed baseline recorded",
    detail: `${latest.answers} verified answers and ${latest.citations} returned citations are available. Repeat the same question set before interpreting change.`,
    href: `/app/runs/${latest.id}`,
  }];

  const changes: IntelligenceChange[] = [];
  const latestByKey = new Map(latestAnswers.map((answer) => [answerView(answer).key, answerView(answer)]));
  const previousByKey = new Map(previousAnswers.map((answer) => [answerView(answer).key, answerView(answer)]));
  const gained: string[] = [];
  const lost: string[] = [];
  let changedAnswerText = 0;
  for (const [key, current] of latestByKey) {
    const prior = previousByKey.get(key);
    if (!prior) continue;
    if (prior.brandPresent !== true && current.brandPresent === true) gained.push(current.prompt);
    if (prior.brandPresent === true && current.brandPresent !== true) lost.push(current.prompt);
    if (prior.answer !== current.answer) changedAnswerText += 1;
  }
  if (gained.length || lost.length) changes.push({
    id: "brand-movement",
    kind: "brand",
    tone: lost.length ? "attention" : "positive",
    title: `${gained.length} brand gain${gained.length === 1 ? "" : "s"} · ${lost.length} brand loss${lost.length === 1 ? "" : "es"}`,
    detail: [...gained.slice(0, 2).map((prompt) => `Appeared: ${prompt}`), ...lost.slice(0, 2).map((prompt) => `Disappeared: ${prompt}`)].join(" · ") || "No comparable brand-presence change.",
    href: `/app/runs/${latest.id}`,
  });

  const latestSources = sourceSet(latestAnswers);
  const previousSources = sourceSet(previousAnswers);
  const addedSources = [...latestSources].filter((url) => !previousSources.has(url));
  const lostSources = [...previousSources].filter((url) => !latestSources.has(url));
  changes.push({
    id: "source-movement",
    kind: "source",
    tone: lostSources.length ? "attention" : addedSources.length ? "positive" : "neutral",
    title: `${addedSources.length} new source${addedSources.length === 1 ? "" : "s"} · ${lostSources.length} lost source${lostSources.length === 1 ? "" : "s"}`,
    detail: [...addedSources.slice(0, 2).map((url) => `New: ${new URL(url).hostname}`), ...lostSources.slice(0, 2).map((url) => `Lost: ${new URL(url).hostname}`)].join(" · ") || "The reviewed citation set is unchanged.",
    href: "/app/source-map",
  });
  changes.push({
    id: "answer-movement",
    kind: "answer",
    tone: changedAnswerText ? "neutral" : "positive",
    title: `${changedAnswerText} comparable answer${changedAnswerText === 1 ? "" : "s"} changed text`,
    detail: "This is an exact text comparison, not a claim that meaning, accuracy, or buyer behavior changed.",
    href: `/app/runs/${latest.id}`,
  });
  if (latest.costUsd !== null && previous.costUsd !== null) changes.push({
    id: "cost-movement",
    kind: "cost",
    tone: latest.costUsd > previous.costUsd ? "attention" : "positive",
    title: `${delta(latest.costUsd - previous.costUsd)} collection cost`,
    detail: `${usd(latest.costUsd)} in the latest reviewed run versus ${usd(previous.costUsd)} previously. Cost source: ${latest.costSource}.`,
    href: `/app/runs/${latest.id}`,
  });
  return changes;
}

function confidenceChecks(
  latest: IntelligenceRun | null,
  previous: IntelligenceRun | null,
  latestRun: RunRow | null,
  sourceReviewPct: number | null,
  latestCostEvents: number,
): ConfidenceCheck[] {
  const expectedAnswers = latestRun
    ? Math.max(1, latestRun.prompt_count) * Math.max(1, latestRun.provider_ids.length)
    : 0;
  const coveragePct = latest && expectedAnswers ? clampPct((latest.answers / expectedAnswers) * 100) : null;
  return [
    {
      label: "Repeatability",
      state: previous ? "pass" : latest ? "attention" : "missing",
      value: previous ? "2 comparable runs" : latest ? "1 reviewed run" : "No run",
      detail: previous ? "The latest reviewed run has a previous baseline for exact comparison." : "A second run with the same question and provider set is required.",
    },
    {
      label: "Collection coverage",
      state: coveragePct === null ? "missing" : coveragePct >= 90 ? "pass" : "attention",
      value: coveragePct === null ? "Needs data" : `${coveragePct}%`,
      detail: coveragePct === null ? "No reviewed answer matrix is available." : `${latest?.answers || 0} verified answers across ${expectedAnswers} expected prompt-provider combinations.`,
    },
    {
      label: "Source review",
      state: sourceReviewPct === null ? "missing" : sourceReviewPct >= 80 ? "pass" : "attention",
      value: sourceReviewPct === null ? "Needs data" : `${sourceReviewPct}%`,
      detail: sourceReviewPct === null ? "No published Source Map is available." : "Share of mapped pages with a dated crawler and presence review.",
    },
    {
      label: "Cost trace",
      state: !latest ? "missing" : latestCostEvents > 0 || latest.costSource === "recorded" ? "pass" : "attention",
      value: !latest ? "Needs data" : latestCostEvents > 0 ? `${latestCostEvents} event${latestCostEvents === 1 ? "" : "s"}` : latest.costSource,
      detail: !latest ? "No run cost exists." : latestCostEvents > 0 ? `The latest run cost is ${latest.costSource} and linked to persisted attempts.` : "The run lacks attempt-level cost events; do not treat zero as free.",
    },
  ];
}

function nextAction(
  latest: IntelligenceRun | null,
  previous: IntelligenceRun | null,
  latestRun: RunRow | null,
  sourceReviewPct: number | null,
  changes: IntelligenceChange[],
  sources: SourceEntryRow[],
) : IntelligenceAction {
  if (!latest) return { priority: "now", title: "Create the first reviewed baseline", reason: "A weekly loop begins with one controlled provider run and human review.", href: "/app/runs", cta: "Start collection" };
  if (!previous) return { priority: "now", title: "Repeat the same evidence set", reason: "One run shows an observation; the second begins a comparable trend.", href: "/app/runs", cta: "Run the baseline again" };
  const expected = latestRun ? Math.max(1, latestRun.prompt_count) * Math.max(1, latestRun.provider_ids.length) : latest.answers;
  if (latest.answers / Math.max(1, expected) < .9) return { priority: "now", title: "Repair incomplete collection", reason: "Fewer than 90% of expected prompt-provider answers passed review.", href: `/app/runs/${latest.id}`, cta: "Inspect failed coverage" };
  if ((sourceReviewPct ?? 0) < 80) return { priority: "now", title: "Review the next cited page", reason: `${sourceReviewPct ?? 0}% of mapped pages have a dated review. Confidence improves only when source facts are checked.`, href: "/app/source-map", cta: "Review source evidence" };
  if (changes.some((change) => change.id === "brand-movement" && change.tone === "attention")) return { priority: "now", title: "Inspect the brand disappearance", reason: "A comparable reviewed answer stopped naming the brand. Inspect the exact answer and citation chain before responding.", href: `/app/runs/${latest.id}`, cta: "Inspect changed answer" };
  if (changes.some((change) => change.id === "source-movement" && change.tone === "attention")) return { priority: "next", title: "Review the lost citation sources", reason: "One or more URLs disappeared between comparable reviewed runs. Confirm whether this is variation or a recurring loss.", href: "/app/source-map", cta: "Open Source Map" };
  if (sources.some((source) => source.source?.crawler_checked_at && !source.client_present)) return { priority: "next", title: "Advance the strongest verified gap", reason: "A reviewed source repeatedly appears without the customer brand. Choose only a legitimate evidence route.", href: "/app/opportunities", cta: "Open Priority Gaps" };
  return { priority: "watch", title: "Run the next scheduled comparison", reason: "The current evidence gates are healthy. Preserve the same question and provider set for the next comparable run.", href: "/app/runs", cta: "Prepare next run" };
}

export function buildWeeklyIntelligence(input: BuildInput): WeeklyIntelligence {
  const answerGroups = new Map<string, AnswerRow[]>();
  for (const answer of input.answers) {
    const current = answerGroups.get(answer.run_id) || [];
    current.push(answer);
    answerGroups.set(answer.run_id, current);
  }
  const reviewedRuns = input.runs.filter((run) => (answerGroups.get(run.id) || []).length > 0);
  const latestRun = reviewedRuns[0] || null;
  const latestSignature = latestRun ? comparisonSignature(answerGroups.get(latestRun.id) || []) : "";
  const previousRun = reviewedRuns.slice(1).find((candidate) => {
    const candidateSignature = comparisonSignature(answerGroups.get(candidate.id) || []);
    return Boolean(latestSignature) && candidateSignature === latestSignature;
  }) || null;
  const latestAnswers = latestRun ? answerGroups.get(latestRun.id) || [] : [];
  const previousAnswers = previousRun ? answerGroups.get(previousRun.id) || [] : [];
  const latest = latestRun ? runView(latestRun, latestAnswers, input.costs) : null;
  const previous = previousRun ? runView(previousRun, previousAnswers, input.costs) : null;
  const reviewedSources = input.sources.filter((source) => Boolean(source.source?.crawler_checked_at));
  const sourceReviewPct = input.sources.length ? clampPct((reviewedSources.length / input.sources.length) * 100) : null;
  const changes = buildChanges(latest, previous, latestAnswers, previousAnswers);
  const checks = confidenceChecks(latest, previous, latestRun, sourceReviewPct, input.costs.filter((cost) => cost.run_id === latestRun?.id).length);
  const passingChecks = checks.filter((check) => check.state === "pass").length;
  const confidence: WeeklyIntelligence["confidence"] = passingChecks === checks.length
    ? "decision-ready"
    : latest && passingChecks >= 2
      ? "directional"
      : "insufficient";
  const searchRecords: EvidenceSearchRecord[] = [
    ...latestAnswers.map((answer) => ({
      id: `answer-${answer.id}`,
      kind: "Answer" as const,
      title: answer.prompt_text || answer.prompt_key,
      detail: excerpt(answer.answer_text),
      meta: `${answer.provider}${answer.model ? ` · ${answer.model}` : ""} · ${dateLabel(answer.collected_at)}`,
      href: `/app/runs/${answer.run_id}`,
    })),
    ...input.sources.flatMap((entry) => entry.source ? [{
      id: `source-${entry.id}`,
      kind: "Source" as const,
      title: entry.source.page_title || entry.source.domain,
      detail: `${entry.citation_observations} citation observation${entry.citation_observations === 1 ? "" : "s"} · ${entry.client_present ? "brand present" : entry.source.crawler_checked_at ? "brand absent" : "presence unreviewed"}`,
      meta: `${entry.source.domain} · ${entry.engines.join(", ") || "provider unavailable"}`,
      href: `/app/sources/${entry.id}`,
    }] : []),
    ...input.evidence.map((item) => ({
      id: `evidence-${item.id}`,
      kind: "Evidence" as const,
      title: item.title,
      detail: `${item.evidence_type} · ${item.verification_status}`,
      meta: item.verified_at ? `Verified ${dateLabel(item.verified_at)}` : "Not verified",
      href: "/app/evidence",
    })),
    ...input.claims.map((claim) => ({
      id: `claim-${claim.id}`,
      kind: "Claim" as const,
      title: claim.approved_wording,
      detail: claim.limitations || "No limitation recorded.",
      meta: `${claim.public_use ? "Public use approved" : "Internal only"}${claim.verified_at ? ` · ${dateLabel(claim.verified_at)}` : ""}`,
      href: "/app/evidence",
    })),
  ];
  return {
    telemetry: input.telemetry,
    latest,
    previous,
    changes,
    confidence,
    confidenceChecks: checks,
    sourceReviewPct,
    searchRecords,
    nextAction: nextAction(latest, previous, latestRun, sourceReviewPct, changes, input.sources),
    cadence: {
      mode: "reviewed runs",
      description: latest
        ? `Updated from the latest human-reviewed collection on ${latest.date}. Run the same approved evidence set weekly for comparable movement.`
        : "Updates only after a customer runs and reviews a real collection. Automatic scheduling is not implied.",
    },
  };
}

function demoInput(): BuildInput {
  const [latest, previous] = demoRuns;
  const demoRunRows: RunRow[] = [latest, previous].map((run, index) => ({
    id: run.id,
    provider_ids: ["chatgpt", "perplexity", "claude", "google-ai"],
    prompt_count: 4,
    answer_count: run.answers,
    citation_count: run.citations,
    brand_presence_pct: run.presence,
    first_mention_pct: run.firstMention,
    new_source_count: run.newSources,
    actual_cost_usd: index ? 0.078 : 0.084,
    estimated_max_cost_usd: 0.1,
    created_at: index ? "2026-07-13T10:00:00.000Z" : "2026-07-20T10:00:00.000Z",
  }));
  const prompts = [
    "Best HR software for distributed teams",
    "HR platform for a 200-person remote company",
    "Reliable HRIS for cross-border compliance",
    "Affordable HR platform for a remote startup",
  ];
  const providers = ["chatgpt", "perplexity", "claude", "google-ai"];
  const demoAnswers: AnswerRow[] = demoRunRows.flatMap((run, runIndex) => prompts.flatMap((prompt, promptIndex) => providers.map((provider, providerIndex) => {
    const answerIndex = promptIndex * providers.length + providerIndex;
    const sourcePool = runIndex ? sourceMapEntries.slice(0, 6) : sourceMapEntries;
    return {
      id: `demo-answer-${runIndex}-${answerIndex}`,
      run_id: run.id,
      prompt_key: `demo-${promptIndex}`,
      prompt_text: prompt,
      provider,
      model: "fictional-demo-model",
      answer_text: runIndex === 0
        ? `Fictional ${provider} demonstration answer for ${prompt}. It shows how reviewed answer text becomes searchable without representing a real provider response.`
        : `Earlier fictional ${provider} demonstration answer for ${prompt}. It exists only to show an exact run comparison.`,
      citations_json: [
        { url: sourcePool[answerIndex % sourcePool.length].url },
        { url: sourcePool[(answerIndex + 2) % sourcePool.length].url },
      ],
      brand_present: runIndex === 0 ? answerIndex % 3 !== 0 : answerIndex % 4 === 0,
      brand_position: answerIndex % 4 === 0 ? 1 : (answerIndex % 5) + 2,
      estimated_cost_usd: runIndex ? 0.004875 : 0.00525,
      cost_source: "estimated" as const,
      usage_total_tokens: 480 + answerIndex * 10,
      collected_at: run.created_at,
    };
  })));
  const demoCosts: CostRow[] = demoRunRows.flatMap((run, runIndex) => Array.from({ length: 16 }, (_, index) => ({
    run_id: run.id,
    estimated_cost_usd: runIndex ? 0.004875 : 0.00525,
    cost_source: "estimated",
    total_tokens: 480 + index * 10,
  })));
  const demoSources: SourceEntryRow[] = sourceMapEntries.map((source, index) => ({
    id: source.id,
    source_id: source.id,
    citation_observations: source.evidenceCount,
    engines: source.engines,
    client_present: source.clientPresent,
    competitors_present: source.competitors,
    source: {
      domain: source.domain,
      page_title: source.title,
      canonical_url: source.url,
      crawler_access: source.crawlerAccess,
      crawler_checked_at: index === sourceMapEntries.length - 1 ? null : "2026-07-20T10:00:00.000Z",
    },
  }));
  return {
    telemetry: "fictional",
    runs: demoRunRows,
    answers: demoAnswers,
    costs: demoCosts,
    sources: demoSources,
    evidence: [{
      id: "demo-evidence",
      evidence_type: "Security",
      title: "Fictional Northstar HR security review",
      source_url: "https://northstarhr.example/security",
      verification_status: "verified",
      verified_at: "2026-07-18T10:00:00.000Z",
    }],
    claims: [{
      id: "demo-claim",
      approved_wording: "Fictional customer data is encrypted in transit.",
      limitations: "Demonstration record only. This is not a real company claim.",
      public_use: false,
      verified_at: "2026-07-18T10:00:00.000Z",
    }],
  };
}

export async function loadWeeklyIntelligence(viewer: Viewer): Promise<WeeklyIntelligence> {
  if (viewer.mode === "demo") return buildWeeklyIntelligence(demoInput());
  const context = await loadWorkspaceContext(viewer);
  if (!context) return buildWeeklyIntelligence({ telemetry: "empty", runs: [], answers: [], costs: [], sources: [], evidence: [], claims: [] });
  const [runs, maps, evidence, claims] = await Promise.all([
    supabaseRest<RunRow[]>(
      `runs?select=id,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,actual_cost_usd,estimated_max_cost_usd,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(complete,partial)&order=created_at.desc&limit=6`,
      { token: viewer.accessToken },
    ),
    supabaseRest<Array<{ id: string }>>(
      `source_maps?select=id&organization_id=eq.${context.organizationId}&category_id=eq.${context.categoryId}&status=eq.published&order=created_at.desc&limit=1`,
      { token: viewer.accessToken },
    ),
    supabaseRest<EvidenceRow[]>(
      `evidence_items?select=id,evidence_type,title,source_url,verification_status,verified_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
      { token: viewer.accessToken },
    ),
    supabaseRest<ClaimRow[]>(
      `verified_claims?select=id,approved_wording,limitations,public_use,verified_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=100`,
      { token: viewer.accessToken },
    ),
  ]);
  const runIds = runs.map((run) => run.id);
  const [answers, costs, sources] = await Promise.all([
    runIds.length ? supabaseRest<AnswerRow[]>(
      `run_answers?select=id,run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,brand_present,brand_position,estimated_cost_usd,cost_source,usage_total_tokens,collected_at&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified&order=collected_at.desc&limit=500`,
      { token: viewer.accessToken },
    ) : Promise.resolve([]),
    runIds.length ? supabaseRest<CostRow[]>(
      `ai_cost_events?select=run_id,estimated_cost_usd,cost_source,total_tokens&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&order=observed_at.desc&limit=500`,
      { token: viewer.accessToken },
    ) : Promise.resolve([]),
    maps[0] ? supabaseRest<SourceEntryRow[]>(
      `source_map_entries?select=id,source_id,citation_observations,engines,client_present,competitors_present,source:sources(domain,page_title,canonical_url,crawler_access,crawler_checked_at)&organization_id=eq.${context.organizationId}&source_map_id=eq.${maps[0].id}&order=rank.asc&limit=250`,
      { token: viewer.accessToken },
    ) : Promise.resolve([]),
  ]);
  return buildWeeklyIntelligence({
    telemetry: runs.length ? "recorded" : "empty",
    runs,
    answers,
    costs,
    sources,
    evidence,
    claims,
  });
}
