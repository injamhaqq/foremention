import type { Engine, Placement, SourceMapEntry, VisibilityRun } from "@/lib/types";

export const demoCompany = {
  name: "Northstar HR",
  category: "HR software for distributed teams",
  domain: "northstarhr.example",
  window: "Last 30 days",
};

const demoSourceTemplates: SourceMapEntry[] = [
  {
    id: "src-01",
    rank: 1,
    domain: "remoteworklab.com",
    title: "The 12 best HR platforms for distributed teams",
    url: "https://remoteworklab.com/guides/hr-platforms",
    type: "Editorial list",
    influence: "high",
    engines: ["ChatGPT", "Perplexity", "Google AI"],
    clientPresent: false,
    pagePresence: "absent",
    referenceOrigin: "provider_citation",
    competitors: ["Deel", "Rippling", "HiBob"],
    crawlerAccess: "open",
    route: "editorial outreach",
    feasibility: "high",
    evidenceCount: 18,
  },
  {
    id: "src-02",
    rank: 2,
    domain: "peopleops.report",
    title: "2026 global people operations benchmark",
    url: "https://peopleops.report/benchmarks/2026",
    type: "Research report",
    influence: "high",
    engines: ["ChatGPT", "Claude", "Perplexity"],
    clientPresent: false,
    pagePresence: "absent",
    referenceOrigin: "provider_citation",
    competitors: ["Deel", "Remote"],
    crawlerAccess: "open",
    route: "original research",
    feasibility: "medium",
    evidenceCount: 15,
  },
  {
    id: "src-03",
    rank: 3,
    domain: "stackbrief.com",
    title: "HRIS comparison: workflows, payroll, and compliance",
    url: "https://stackbrief.com/compare/hris",
    type: "Comparison",
    influence: "high",
    engines: ["ChatGPT", "Perplexity"],
    clientPresent: true,
    pagePresence: "present",
    referenceOrigin: "provider_citation",
    competitors: ["Rippling", "Gusto", "BambooHR"],
    crawlerAccess: "open",
    route: "comparison inclusion",
    feasibility: "high",
    evidenceCount: 12,
  },
  {
    id: "src-04",
    rank: 4,
    domain: "hrleaders.community",
    title: "What HR system works for a 200-person remote team?",
    url: "https://hrleaders.community/t/remote-hris-200",
    type: "Community thread",
    influence: "medium",
    engines: ["Perplexity", "Google AI"],
    clientPresent: false,
    pagePresence: "absent",
    referenceOrigin: "provider_citation",
    competitors: ["HiBob", "BambooHR"],
    crawlerAccess: "open",
    route: "community participation",
    feasibility: "medium",
    evidenceCount: 9,
  },
  {
    id: "src-05",
    rank: 5,
    domain: "worktechreview.com",
    title: "Northstar HR review: a practical operator's view",
    url: "https://worktechreview.com/reviews/northstar-hr",
    type: "Product review",
    influence: "medium",
    engines: ["ChatGPT", "Claude"],
    clientPresent: true,
    pagePresence: "present",
    referenceOrigin: "provider_citation",
    competitors: ["Remote"],
    crawlerAccess: "partial",
    route: "legitimate review",
    feasibility: "high",
    evidenceCount: 8,
  },
  {
    id: "src-06",
    rank: 6,
    domain: "futureofpeople.org",
    title: "Expert panel: running people operations across borders",
    url: "https://futureofpeople.org/panels/global-people-ops",
    type: "Expert roundup",
    influence: "medium",
    engines: ["Claude", "Perplexity"],
    clientPresent: false,
    pagePresence: "absent",
    referenceOrigin: "provider_citation",
    competitors: ["Deel"],
    crawlerAccess: "open",
    route: "expert contribution",
    feasibility: "medium",
    evidenceCount: 7,
  },
  {
    id: "src-07",
    rank: 7,
    domain: "saasbuyers.guide",
    title: "Best HR software for growing companies",
    url: "https://saasbuyers.guide/hr/growing-companies",
    type: "Buyer guide",
    influence: "emerging",
    engines: ["Google AI"],
    clientPresent: false,
    pagePresence: "unknown",
    referenceOrigin: "provider_citation",
    competitors: ["Gusto", "Rippling"],
    crawlerAccess: "blocked",
    route: "editorial outreach",
    feasibility: "low",
    evidenceCount: 4,
  },
  {
    id: "src-08",
    rank: 8,
    domain: "operatornotes.co",
    title: "The hidden cost of fragmented HR operations",
    url: "https://operatornotes.co/people/fragmented-hr",
    type: "Analysis",
    influence: "emerging",
    engines: ["ChatGPT"],
    clientPresent: false,
    pagePresence: "absent",
    referenceOrigin: "provider_citation",
    competitors: ["HiBob"],
    crawlerAccess: "open",
    route: "original research",
    feasibility: "high",
    evidenceCount: 3,
  },
];

// One in-memory fictional evidence set owns demo questions, answers and summaries.
// These rows never pass through a customer database or a provider connection.
export const demoPrompts = [
  { id: "demo-1", cluster: "Discovery", text: "Best HR software for distributed teams", approved: true },
  { id: "demo-2", cluster: "Use case", text: "What HR platform works for a 200-person remote company?", approved: true },
  { id: "demo-3", cluster: "Comparison", text: "Northstar HR vs Deel for a global team", approved: false },
  { id: "demo-4", cluster: "Alternative", text: "Best alternatives to Rippling for distributed companies", approved: true },
  { id: "demo-5", cluster: "Trust", text: "Most reliable HRIS for cross-border compliance", approved: false },
  { id: "demo-6", cluster: "Constraint", text: "Affordable HR platform for a remote startup", approved: true },
];
const demoRunSeeds = [
  { id: "RUN-2407", createdAt: "2026-07-20T10:00:00.000Z", status: "complete" as const },
  { id: "RUN-2307", createdAt: "2026-07-13T10:00:00.000Z", status: "complete" as const },
  { id: "RUN-2207", createdAt: "2026-07-06T10:00:00.000Z", status: "complete" as const },
  { id: "RUN-2107", createdAt: "2026-06-29T10:00:00.000Z", status: "review" as const },
];
const demoProviders = ["chatgpt", "perplexity", "claude", "google-ai"];
const providerLabels: Record<string, Engine> = { chatgpt: "ChatGPT", perplexity: "Perplexity", claude: "Claude", "google-ai": "Google AI" };
const demoDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));

export const demoAnswerRows = demoRunSeeds.flatMap((run, runIndex) => demoPrompts.filter((prompt) => prompt.approved).flatMap((prompt, promptIndex) => demoProviders.map((provider, providerIndex) => {
  const answerIndex = promptIndex * demoProviders.length + providerIndex;
  const sourcePool = runIndex ? demoSourceTemplates.slice(0, 6) : demoSourceTemplates;
  const present = runIndex === 0 ? answerIndex % 3 !== 0 : answerIndex % 4 === 0;
  const position = present ? answerIndex % 4 === 0 ? 1 : (answerIndex % 5) + 2 : null;
  const brands = present ? position === 1 ? "Northstar HR, Deel and Rippling" : "Deel, Rippling and Northstar HR" : "Deel and Rippling";
  return {
    id: `demo-answer-${runIndex}-${answerIndex}`, run_id: run.id,
    prompt_key: prompt.id, prompt_text: prompt.text, provider, model: "fictional-demo-model",
    answer_text: `Fictional demonstration only — not a real provider response. For this buyer question, ${brands} are sample recommendations. Inspect the fictional references; they do not establish why a provider would recommend a brand.`,
    citations_json: [sourcePool[answerIndex % sourcePool.length], sourcePool[(answerIndex + 2) % sourcePool.length]].map((source) => ({ url: source.url, title: source.title })),
    brand_present: present, brand_position: position,
    estimated_cost_usd: runIndex ? 0.004875 : 0.00525, cost_source: "estimated" as const,
    usage_total_tokens: 480 + answerIndex * 10,
    review_status: run.status === "review" ? "unreviewed" as const : "verified" as const,
    collected_at: run.createdAt,
  };
})));

export function getDemoRunAnswers(runId: string) {
  return demoAnswerRows.filter((answer) => answer.run_id === runId).map((answer) => ({
    id: answer.id, prompt: answer.prompt_text, provider: answer.provider,
    model: answer.model, answer: answer.answer_text, citations: answer.citations_json,
    status: answer.review_status, collectedAt: demoDate(answer.collected_at),
  }));
}

export function getDemoSourceMap(runId = demoRunSeeds[0].id): SourceMapEntry[] {
  const answers = demoAnswerRows.filter((answer) => answer.run_id === runId);
  return demoSourceTemplates.flatMap((source) => {
    const referring = answers.filter((answer) => answer.citations_json.some((citation) => citation.url === source.url));
    if (!referring.length) return [];
    return [{ ...source, sourceId: source.id,
      evidenceCount: referring.reduce((sum, answer) => sum + answer.citations_json.filter((citation) => citation.url === source.url).length, 0),
      engines: Array.from(new Set(referring.map((answer) => providerLabels[answer.provider]))),
      reviewedAt: null,
    }];
  });
}

export const sourceMapEntries = getDemoSourceMap();
export const demoRunRows = demoRunSeeds.map((run, index) => {
  const answers = demoAnswerRows.filter((answer) => answer.run_id === run.id);
  const sources = getDemoSourceMap(run.id);
  const previousSources = new Set(getDemoSourceMap(demoRunSeeds[index + 1]?.id || "missing").map((source) => source.url));
  return {
    id: run.id, status: run.status, provider_ids: demoProviders,
    methodology_version: "fictional-demo-v1", prompt_count: new Set(answers.map((answer) => answer.prompt_key)).size,
    answer_count: answers.length, citation_count: answers.reduce((sum, answer) => sum + answer.citations_json.length, 0),
    brand_presence_pct: Math.round(answers.filter((answer) => answer.brand_present).length / answers.length * 100),
    first_mention_pct: Math.round(answers.filter((answer) => answer.brand_position === 1).length / answers.length * 100),
    new_source_count: sources.filter((source) => !previousSources.has(source.url)).length,
    actual_cost_usd: answers.reduce((sum, answer) => sum + answer.estimated_cost_usd, 0), estimated_max_cost_usd: 0.1,
    created_at: run.createdAt,
  };
});
export const demoRuns: VisibilityRun[] = demoRunRows.map((run) => ({
  id: run.id, date: demoDate(run.created_at), status: run.status,
  prompts: run.prompt_count, answers: run.answer_count, citations: run.citation_count,
  presence: run.brand_presence_pct, firstMention: run.first_mention_pct, newSources: run.new_source_count,
}));
export const demoCostRows = demoAnswerRows.map((answer) => ({
  run_id: answer.run_id, estimated_cost_usd: answer.estimated_cost_usd,
  cost_source: answer.cost_source, total_tokens: answer.usage_total_tokens,
}));

export const demoPlacements: Placement[] = [
  { id: "PL-101", source: "remoteworklab.com", page: "Best HR platforms", route: "editorial outreach", owner: "Maya", stage: "pitched", updated: "2h ago", promptImpact: 9 },
  { id: "PL-102", source: "peopleops.report", page: "2026 benchmark", route: "original research", owner: "Ari", stage: "qualified", updated: "Yesterday", promptImpact: 7 },
  { id: "PL-103", source: "stackbrief.com", page: "HRIS comparison", route: "comparison inclusion", owner: "Maya", stage: "repeatedly cited", updated: "Jul 19", promptImpact: 12 },
  { id: "PL-104", source: "worktechreview.com", page: "Northstar HR review", route: "legitimate review", owner: "Ari", stage: "first cited", updated: "Jul 18", promptImpact: 6 },
  { id: "PL-105", source: "futureofpeople.org", page: "Expert panel", route: "expert contribution", owner: "Maya", stage: "accepted", updated: "Jul 17", promptImpact: 5 },
  { id: "PL-106", source: "hrleaders.community", page: "Remote HRIS thread", route: "community participation", owner: "Ari", stage: "published", updated: "Jul 15", promptImpact: 4 },
  { id: "PL-107", source: "operatornotes.co", page: "Fragmented HR ops", route: "original research", owner: "Maya", stage: "identified", updated: "Jul 14", promptImpact: 3 },
];

export const engineCoverage = [
  { engine: "ChatGPT", presence: 38, citations: 31, delta: 6 },
  { engine: "Perplexity", presence: 44, citations: 28, delta: 4 },
  { engine: "Claude", presence: 21, citations: 17, delta: 2 },
  { engine: "Google AI", presence: 19, citations: 18, delta: 1 },
];
