import type { Viewer } from "@/lib/auth";
import {
  FOREMENTION_AGENTS,
  getForementionAgent,
  type AgentControlPlaneView,
  type AgentExecutionView,
  type AgentMetric,
  type ForementionAgentId,
  type ForementionAgentStatus,
} from "@/lib/agent-control-plane";
import { getProviderCostRates } from "@/lib/collection-policy";
import { cloudflareAiConfigured } from "@/lib/providers/cloudflare";
import { cache } from "react";
import { demoPlacements, demoRuns, sourceMapEntries } from "@/lib/demo-data";
import { supabaseRest } from "@/lib/supabase-rest";
import type { EntryRoute, Placement, SourceMapEntry, VisibilityRun } from "@/lib/types";

export type WorkspaceRole = "owner" | "admin" | "analyst" | "viewer";
type MembershipRow = { organization_id: string; role: WorkspaceRole };
type SourceEntryRow = {
  id: string; source_id: string; rank: number; citation_observations: number; engines: SourceMapEntry["engines"];
  client_present: boolean; competitors_present: string[]; entry_route: string | null;
  feasibility: SourceMapEntry["feasibility"]; influence: SourceMapEntry["influence"];
  source: { domain: string; page_title: string | null; canonical_url: string; source_type: string | null; crawler_access: SourceMapEntry["crawlerAccess"]; crawler_checked_at: string | null } | null;
};
type RunRow = { id: string; status: VisibilityRun["status"]; error_summary: string | null; prompt_count: number; answer_count: number; citation_count: number; brand_presence_pct: number | string; first_mention_pct: number | string; new_source_count: number; created_at: string };
type PlacementRow = { id: string; source_url: string; page_title: string | null; entry_route: string; stage: string; updated_at: string; target_prompt_ids: string[]; owner_id: string | null };
type AgentRunRow = RunRow & { provider_ids: string[]; started_at: string | null; completed_at: string | null };
type AgentJobRow = {
  id: string;
  job_type: string;
  status: Exclude<ForementionAgentStatus, "waiting" | "review">;
  payload: { runId?: string; agentId?: string } | null;
  result: Record<string, unknown> | null;
  error_detail: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type WorkspacePrompt = { id: string; cluster: string; text: string; approved: boolean };
export type WorkspaceSummary = { organizationId: string; organizationName: string; website: string | null; category: string | null; promptCount: number };
export type WorkspaceContext = {
  organizationId: string;
  projectId: string;
  categoryId: string;
  clusterId: string | null;
  organizationName: string;
  website: string | null;
  category: string;
};
export type WorkspaceEvidence = {
  id: string;
  type: string;
  title: string;
  sourceUrl: string | null;
  status: "unverified" | "verified" | "expired" | "rejected";
  verifiedAt: string | null;
  expiresAt: string | null;
  rights: string | null;
};
export type VerifiedClaim = {
  id: string;
  evidenceItemId: string | null;
  evidenceTitle: string | null;
  evidenceUrl: string | null;
  claimText: string;
  approvedWording: string;
  limitations: string | null;
  publicUse: boolean;
  verifiedAt: string | null;
  expiresAt: string | null;
};
export type WorkspaceRunAnswer = {
  id: string;
  prompt: string;
  provider: string;
  model: string | null;
  answer: string;
  citations: Array<{ url: string; title?: string }>;
  status: "unreviewed" | "verified" | "excluded";
  collectedAt: string;
};
export type SourceEvidenceContext = {
  sourceId: string;
  answerId: string;
  prompt: string;
  provider: string;
  model: string | null;
  answerExcerpt: string;
  citationOrdinal: number | null;
  observedAt: string;
};
export type ProviderHealth = "available" | "limited" | "untested";
export type ProviderStatus = {
  id: "openai" | "gemini" | "anthropic" | "perplexity" | "groq" | "cloudflare" | "openrouter" | "zenmux" | "omnirouters";
  label: string;
  configured: boolean;
  supportsCitations: boolean;
  health: ProviderHealth;
  latestStatus: string | null;
  lastTestedAt: string | null;
  verifiedAnswers: number;
  presencePct: number | null;
};
export type WorkspaceTeamMember = {
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
  current: boolean;
};
export type WorkspaceInvitation = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
};
export type WorkspaceNotification = {
  id: string;
  kind: "run_ready" | "run_failed" | "source_map_published" | "evidence_review" | "workspace";
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
  count: number;
};
export type DeletionRequest = {
  id: string;
  status: "pending" | "cancelled" | "completed";
  scheduledFor: string;
  createdAt: string;
};
export type DecisionSignal = {
  reviewedRuns: number;
  latestRunId: string | null;
  latestRunDate: string | null;
  providerCount: number;
  promptCount: number;
  answerCount: number;
  answerCompletionPct: number | null;
  recommendationConsensusPct: number | null;
  presenceRange: number | null;
  presenceDelta: number | null;
  sourceReviewPct: number | null;
  sourceDependencyPct: number | null;
  recurringSourcePct: number | null;
  evidenceObservations: number;
  decisionReadiness: "ready" | "directional" | "insufficient";
  actions: Array<{
    priority: "now" | "next" | "watch";
    title: string;
    reason: string;
    href: string;
  }>;
};

const routes: EntryRoute[] = ["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"];
const sourceRoute = (value: string | null): SourceMapEntry["route"] => routes.includes(value as EntryRoute) ? value as EntryRoute : "unknown";
const placementRoute = (value: string | null): EntryRoute => routes.includes(value as EntryRoute) ? value as EntryRoute : "editorial outreach";
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
const relativeLabel = (value: string) => dateLabel(value);
const hostname = (value: string) => { try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; } };
const agentNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const agentMetric = (label: string, value: unknown): AgentMetric => ({ label, value: String(value) });

function recordedAgentSummary(agentId: ForementionAgentId, status: ForementionAgentStatus, result: Record<string, unknown> | null) {
  if (status === "failed") return "The agent stopped without inventing a result. Inspect the related answer run before retrying.";
  if (status === "cancelled") return "The run was cancelled and this agent did not publish a result.";
  if (status === "running") return "This agent is processing the current run.";
  if (!result) return "The agent completed without a customer-facing metric.";
  if (agentId === "run-supervisor") return `Run controls completed with ${agentNumber(result.failedAgents)} failed stage${agentNumber(result.failedAgents) === 1 ? "" : "s"}.`;
  if (agentId === "question-scout") return `${agentNumber(result.promptCount)} frozen buyer question${agentNumber(result.promptCount) === 1 ? "" : "s"} passed workspace validation.`;
  if (agentId === "answer-collector") return `${agentNumber(result.answerCount)} provider answer${agentNumber(result.answerCount) === 1 ? "" : "s"} persisted; ${agentNumber(result.failureCount)} failed attempt${agentNumber(result.failureCount) === 1 ? "" : "s"} preserved.`;
  if (agentId === "evidence-mapper") return `${agentNumber(result.citationCount)} returned citation${agentNumber(result.citationCount) === 1 ? "" : "s"} resolved to ${agentNumber(result.sourceCount)} unique source${agentNumber(result.sourceCount) === 1 ? "" : "s"}.`;
  if (agentId === "brand-observer") return `Brand presence measured at ${agentNumber(result.presencePct)}%; first-mention share measured at ${agentNumber(result.firstMentionPct)}%.`;
  return result.nextState === "human_review_required"
    ? "Collected evidence is waiting for a person to approve or exclude it."
    : "The human-review boundary completed for this run.";
}

function recordedAgentMetrics(agentId: ForementionAgentId, result: Record<string, unknown> | null): AgentMetric[] {
  if (!result) return [];
  if (agentId === "run-supervisor") return [agentMetric("Retries", agentNumber(result.retryCount)), agentMetric("Failed stages", agentNumber(result.failedAgents))];
  if (agentId === "question-scout") return [agentMetric("Questions", agentNumber(result.promptCount)), agentMetric("Competitors", agentNumber(result.competitorCount))];
  if (agentId === "answer-collector") return [agentMetric("Answers", agentNumber(result.answerCount)), agentMetric("Failures", agentNumber(result.failureCount))];
  if (agentId === "evidence-mapper") return [agentMetric("Citations", agentNumber(result.citationCount)), agentMetric("Unique sources", agentNumber(result.sourceCount))];
  if (agentId === "brand-observer") return [agentMetric("Brand presence", `${agentNumber(result.presencePct)}%`), agentMetric("First mention", `${agentNumber(result.firstMentionPct)}%`)];
  return [agentMetric("Gate", result.nextState === "human_review_required" ? "Review required" : "Complete")];
}

function derivedAgentExecution(agentId: ForementionAgentId, run: AgentRunRow | null): AgentExecutionView {
  const definition = getForementionAgent(agentId)!;
  if (!run) return { ...definition, status: "waiting", summary: "Waiting for the first controlled collection run.", metrics: [], runId: null, observedAt: null, telemetry: "derived" };
  const terminalEvidence = ["review", "complete", "partial"].includes(run.status) && run.answer_count > 0;
  const failed = run.status === "failed";
  const cancelled = run.status === "cancelled";
  const active = ["queued", "running"].includes(run.status);
  let status: ForementionAgentStatus = "waiting";
  let summary = "Waiting for an earlier agent to finish.";
  let metrics: AgentMetric[] = [];
  if (agentId === "run-supervisor") {
    status = failed ? "failed" : cancelled ? "cancelled" : active ? "running" : "complete";
    summary = active ? "The latest run is queued or running under cost, retry, and cancellation controls." : failed ? "The latest run failed without manufacturing evidence." : cancelled ? "The latest run was cancelled." : "The latest persisted run reached a terminal evidence state.";
    metrics = [agentMetric("Run state", run.status), agentMetric("Costed answers", run.answer_count)];
  } else if (agentId === "question-scout") {
    status = run.prompt_count > 0 ? "complete" : "waiting";
    summary = run.prompt_count > 0 ? `${run.prompt_count} frozen buyer question${run.prompt_count === 1 ? "" : "s"} entered the persisted run.` : "No validated buyer questions were recorded.";
    metrics = [agentMetric("Questions", run.prompt_count), agentMetric("Provider count", run.provider_ids.length)];
  } else if (agentId === "answer-collector") {
    status = failed ? "failed" : cancelled ? "cancelled" : active ? "running" : run.answer_count > 0 ? "complete" : "waiting";
    summary = run.answer_count > 0 ? `${run.answer_count} real provider answer${run.answer_count === 1 ? "" : "s"} were persisted.` : failed ? "The provider returned no usable answer." : "No persisted provider answer is available yet.";
    metrics = [agentMetric("Answers", run.answer_count), agentMetric("Citations", run.citation_count)];
  } else if (agentId === "evidence-mapper") {
    status = terminalEvidence ? "complete" : failed ? "failed" : "waiting";
    summary = terminalEvidence ? `${run.citation_count} returned citation${run.citation_count === 1 ? "" : "s"} and ${run.new_source_count} unique source${run.new_source_count === 1 ? "" : "s"} are recorded.` : "Evidence mapping begins only after a provider answer is persisted.";
    metrics = [agentMetric("Citations", run.citation_count), agentMetric("Sources", run.new_source_count)];
  } else if (agentId === "brand-observer") {
    status = terminalEvidence ? "complete" : failed ? "failed" : "waiting";
    summary = terminalEvidence ? `Observed brand presence is ${Number(run.brand_presence_pct)}%; first-mention share is ${Number(run.first_mention_pct)}%.` : "Brand observations require a persisted answer.";
    metrics = [agentMetric("Brand presence", `${Number(run.brand_presence_pct)}%`), agentMetric("First mention", `${Number(run.first_mention_pct)}%`)];
  } else {
    status = run.status === "review" ? "review" : ["complete", "partial"].includes(run.status) ? "complete" : failed ? "failed" : cancelled ? "cancelled" : "waiting";
    summary = run.status === "review" ? "A person must approve or exclude the collected evidence before it enters reviewed metrics." : ["complete", "partial"].includes(run.status) ? "Human review completed for the persisted run." : "The review gate opens after collection.";
    metrics = [agentMetric("Review state", run.status === "review" ? "Required" : run.status)];
  }
  return { ...definition, status, summary, metrics, runId: run.id, observedAt: dateLabel(run.completed_at || run.started_at || run.created_at), telemetry: "derived" };
}

function demoAgentControlPlane(): AgentControlPlaneView {
  const summaries: Record<ForementionAgentId, { summary: string; metrics: AgentMetric[] }> = {
    "run-supervisor": { summary: "Fictional run controls completed with no failed stage.", metrics: [agentMetric("Retries", 0), agentMetric("Failed stages", 0)] },
    "question-scout": { summary: "Four fictional buyer questions passed workspace validation.", metrics: [agentMetric("Questions", 4), agentMetric("Competitors", 3)] },
    "answer-collector": { summary: "Sixteen fictional provider answers are shown only inside this demo.", metrics: [agentMetric("Answers", 16), agentMetric("Failures", 0)] },
    "evidence-mapper": { summary: "Thirty-two fictional citation observations resolve to eight demonstration sources.", metrics: [agentMetric("Citations", 32), agentMetric("Unique sources", 8)] },
    "brand-observer": { summary: "Fictional brand presence and first-mention measurements demonstrate the calculation.", metrics: [agentMetric("Brand presence", "61%"), agentMetric("First mention", "29%")] },
    "human-review-gate": { summary: "Fictional evidence passed a demonstration review gate.", metrics: [agentMetric("Gate", "Demo complete")] },
  };
  const agents = FOREMENTION_AGENTS.map((definition) => ({ ...definition, status: "complete" as const, ...summaries[definition.id], runId: demoRuns[0].id, observedAt: demoRuns[0].date, telemetry: "fictional" as const }));
  return { agents, latestRunId: demoRuns[0].id, recordedExecutions: agents.length, activeAgents: 0, failedAgents: 0, waitingAgents: 0, telemetry: "fictional" };
}

const getPrimaryMembershipCached = cache(async (userId: string, accessToken: string) => {
  const rows = await supabaseRest<MembershipRow[]>(`organization_members?select=organization_id,role&user_id=eq.${userId}&order=created_at.asc&limit=1`, { token: accessToken });
  return rows[0] || null;
});

export async function getPrimaryOrganizationId(viewer: Viewer) {
  if (viewer.mode === "demo") return "10000000-0000-4000-8000-000000000001";
  return (await getPrimaryMembershipCached(viewer.id, viewer.accessToken || ""))?.organization_id || null;
}

export async function getPrimaryWorkspaceRole(viewer: Viewer): Promise<WorkspaceRole | null> {
  if (viewer.mode === "demo") return "owner";
  return (await getPrimaryMembershipCached(viewer.id, viewer.accessToken || ""))?.role || null;
}

export async function loadSourceMap(viewer: Viewer): Promise<SourceMapEntry[]> {
  if (viewer.mode === "demo") return sourceMapEntries;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const maps = await supabaseRest<Array<{ id: string }>>(`source_maps?select=id&organization_id=eq.${organizationId}&status=eq.published&order=created_at.desc&limit=1`, { token: viewer.accessToken });
  if (!maps[0]) return [];
  const rows = await supabaseRest<SourceEntryRow[]>(`source_map_entries?select=id,source_id,rank,citation_observations,engines,client_present,competitors_present,entry_route,feasibility,influence,source:sources(domain,page_title,canonical_url,source_type,crawler_access,crawler_checked_at)&source_map_id=eq.${maps[0].id}&order=rank.asc`, { token: viewer.accessToken });
  return rows.filter((row) => row.source).map((row) => ({ id: row.id, sourceId: row.source_id, rank: row.rank, domain: row.source!.domain, title: row.source!.page_title || row.source!.domain, url: row.source!.canonical_url, type: row.source!.source_type || "web source", influence: row.influence, engines: row.engines || [], clientPresent: row.client_present, competitors: row.competitors_present || [], crawlerAccess: row.source!.crawler_access, route: sourceRoute(row.entry_route), feasibility: row.feasibility, evidenceCount: row.citation_observations, reviewedAt: row.source!.crawler_checked_at ? dateLabel(row.source!.crawler_checked_at) : null }));
}

const excerpt = (value: string, limit = 240) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
};

export async function loadSourceEvidenceContexts(
  viewer: Viewer,
  sourceIds: string[],
): Promise<Record<string, SourceEvidenceContext[]>> {
  if (viewer.mode === "demo" || !sourceIds.length) return {};
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return {};
  const safeSourceIds = sourceIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (!safeSourceIds.length) return {};
  const observations = await supabaseRest<Array<{
    source_id: string;
    run_answer_id: string | null;
    provider: string;
    citation_ordinal: number | null;
    observed_at: string;
  }>>(
    `source_observations?select=source_id,run_answer_id,provider,citation_ordinal,observed_at&organization_id=eq.${organizationId}&source_id=in.(${safeSourceIds.join(",")})&review_status=eq.verified&order=observed_at.desc&limit=500`,
    { token: viewer.accessToken },
  );
  const answerIds = Array.from(new Set(observations.flatMap((row) => row.run_answer_id ? [row.run_answer_id] : [])));
  if (!answerIds.length) return {};
  const answers = await supabaseRest<Array<{
    id: string;
    prompt_key: string;
    prompt_text: string | null;
    provider: string;
    model: string | null;
    answer_text: string;
  }>>(
    `run_answers?select=id,prompt_key,prompt_text,provider,model,answer_text&organization_id=eq.${organizationId}&id=in.(${answerIds.join(",")})&review_status=eq.verified`,
    { token: viewer.accessToken },
  );
  const answerById = new Map(answers.map((answer) => [answer.id, answer]));
  return observations.reduce<Record<string, SourceEvidenceContext[]>>((result, observation) => {
    if (!observation.run_answer_id) return result;
    const answer = answerById.get(observation.run_answer_id);
    if (!answer) return result;
    const current = result[observation.source_id] || [];
    current.push({
      sourceId: observation.source_id,
      answerId: answer.id,
      prompt: answer.prompt_text || answer.prompt_key,
      provider: observation.provider || answer.provider,
      model: answer.model,
      answerExcerpt: excerpt(answer.answer_text),
      citationOrdinal: observation.citation_ordinal,
      observedAt: dateLabel(observation.observed_at),
    });
    result[observation.source_id] = current;
    return result;
  }, {});
}

export async function loadRuns(viewer: Viewer, options: { limit?: number; offset?: number } = {}): Promise<VisibilityRun[]> {
  const limit = Math.max(1, Math.min(100, Math.round(options.limit || 100)));
  const offset = Math.max(0, Math.round(options.offset || 0));
  if (viewer.mode === "demo") return demoRuns.slice(offset, offset + limit);
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<RunRow[]>(`runs?select=id,status,error_summary,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${organizationId}&order=created_at.desc&limit=${limit}&offset=${offset}`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id, date: dateLabel(row.created_at), status: row.status, errorSummary: row.error_summary, prompts: row.prompt_count, answers: row.answer_count, citations: row.citation_count, presence: Number(row.brand_presence_pct), firstMention: Number(row.first_mention_pct), newSources: row.new_source_count }));
}

export async function loadAgentControlPlane(viewer: Viewer): Promise<AgentControlPlaneView> {
  if (viewer.mode === "demo") return demoAgentControlPlane();
  const context = await loadWorkspaceContext(viewer);
  if (!context) {
    const agents = FOREMENTION_AGENTS.map((agent) => ({ ...agent, status: "waiting" as const, summary: "Complete onboarding before the agent pipeline can run.", metrics: [], runId: null, observedAt: null, telemetry: "derived" as const }));
    return { agents, latestRunId: null, recordedExecutions: 0, activeAgents: 0, failedAgents: 0, waitingAgents: agents.length, telemetry: "derived" };
  }
  const [runs, jobs] = await Promise.all([
    supabaseRest<AgentRunRow[]>(
      `runs?select=id,status,error_summary,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,provider_ids,started_at,completed_at,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc&limit=1`,
      { token: viewer.accessToken },
    ),
    supabaseRest<AgentJobRow[]>(
      `jobs?select=id,job_type,status,payload,result,error_detail,started_at,completed_at,updated_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&job_type=like.${encodeURIComponent("foremention.agent.*")}&order=updated_at.desc&limit=60`,
      { token: viewer.accessToken },
    ),
  ]);
  const latestRun = runs[0] || null;
  const latestRunId = latestRun?.id || jobs.find((job) => job.payload?.runId)?.payload?.runId || null;
  const latestJobs = latestRunId ? jobs.filter((job) => job.payload?.runId === latestRunId) : [];
  const agents = FOREMENTION_AGENTS.map((definition): AgentExecutionView => {
    const job = latestJobs.find((candidate) => candidate.job_type === `foremention.agent.${definition.id}`);
    if (!job) return derivedAgentExecution(definition.id, latestRun);
    return {
      ...definition,
      status: definition.id === "human-review-gate" && job.result?.nextState === "human_review_required" ? "review" : job.status,
      summary: recordedAgentSummary(definition.id, job.status, job.result),
      metrics: recordedAgentMetrics(definition.id, job.result),
      runId: latestRunId,
      observedAt: dateLabel(job.completed_at || job.started_at || job.updated_at),
      telemetry: "recorded",
    };
  });
  return {
    agents,
    latestRunId,
    recordedExecutions: latestJobs.length,
    activeAgents: agents.filter((agent) => agent.status === "running").length,
    failedAgents: agents.filter((agent) => agent.status === "failed").length,
    waitingAgents: agents.filter((agent) => agent.status === "waiting" || agent.status === "review").length,
    telemetry: latestJobs.length ? "recorded" : "derived",
  };
}

export async function loadPlacements(viewer: Viewer): Promise<Placement[]> {
  if (viewer.mode === "demo") return demoPlacements;
  const organizationId = await getPrimaryOrganizationId(viewer); if (!organizationId) return [];
  const rows = await supabaseRest<PlacementRow[]>(`placements?select=id,source_url,page_title,entry_route,stage,updated_at,target_prompt_ids,owner_id&organization_id=eq.${organizationId}&order=updated_at.desc`, { token: viewer.accessToken });
  return rows.map((row) => ({ id: row.id, source: hostname(row.source_url), page: row.page_title || row.source_url, route: placementRoute(row.entry_route), owner: row.owner_id ? "Assigned" : "Unassigned", stage: row.stage.replaceAll("_", " ") as Placement["stage"], updated: relativeLabel(row.updated_at), promptImpact: row.target_prompt_ids?.length || 0 }));
}

export function getProviderStatuses(): ProviderStatus[] {
  return [
    { id: "openai", label: "OpenAI", configured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL && getProviderCostRates("openai")), supportsCitations: true, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "gemini", label: "Google Gemini", configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL && getProviderCostRates("gemini")), supportsCitations: true, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "anthropic", label: "Anthropic Claude", configured: Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_MODEL && getProviderCostRates("anthropic")), supportsCitations: true, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "perplexity", label: "Perplexity", configured: Boolean(process.env.PERPLEXITY_API_KEY && process.env.PERPLEXITY_MODEL && getProviderCostRates("perplexity")), supportsCitations: true, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "groq", label: "Groq Compound", configured: Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL && getProviderCostRates("groq")), supportsCitations: true, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "cloudflare", label: "Cloudflare Workers AI", configured: Boolean(cloudflareAiConfigured() && getProviderCostRates("cloudflare")), supportsCitations: false, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "openrouter", label: "OpenRouter · GLM 5.2", configured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL && getProviderCostRates("openrouter")), supportsCitations: false, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "zenmux", label: "ZenMux Gateway", configured: Boolean(process.env.ZENMUX_API_KEY && process.env.ZENMUX_MODEL && getProviderCostRates("zenmux")), supportsCitations: false, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
    { id: "omnirouters", label: "OmniRouters Gateway", configured: Boolean(process.env.OMNIROUTERS_API_KEY && process.env.OMNIROUTERS_MODEL && getProviderCostRates("omnirouters")), supportsCitations: false, health: "untested", latestStatus: null, lastTestedAt: null, verifiedAnswers: 0, presencePct: null },
  ];
}

export async function loadProviderStatuses(viewer: Viewer): Promise<ProviderStatus[]> {
  const configured = getProviderStatuses();
  if (viewer.mode === "demo") return configured.map((provider) => ({ ...provider, configured: true, health: "available" }));
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return configured;
  const [attempts, answers] = await Promise.all([
    supabaseRest<Array<{ provider: string; status: string; completed_at: string | null; created_at: string }>>(
      `run_attempts?select=provider,status,completed_at,created_at&organization_id=eq.${organizationId}&order=created_at.desc&limit=100`,
      { token: viewer.accessToken },
    ),
    supabaseRest<Array<{ provider: string; brand_present: boolean | null }>>(
      `run_answers?select=provider,brand_present&organization_id=eq.${organizationId}&review_status=eq.verified`,
      { token: viewer.accessToken },
    ),
  ]);
  return configured.map((provider) => {
    const latest = attempts.find((attempt) => attempt.provider === provider.id);
    const verified = answers.filter((answer) => answer.provider === provider.id);
    const presenceKnown = verified.filter((answer) => answer.brand_present !== null);
    const presencePct = presenceKnown.length
      ? clampPct((presenceKnown.filter((answer) => answer.brand_present).length / presenceKnown.length) * 100)
      : null;
    const health: ProviderHealth = latest?.status === "complete"
      ? "available"
      : latest && ["failed", "rate_limited", "excluded"].includes(latest.status)
        ? "limited"
        : "untested";
    return {
      ...provider,
      health,
      latestStatus: latest?.status || null,
      lastTestedAt: latest ? dateLabel(latest.completed_at || latest.created_at) : null,
      verifiedAnswers: verified.length,
      presencePct,
    };
  });
}

export async function loadWorkspaceContext(viewer: Viewer): Promise<WorkspaceContext | null> {
  if (viewer.mode === "demo") return { organizationId: "10000000-0000-4000-8000-000000000001", projectId: "20000000-0000-4000-8000-000000000001", categoryId: "30000000-0000-4000-8000-000000000001", clusterId: "40000000-0000-4000-8000-000000000001", organizationName: "Northstar HR", website: "https://northstarhr.example", category: "HR software for distributed teams" };
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const [organizations, projects, categories, clusters] = await Promise.all([
    supabaseRest<Array<{ name: string; website: string | null }>>(`organizations?select=name,website&id=eq.${organizationId}&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`projects?select=id&organization_id=eq.${organizationId}&status=eq.active&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string; name: string }>>(`categories?select=id,name&organization_id=eq.${organizationId}&active=eq.true&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`prompt_clusters?select=id&organization_id=eq.${organizationId}&order=priority.asc&limit=1`, { token: viewer.accessToken }),
  ]);
  if (!organizations[0] || !projects[0] || !categories[0]) return null;
  return { organizationId, projectId: projects[0].id, categoryId: categories[0].id, clusterId: clusters[0]?.id || null, organizationName: organizations[0].name, website: organizations[0].website, category: categories[0].name };
}

export async function loadEvidence(viewer: Viewer, options: { limit?: number; offset?: number } = {}): Promise<WorkspaceEvidence[]> {
  if (viewer.mode === "demo") return [];
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const limit = Math.max(1, Math.min(100, Math.round(options.limit || 100)));
  const offset = Math.max(0, Math.round(options.offset || 0));
  const rows = await supabaseRest<Array<{ id: string; evidence_type: string; title: string; source_url: string | null; verification_status: WorkspaceEvidence["status"]; verified_at: string | null; expires_at: string | null; usage_rights: string | null }>>(
    `evidence_items?select=id,evidence_type,title,source_url,verification_status,verified_at,expires_at,usage_rights&project_id=eq.${context.projectId}&order=created_at.desc&limit=${limit}&offset=${offset}`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, type: row.evidence_type, title: row.title, sourceUrl: row.source_url, status: row.verification_status, verifiedAt: row.verified_at ? dateLabel(row.verified_at) : null, expiresAt: row.expires_at ? dateLabel(row.expires_at) : null, rights: row.usage_rights }));
}

export async function loadVerifiedClaims(viewer: Viewer): Promise<VerifiedClaim[]> {
  if (viewer.mode === "demo") return [{
    id: "demo-claim-1",
    evidenceItemId: "demo-evidence-1",
    evidenceTitle: "Northstar HR security review",
    evidenceUrl: "https://northstarhr.example/security",
    claimText: "Northstar HR encrypts customer data in transit.",
    approvedWording: "Customer data is encrypted in transit using current transport security controls.",
    limitations: "Fictional demonstration record. This is not a real company claim.",
    publicUse: false,
    verifiedAt: "Jul 24, 2026",
    expiresAt: null,
  }];
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const rows = await supabaseRest<Array<{
    id: string;
    evidence_item_id: string | null;
    claim_text: string;
    approved_wording: string;
    limitations: string | null;
    public_use: boolean;
    verified_at: string | null;
    expires_at: string | null;
    evidence: { title: string; source_url: string | null } | null;
  }>>(
    `verified_claims?select=id,evidence_item_id,claim_text,approved_wording,limitations,public_use,verified_at,expires_at,evidence:evidence_items(title,source_url)&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=created_at.desc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({
    id: row.id,
    evidenceItemId: row.evidence_item_id,
    evidenceTitle: row.evidence?.title || null,
    evidenceUrl: row.evidence?.source_url || null,
    claimText: row.claim_text,
    approvedWording: row.approved_wording,
    limitations: row.limitations,
    publicUse: row.public_use,
    verifiedAt: row.verified_at ? dateLabel(row.verified_at) : null,
    expiresAt: row.expires_at ? dateLabel(row.expires_at) : null,
  }));
}

export async function loadRunAnswers(viewer: Viewer, runId: string): Promise<WorkspaceRunAnswer[]> {
  if (viewer.mode === "demo") return [];
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{ id: string; prompt_key: string; prompt_text: string | null; provider: string; model: string | null; answer_text: string; citations_json: WorkspaceRunAnswer["citations"]; review_status: WorkspaceRunAnswer["status"]; collected_at: string }>>(
    `run_answers?select=id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at&organization_id=eq.${organizationId}&run_id=eq.${runId}&order=collected_at.asc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, prompt: row.prompt_text || row.prompt_key, provider: row.provider, model: row.model, answer: row.answer_text, citations: row.citations_json || [], status: row.review_status, collectedAt: dateLabel(row.collected_at) }));
}

export type RunCostEvent = {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  costUsd: number;
  costSource: "estimated" | "provider_reported";
};

export async function loadRunCostEvents(viewer: Viewer, runId: string): Promise<RunCostEvent[]> {
  if (viewer.mode === "demo") return [];
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{ provider: string; model: string; input_tokens: number | null; output_tokens: number | null; total_tokens: number | null; estimated_cost_usd: number | string; cost_source: RunCostEvent["costSource"] }>>(
    `ai_cost_events?select=provider,model,input_tokens,output_tokens,total_tokens,estimated_cost_usd,cost_source&organization_id=eq.${organizationId}&run_id=eq.${encodeURIComponent(runId)}&order=observed_at.asc&limit=500`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ provider: row.provider, model: row.model, inputTokens: row.input_tokens, outputTokens: row.output_tokens, totalTokens: row.total_tokens, costUsd: Number(row.estimated_cost_usd), costSource: row.cost_source }));
}

export async function loadRunConfiguration(viewer: Viewer, runId: string): Promise<{ promptIds: string[]; provider: string } | null> {
  if (viewer.mode === "demo") return { promptIds: demoPrompts.slice(0, 1).map((prompt) => prompt.id), provider: "mock" };
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const [runs, prompts] = await Promise.all([
    supabaseRest<Array<{ provider_ids: string[] }>>(`runs?select=provider_ids&id=eq.${encodeURIComponent(runId)}&organization_id=eq.${organizationId}&status=in.(complete,partial)&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ prompt_id: string }>>(`run_prompt_selections?select=prompt_id&run_id=eq.${encodeURIComponent(runId)}&organization_id=eq.${organizationId}&order=created_at.asc&limit=100`, { token: viewer.accessToken }),
  ]);
  if (!runs[0]?.provider_ids?.[0] || !prompts.length) return null;
  return { provider: runs[0].provider_ids[0], promptIds: prompts.map((prompt) => prompt.prompt_id) };
}

export async function loadLatestReviewedAnswers(viewer: Viewer, limit = 12): Promise<WorkspaceRunAnswer[]> {
  if (viewer.mode === "demo") return [];
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const safeLimit = Math.max(1, Math.min(50, Math.round(limit)));
  const rows = await supabaseRest<Array<{ id: string; prompt_key: string; prompt_text: string | null; provider: string; model: string | null; answer_text: string; citations_json: WorkspaceRunAnswer["citations"]; review_status: WorkspaceRunAnswer["status"]; collected_at: string }>>(
    `run_answers?select=id,prompt_key,prompt_text,provider,model,answer_text,citations_json,review_status,collected_at&organization_id=eq.${organizationId}&review_status=eq.verified&order=collected_at.desc&limit=${safeLimit}`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, prompt: row.prompt_text || row.prompt_key, provider: row.provider, model: row.model, answer: row.answer_text, citations: row.citations_json || [], status: row.review_status, collectedAt: dateLabel(row.collected_at) }));
}

const demoPrompts: WorkspacePrompt[] = [
  { id: "demo-1", cluster: "Discovery", text: "Best HR software for distributed teams", approved: true },
  { id: "demo-2", cluster: "Use case", text: "What HR platform works for a 200-person remote company?", approved: true },
  { id: "demo-3", cluster: "Comparison", text: "Northstar HR vs Deel for a global team", approved: false },
  { id: "demo-4", cluster: "Alternative", text: "Best alternatives to Rippling for distributed companies", approved: true },
  { id: "demo-5", cluster: "Trust", text: "Most reliable HRIS for cross-border compliance", approved: false },
  { id: "demo-6", cluster: "Constraint", text: "Affordable HR platform for a remote startup", approved: true },
];

export async function loadPrompts(viewer: Viewer): Promise<WorkspacePrompt[]> {
  if (viewer.mode === "demo") return demoPrompts;
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{ id: string; prompt_key: string; prompt_text: string; active: boolean; prompt_clusters: { name: string } | null }>>(
    `prompts?select=id,prompt_key,prompt_text,active,prompt_clusters(name)&organization_id=eq.${organizationId}&order=created_at.asc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => ({ id: row.id, cluster: row.prompt_clusters?.name || row.prompt_key || "Baseline", text: row.prompt_text, approved: row.active }));
}

export async function loadWorkspaceCompetitors(viewer: Viewer): Promise<string[]> {
  if (viewer.mode === "demo") return Array.from(new Set(sourceMapEntries.flatMap((source) => source.competitors)));
  const context = await loadWorkspaceContext(viewer);
  if (!context) return [];
  const rows = await supabaseRest<Array<{ name: string }>>(
    `competitors?select=name&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&active=eq.true&order=name.asc`,
    { token: viewer.accessToken },
  );
  return rows.map((row) => row.name).filter(Boolean);
}

export async function loadWorkspaceSummary(viewer: Viewer): Promise<WorkspaceSummary | null> {
  if (viewer.mode === "demo") return { organizationId: "10000000-0000-4000-8000-000000000001", organizationName: "Northstar HR", website: "northstarhr.example", category: "HR software for distributed teams", promptCount: demoPrompts.filter((prompt) => prompt.approved).length };
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const [organizations, categories, prompts] = await Promise.all([
    supabaseRest<Array<{ name: string; website: string | null }>>(`organizations?select=name,website&id=eq.${organizationId}&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ name: string }>>(`categories?select=name&organization_id=eq.${organizationId}&active=eq.true&order=created_at.asc&limit=1`, { token: viewer.accessToken }),
    supabaseRest<Array<{ id: string }>>(`prompts?select=id&organization_id=eq.${organizationId}&active=eq.true`, { token: viewer.accessToken }),
  ]);
  const organization = organizations[0];
  if (!organization) return null;
  return { organizationId, organizationName: organization.name, website: organization.website, category: categories[0]?.name || null, promptCount: prompts.length };
}

const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function buildDecisionActions(signal: Omit<DecisionSignal, "actions">): DecisionSignal["actions"] {
  const actions: DecisionSignal["actions"] = [];
  if (signal.reviewedRuns < 2) actions.push({ priority: "now", title: "Establish a repeatable baseline", reason: "One reviewed run cannot separate a durable pattern from answer variation.", href: "/app/runs" });
  if (signal.answerCompletionPct !== null && signal.answerCompletionPct < 90) actions.push({ priority: "now", title: "Repair collection coverage", reason: `${signal.answerCompletionPct}% of the expected answer matrix was reviewed. Diagnose failed provider or prompt combinations before acting.`, href: signal.latestRunId ? `/app/runs/${signal.latestRunId}` : "/app/runs" });
  if (signal.providerCount < 2) actions.push({ priority: "now", title: "Add a second answer provider", reason: "Cross-provider agreement cannot be measured from a single provider.", href: "/app/settings#providers" });
  if (signal.sourceReviewPct !== null && signal.sourceReviewPct < 80) actions.push({ priority: "next", title: "Complete the source review", reason: `${signal.sourceReviewPct}% of mapped sources have a documented page review.`, href: "/app/source-map" });
  if (signal.sourceDependencyPct !== null && signal.sourceDependencyPct >= 50) actions.push({ priority: "next", title: "Reduce source concentration risk", reason: `The top three sources account for ${signal.sourceDependencyPct}% of observed citations. Diversify credible evidence routes.`, href: "/app/opportunities" });
  if (signal.recommendationConsensusPct !== null && signal.recommendationConsensusPct < 70) actions.push({ priority: "watch", title: "Treat the latest recommendation pattern as unstable", reason: `Providers agree on brand presence for ${signal.recommendationConsensusPct}% of comparable buyer questions.`, href: "/app/runs" });
  if (!actions.length) actions.push({ priority: "next", title: "Advance the highest-evidence gap", reason: "Collection coverage, cross-provider agreement, and source review are sufficient for a controlled next action.", href: "/app/opportunities" });
  return actions.slice(0, 4);
}

export async function loadDecisionSignal(viewer: Viewer): Promise<DecisionSignal> {
  if (viewer.mode === "demo") {
    const base: Omit<DecisionSignal, "actions"> = {
      reviewedRuns: 3,
      latestRunId: demoRuns[0].id,
      latestRunDate: demoRuns[0].date,
      providerCount: 4,
      promptCount: demoRuns[0].prompts,
      answerCount: demoRuns[0].answers,
      answerCompletionPct: 100,
      recommendationConsensusPct: 68,
      presenceRange: 7,
      presenceDelta: 3,
      sourceReviewPct: 88,
      sourceDependencyPct: 57,
      recurringSourcePct: 75,
      evidenceObservations: sourceMapEntries.reduce((sum, source) => sum + source.evidenceCount, 0),
      decisionReadiness: "directional",
    };
    return { ...base, actions: buildDecisionActions(base) };
  }

  const organizationId = await getPrimaryOrganizationId(viewer);
  const empty: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: 0, latestRunId: null, latestRunDate: null, providerCount: 0, promptCount: 0, answerCount: 0,
    answerCompletionPct: null, recommendationConsensusPct: null, presenceRange: null, presenceDelta: null,
    sourceReviewPct: null, sourceDependencyPct: null, recurringSourcePct: null, evidenceObservations: 0, decisionReadiness: "insufficient",
  };
  if (!organizationId) return { ...empty, actions: buildDecisionActions(empty) };

  type DecisionRunRow = RunRow & { provider_ids: string[] };
  const [rows, sources] = await Promise.all([
    supabaseRest<DecisionRunRow[]>(`runs?select=id,status,provider_ids,prompt_count,answer_count,citation_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${organizationId}&status=in.(review,complete,partial)&order=created_at.desc&limit=8`, { token: viewer.accessToken }),
    loadSourceMap(viewer),
  ]);
  const latest = rows[0];
  if (!latest) return { ...empty, sourceReviewPct: sources.length ? clampPct((sources.filter((source) => source.reviewedAt).length / sources.length) * 100) : null, actions: buildDecisionActions(empty) };

  const runIds = rows.map((row) => row.id);
  const answerRows = await supabaseRest<Array<{ prompt_key: string; provider: string; brand_present: boolean | null; collected_at: string }>>(
    `run_answers?select=prompt_key,provider,brand_present,collected_at&organization_id=eq.${organizationId}&run_id=in.(${runIds.join(",")})&order=collected_at.desc`,
    { token: viewer.accessToken },
  );
  const latestComparableAnswers = new Map<string, typeof answerRows[number]>();
  answerRows.forEach((answer) => {
    const key = `${answer.prompt_key}:${answer.provider}`;
    if (!latestComparableAnswers.has(key)) latestComparableAnswers.set(key, answer);
  });
  const answers = Array.from(latestComparableAnswers.values());
  const providerCount = new Set(answers.map((answer) => answer.provider)).size;
  const expectedAnswers = latest.prompt_count * providerCount;
  const promptAnswers = new Map<string, Array<boolean>>();
  answers.forEach((answer) => {
    if (answer.brand_present === null) return;
    const group = promptAnswers.get(answer.prompt_key) || [];
    group.push(answer.brand_present);
    promptAnswers.set(answer.prompt_key, group);
  });
  const comparable = Array.from(promptAnswers.values()).filter((group) => group.length >= 2);
  const agreed = comparable.filter((group) => group.every((value) => value === group[0])).length;
  const presences = rows.map((row) => Number(row.brand_presence_pct));
  const observationTotal = sources.reduce((sum, source) => sum + source.evidenceCount, 0);
  const topThreeObservations = [...sources].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, 3).reduce((sum, source) => sum + source.evidenceCount, 0);
  const sourceReviewPct = sources.length ? clampPct((sources.filter((source) => source.reviewedAt).length / sources.length) * 100) : null;
  const signalBase: Omit<DecisionSignal, "actions"> = {
    reviewedRuns: rows.length,
    latestRunId: latest.id,
    latestRunDate: dateLabel(latest.created_at),
    providerCount,
    promptCount: latest.prompt_count,
    answerCount: answers.length,
    answerCompletionPct: expectedAnswers ? clampPct((answers.length / expectedAnswers) * 100) : null,
    recommendationConsensusPct: comparable.length ? clampPct((agreed / comparable.length) * 100) : null,
    presenceRange: rows.length > 1 ? Math.round((Math.max(...presences) - Math.min(...presences)) * 10) / 10 : null,
    presenceDelta: rows.length > 1 ? Math.round((presences[0] - presences[1]) * 10) / 10 : null,
    sourceReviewPct,
    sourceDependencyPct: observationTotal ? clampPct((topThreeObservations / observationTotal) * 100) : null,
    recurringSourcePct: sources.length ? clampPct((sources.filter((source) => source.evidenceCount > 1).length / sources.length) * 100) : null,
    evidenceObservations: observationTotal,
    decisionReadiness: rows.length >= 2 && providerCount >= 2 && (sourceReviewPct ?? 0) >= 80 && (expectedAnswers ? answers.length / expectedAnswers >= .9 : false) ? "ready" : rows.length && answers.length ? "directional" : "insufficient",
  };
  return { ...signalBase, actions: buildDecisionActions(signalBase) };
}

export async function loadTeam(viewer: Viewer): Promise<{
  members: WorkspaceTeamMember[];
  invitations: WorkspaceInvitation[];
  role: WorkspaceRole | null;
}> {
  if (viewer.mode === "demo") {
    return {
      members: [{ userId: viewer.id, email: viewer.email, role: "owner", joinedAt: "Demo session", current: true }],
      invitations: [],
      role: "owner",
    };
  }
  const membership = await getPrimaryMembershipCached(viewer.id, viewer.accessToken || "");
  if (!membership) return { members: [], invitations: [], role: null };
  const [memberRows, invitationRows] = await Promise.all([
    supabaseRest<Array<{ user_id: string; member_email: string | null; role: WorkspaceRole; created_at: string }>>(
      `organization_members?select=user_id,member_email,role,created_at&organization_id=eq.${membership.organization_id}&order=created_at.asc`,
      { token: viewer.accessToken },
    ),
    supabaseRest<Array<{ id: string; email: string; role: Exclude<WorkspaceRole, "owner">; status: WorkspaceInvitation["status"]; expires_at: string }>>(
      `invitations?select=id,email,role,status,expires_at&organization_id=eq.${membership.organization_id}&status=eq.pending&order=created_at.desc`,
      { token: viewer.accessToken },
    ),
  ]);
  const now = Date.now();
  return {
    role: membership.role,
    members: memberRows.map((row) => ({
      userId: row.user_id,
      email: row.user_id === viewer.id ? viewer.email : row.member_email || "Workspace member",
      role: row.role,
      joinedAt: dateLabel(row.created_at),
      current: row.user_id === viewer.id,
    })),
    invitations: invitationRows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      status: new Date(row.expires_at).getTime() <= now ? "expired" : row.status,
      expiresAt: dateLabel(row.expires_at),
    })),
  };
}

export async function loadNotifications(viewer: Viewer): Promise<WorkspaceNotification[]> {
  if (viewer.mode === "demo") return [];
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return [];
  const rows = await supabaseRest<Array<{
    id: string;
    kind: WorkspaceNotification["kind"];
    title: string;
    body: string;
    href: string | null;
    read_at: string | null;
    created_at: string;
  }>>(
    `notifications?select=id,kind,title,body,href,read_at,created_at&organization_id=eq.${organizationId}&user_id=eq.${viewer.id}&order=created_at.desc&limit=50`,
    { token: viewer.accessToken },
  );
  const groups = new Map<string, WorkspaceNotification>();
  for (const row of rows) {
    const mappedCount = row.kind === "source_map_published" ? Number(row.body.match(/\d+/)?.[0] || 0) : 0;
    const title = row.kind === "source_map_published" ? "Source Map created from approved collection" : row.title;
    const body = row.kind === "source_map_published"
      ? `${mappedCount || "Cited"} page record${mappedCount === 1 ? "" : "s"} were mapped from provider-returned citations. Page-level review is still required before any record becomes a confirmed gap.`
      : row.body;
    const key = `${row.kind}\u0000${title}\u0000${body}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      current.read = current.read && Boolean(row.read_at);
      continue;
    }
    groups.set(key, {
      id: row.id,
      kind: row.kind,
      title,
      body,
      href: row.href,
      read: Boolean(row.read_at),
      createdAt: dateLabel(row.created_at),
      count: 1,
    });
  }
  return Array.from(groups.values());
}

export async function loadPendingDeletionRequest(viewer: Viewer): Promise<DeletionRequest | null> {
  if (viewer.mode === "demo") return null;
  const organizationId = await getPrimaryOrganizationId(viewer);
  if (!organizationId) return null;
  const rows = await supabaseRest<Array<{ id: string; status: DeletionRequest["status"]; scheduled_for: string; created_at: string }>>(
    `account_deletion_requests?select=id,status,scheduled_for,created_at&organization_id=eq.${organizationId}&requested_by=eq.${viewer.id}&status=eq.pending&limit=1`,
    { token: viewer.accessToken },
  );
  const row = rows[0];
  return row ? { id: row.id, status: row.status, scheduledFor: dateLabel(row.scheduled_for), createdAt: dateLabel(row.created_at) } : null;
}
