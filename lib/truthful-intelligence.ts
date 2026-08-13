import type { Viewer } from "@/lib/auth";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { comparableObservationKey, findComparablePrior, type ComparableObservation } from "@/lib/comparability-integrity";
import { loadWorkspaceContext } from "@/lib/data";
import { loadWeeklyIntelligence, type IntelligenceChange, type IntelligenceRun, type WeeklyIntelligence } from "@/lib/intelligence-loop";
import { supabaseRest } from "@/lib/supabase-rest";

type StrictRunRow = {
  id: string;
  methodology_version: string | null;
  provider_ids: string[];
  prompt_count: number;
  brand_presence_pct: number | string;
  first_mention_pct: number | string;
  new_source_count: number;
  created_at: string;
};

type StrictAnswerRow = {
  id: string;
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string }> | null;
  brand_present: boolean | null;
  brand_position: number | null;
  collected_at: string;
};

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const clampPct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(value));

function canonicalCitations(row: StrictAnswerRow) {
  return Array.from(new Set((row.citations_json || []).flatMap((citation) => {
    if (!citation.url) return [];
    try {
      const canonical = canonicalizeEvidenceUrl(citation.url);
      return canonical ? [canonical] : [];
    } catch {
      return [];
    }
  })));
}

function observation(row: StrictAnswerRow): ComparableObservation {
  return {
    runId: row.run_id,
    promptKey: row.prompt_key,
    promptText: row.prompt_text,
    provider: row.provider,
    model: row.model,
  };
}

function strictRunView(run: StrictRunRow, answers: StrictAnswerRow[]): IntelligenceRun {
  const knownPresence = answers.filter((answer) => answer.brand_present !== null);
  const knownPositions = answers.filter((answer) => answer.brand_position !== null);
  const citations = answers.reduce((total, answer) => total + canonicalCitations(answer).length, 0);
  const promptTexts = answers.map((answer) => normalize(answer.prompt_text || "")).filter(Boolean);
  return {
    id: run.id,
    date: dateLabel(run.created_at),
    providers: Array.from(new Set(answers.map((answer) => answer.provider))).sort(),
    prompts: new Set(promptTexts).size || run.prompt_count,
    answers: answers.length,
    citations,
    presence: knownPresence.length
      ? clampPct((knownPresence.filter((answer) => answer.brand_present).length / knownPresence.length) * 100)
      : Number(run.brand_presence_pct),
    firstMention: knownPositions.length
      ? clampPct((knownPositions.filter((answer) => answer.brand_position === 1).length / knownPositions.length) * 100)
      : Number(run.first_mention_pct),
    newSources: run.new_source_count,
    costUsd: null,
    costSource: "not recorded",
    tokens: null,
  };
}

function buildStrictChanges(latest: StrictAnswerRow[], previous: StrictAnswerRow[], latestRunId: string): IntelligenceChange[] {
  const latestByKey = new Map(latest.flatMap((answer) => {
    const key = comparableObservationKey(observation(answer));
    return key ? [[key, answer] as const] : [];
  }));
  const previousByKey = new Map(previous.flatMap((answer) => {
    const key = comparableObservationKey(observation(answer));
    return key ? [[key, answer] as const] : [];
  }));
  const gained: string[] = [];
  const lost: string[] = [];
  let changedAnswerText = 0;
  for (const [key, current] of latestByKey) {
    const prior = previousByKey.get(key);
    if (!prior) continue;
    const prompt = normalize(current.prompt_text || "");
    if (prior.brand_present !== true && current.brand_present === true) gained.push(prompt);
    if (prior.brand_present === true && current.brand_present !== true) lost.push(prompt);
    if (normalize(prior.answer_text) !== normalize(current.answer_text)) changedAnswerText += 1;
  }

  const latestSources = new Set(latest.flatMap(canonicalCitations));
  const previousSources = new Set(previous.flatMap(canonicalCitations));
  const addedSources = [...latestSources].filter((url) => !previousSources.has(url));
  const lostSources = [...previousSources].filter((url) => !latestSources.has(url));
  const changes: IntelligenceChange[] = [];

  if (gained.length || lost.length) changes.push({
    id: "brand-movement",
    kind: "brand",
    tone: lost.length ? "attention" : "positive",
    title: `${gained.length} brand gain${gained.length === 1 ? "" : "s"} · ${lost.length} brand loss${lost.length === 1 ? "" : "es"}`,
    detail: [...gained.slice(0, 2).map((prompt) => `Appeared: ${prompt}`), ...lost.slice(0, 2).map((prompt) => `Disappeared: ${prompt}`)].join(" · "),
    href: `/app/runs/${latestRunId}`,
  });
  changes.push({
    id: "source-movement",
    kind: "source",
    tone: lostSources.length ? "attention" : addedSources.length ? "positive" : "neutral",
    title: `${addedSources.length} new source${addedSources.length === 1 ? "" : "s"} · ${lostSources.length} lost source${lostSources.length === 1 ? "" : "s"}`,
    detail: [...addedSources.slice(0, 2).map((url) => `New: ${new URL(url).hostname}`), ...lostSources.slice(0, 2).map((url) => `Lost: ${new URL(url).hostname}`)].join(" · ") || "The reviewed canonical citation set is unchanged.",
    href: "/app/source-map",
  });
  changes.push({
    id: "answer-movement",
    kind: "answer",
    tone: changedAnswerText ? "neutral" : "positive",
    title: `${changedAnswerText} comparable answer${changedAnswerText === 1 ? "" : "s"} changed exact text`,
    detail: "This compares exact answer text only after buyer-question text, provider, exact model, and methodology match. It does not explain why an answer changed or claim causation.",
    href: `/app/runs/${latestRunId}`,
  });
  return changes;
}

function confidenceWithRepeatability(base: WeeklyIntelligence, hasPrevious: boolean) {
  const confidenceChecks = base.confidenceChecks.map((check) => check.label === "Repeatability"
    ? {
      ...check,
      state: hasPrevious ? "pass" as const : base.latest ? "attention" as const : "missing" as const,
      value: hasPrevious ? "2 exact comparable runs" : base.latest ? "1 exact baseline" : "No run",
      detail: hasPrevious
        ? "The reviewed pair has the same persisted buyer-question text, provider, exact model, and methodology."
        : "A second reviewed run with the same persisted buyer-question text, provider, exact model, and methodology is required.",
    }
    : check);
  const passing = confidenceChecks.filter((check) => check.state === "pass").length;
  const confidence: WeeklyIntelligence["confidence"] = passing === confidenceChecks.length
    ? "decision-ready"
    : base.latest && passing >= 2
      ? "directional"
      : "insufficient";
  return { confidenceChecks, confidence };
}

function withheldReason(reason: ReturnType<typeof findComparablePrior>["latest"]["reason"]) {
  if (reason === "missing_exact_model") return "The current reviewed baseline is missing exact model provenance, so cross-collection movement is withheld.";
  if (reason === "missing_question_text") return "The current reviewed baseline is missing persisted buyer-question text, so cross-collection movement is withheld.";
  if (reason === "missing_methodology") return "The current reviewed baseline is missing methodology provenance, so cross-collection movement is withheld.";
  if (reason === "empty_reviewed_matrix") return "The current run has no complete reviewed answer matrix to compare.";
  return "No earlier reviewed collection matched the exact buyer-question text, provider, model, and methodology matrix.";
}

export async function loadTruthfulWeeklyIntelligence(viewer: Viewer): Promise<WeeklyIntelligence> {
  const base = await loadWeeklyIntelligence(viewer);
  if (viewer.mode === "demo" || !base.latest || !viewer.accessToken) return base;
  const context = await loadWorkspaceContext(viewer);
  if (!context) return base;

  const runs = await supabaseRest<StrictRunRow[]>(
    `runs?select=id,methodology_version,provider_ids,prompt_count,brand_presence_pct,first_mention_pct,new_source_count,created_at&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&status=in.(complete,partial)&order=created_at.desc&limit=6`,
    { token: viewer.accessToken },
  );
  const runIds = runs.map((run) => run.id);
  if (!runIds.length) return base;
  const answers = await supabaseRest<StrictAnswerRow[]>(
    `run_answers?select=id,run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,brand_present,brand_position,collected_at&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified&order=collected_at.desc&limit=500`,
    { token: viewer.accessToken },
  );
  const latestRun = runs.find((run) => run.id === base.latest?.id) || null;
  if (!latestRun) return base;

  const comparableRuns = runs.map((run) => ({ id: run.id, methodologyVersion: run.methodology_version }));
  const latestComparable = { id: latestRun.id, methodologyVersion: latestRun.methodology_version };
  const observations = answers.map(observation);
  const candidates = comparableRuns.filter((run) => run.id !== latestRun.id);
  const result = findComparablePrior(latestComparable, candidates, observations);
  const previousRun = result.previous ? runs.find((run) => run.id === result.previous?.id) || null : null;
  const latestAnswers = answers.filter((answer) => answer.run_id === latestRun.id);
  const previousAnswers = previousRun ? answers.filter((answer) => answer.run_id === previousRun.id) : [];
  const previous = previousRun ? strictRunView(previousRun, previousAnswers) : null;
  const { confidenceChecks, confidence } = confidenceWithRepeatability(base, Boolean(previous));

  if (!previous) {
    return {
      ...base,
      previous: null,
      changes: [{
        id: "strict-comparison-withheld",
        kind: "baseline",
        tone: "attention",
        title: result.latest.reason === "comparable" ? "No exact comparable prior run yet" : "Cross-collection movement withheld",
        detail: withheldReason(result.latest.reason),
        href: `/app/runs/${latestRun.id}`,
      }],
      confidenceChecks,
      confidence,
      nextAction: {
        priority: "now",
        title: "Preserve the exact comparison matrix",
        reason: "Repeat only after the persisted buyer-question text, provider, exact model, and methodology provenance are complete and unchanged.",
        href: "/app/runs",
        cta: "Prepare comparable run",
      },
      cadence: {
        mode: "reviewed runs",
        description: "Movement is reported only after two human-reviewed runs share the exact persisted buyer-question text, provider, exact model, and methodology matrix.",
      },
    };
  }

  const strictChanges = buildStrictChanges(latestAnswers, previousAnswers, latestRun.id);
  const baseAlreadyUsedStrictPrior = base.previous?.id === previous.id;
  return {
    ...base,
    previous,
    changes: strictChanges,
    confidenceChecks,
    confidence,
    nextAction: baseAlreadyUsedStrictPrior ? base.nextAction : {
      priority: "watch",
      title: "Continue the controlled comparison",
      reason: "The strict comparable prior was selected from reviewed history using exact buyer-question text, provider, exact model, and methodology provenance.",
      href: "/app/runs",
      cta: "Prepare next comparable run",
    },
    cadence: {
      mode: "reviewed runs",
      description: `Current movement compares ${previous.date} with ${base.latest.date} only because the reviewed buyer-question text, provider, exact model, and methodology matrix matches.`,
    },
  };
}
