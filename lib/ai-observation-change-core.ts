import { assessExactQuestionComparability } from "./intelligence-comparability.ts";

export type AiObservationChangeKind = "brand_mention" | "citation" | "source" | "competitor" | "answer_context";

export type AiObservationChangeEvent = {
  id: string;
  kind: AiObservationChangeKind;
  direction: "new" | "lost" | "changed";
  title: string;
  detail: string;
};

export type AiObservationAnswer = {
  runId: string;
  promptKey: string;
  prompt: string;
  provider: string;
  model: string | null;
  answerText: string;
  brandPresent: boolean | null;
  citationUrls: string[];
};

export type AiObservationChangeGraph = {
  status: "baseline" | "comparable" | "withheld" | "fictional";
  comparable: boolean;
  latestRunId: string;
  previousRunId: string | null;
  summary: {
    brandGains: number;
    brandLosses: number;
    citationGains: number;
    citationLosses: number;
    sourceGains: number;
    sourceLosses: number;
    competitorGains: number;
    competitorLosses: number;
    answerContextChanges: number;
  };
  coverage: {
    competitorContext: "comparable" | "unavailable";
  };
  events: AiObservationChangeEvent[];
  note: string;
};

type Input = {
  latest: { id: string; methodologyVersion: string | null };
  previous: { id: string; methodologyVersion: string | null } | null;
  answers: AiObservationAnswer[];
  competitors?: Array<{ runId: string; names: string[] }>;
  competitorContextComparable?: boolean;
};

export const EMPTY_AI_CHANGE_SUMMARY: AiObservationChangeGraph["summary"] = {
  brandGains: 0,
  brandLosses: 0,
  citationGains: 0,
  citationLosses: 0,
  sourceGains: 0,
  sourceLosses: 0,
  competitorGains: 0,
  competitorLosses: 0,
  answerContextChanges: 0,
};

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();
const answerKey = (answer: AiObservationAnswer) => [answer.promptKey, cleanText(answer.prompt), answer.provider, answer.model || "model-not-recorded"].join("\u0000");
const difference = (left: Set<string>, right: Set<string>) => [...left].filter((value) => !right.has(value));

function competitorSet(rows: Input["competitors"], runId: string) {
  return new Set((rows || [])
    .filter((row) => row.runId === runId)
    .flatMap((row) => row.names)
    .map(cleanText)
    .filter(Boolean));
}

function baseGraph(input: Input) {
  const previousRunId = input.previous?.id || null;
  const latestAnswers = input.answers.filter((answer) => answer.runId === input.latest.id);
  const previousAnswers = previousRunId ? input.answers.filter((answer) => answer.runId === previousRunId) : [];
  return {
    latestAnswers,
    previousAnswers,
    base: {
      latestRunId: input.latest.id,
      previousRunId,
      summary: { ...EMPTY_AI_CHANGE_SUMMARY },
      coverage: {
        competitorContext: input.competitorContextComparable ? "comparable" as const : "unavailable" as const,
      },
    },
  };
}

export function fictionalAiObservationChangeGraph(latestRunId: string, previousRunId: string | null): AiObservationChangeGraph {
  return {
    status: "fictional",
    comparable: false,
    latestRunId,
    previousRunId,
    summary: { ...EMPTY_AI_CHANGE_SUMMARY },
    coverage: { competitorContext: "unavailable" },
    events: [],
    note: "AI Observation Change Graph is disabled in the fictional demo so demo values cannot be mistaken for customer evidence.",
  };
}

export function buildAiObservationChangeGraph(input: Input): AiObservationChangeGraph {
  const { latestAnswers, previousAnswers, base } = baseGraph(input);
  if (!input.previous) {
    return {
      ...base,
      status: "baseline",
      comparable: false,
      events: [],
      note: "One reviewed collection establishes the AI-observation baseline. A second exactly comparable reviewed collection is required before Foremention reports movement.",
    };
  }

  const sameMethodology = Boolean(input.latest.methodologyVersion)
    && input.latest.methodologyVersion === input.previous.methodologyVersion;
  const exactPair = assessExactQuestionComparability(
    input.latest.id,
    input.previous.id,
    [...latestAnswers, ...previousAnswers].map((answer) => ({
      runId: answer.runId,
      promptKey: answer.promptKey,
      promptText: answer.prompt,
      provider: answer.provider,
      model: answer.model,
    })),
  );

  if (!sameMethodology || !exactPair.comparable) {
    const reason = !sameMethodology
      ? "The methodology version changed."
      : exactPair.reason || "The exact buyer-question/provider/model matrix is not comparable.";
    return {
      ...base,
      status: "withheld",
      comparable: false,
      events: [],
      note: `${reason} The collections remain valid observations on their own, but Foremention will not label their difference as movement.`,
    };
  }

  const latestByKey = new Map(latestAnswers.map((answer) => [answerKey(answer), answer]));
  const previousByKey = new Map(previousAnswers.map((answer) => [answerKey(answer), answer]));
  const brandGains: string[] = [];
  const brandLosses: string[] = [];
  let citationGains = 0;
  let citationLosses = 0;
  let answerContextChanges = 0;

  for (const [key, latestAnswer] of latestByKey) {
    const previousAnswer = previousByKey.get(key);
    if (!previousAnswer) continue;
    if (previousAnswer.brandPresent !== true && latestAnswer.brandPresent === true) brandGains.push(latestAnswer.prompt);
    if (previousAnswer.brandPresent === true && latestAnswer.brandPresent !== true) brandLosses.push(latestAnswer.prompt);
    if (cleanText(previousAnswer.answerText) !== cleanText(latestAnswer.answerText)) answerContextChanges += 1;

    const currentCitations = new Set(latestAnswer.citationUrls);
    const priorCitations = new Set(previousAnswer.citationUrls);
    citationGains += difference(currentCitations, priorCitations).length;
    citationLosses += difference(priorCitations, currentCitations).length;
  }

  const latestSources = new Set(latestAnswers.flatMap((answer) => answer.citationUrls));
  const previousSources = new Set(previousAnswers.flatMap((answer) => answer.citationUrls));
  const sourceGains = difference(latestSources, previousSources);
  const sourceLosses = difference(previousSources, latestSources);
  const latestCompetitors = competitorSet(input.competitors, input.latest.id);
  const previousCompetitors = competitorSet(input.competitors, input.previous.id);
  const competitorGains = input.competitorContextComparable ? difference(latestCompetitors, previousCompetitors) : [];
  const competitorLosses = input.competitorContextComparable ? difference(previousCompetitors, latestCompetitors) : [];

  const summary: AiObservationChangeGraph["summary"] = {
    brandGains: brandGains.length,
    brandLosses: brandLosses.length,
    citationGains,
    citationLosses,
    sourceGains: sourceGains.length,
    sourceLosses: sourceLosses.length,
    competitorGains: competitorGains.length,
    competitorLosses: competitorLosses.length,
    answerContextChanges,
  };
  const events: AiObservationChangeEvent[] = [];

  if (brandGains.length || brandLosses.length) events.push({
    id: "brand-mentions",
    kind: "brand_mention",
    direction: brandLosses.length ? "changed" : "new",
    title: `${brandGains.length} new brand mention${brandGains.length === 1 ? "" : "s"} · ${brandLosses.length} lost`,
    detail: [...brandGains.slice(0, 2).map((prompt) => `Appeared: ${prompt}`), ...brandLosses.slice(0, 2).map((prompt) => `Disappeared: ${prompt}`)].join(" · "),
  });
  if (citationGains || citationLosses) events.push({
    id: "citation-observations",
    kind: "citation",
    direction: citationLosses ? "changed" : "new",
    title: `${citationGains} new citation observation${citationGains === 1 ? "" : "s"} · ${citationLosses} lost`,
    detail: "Citation movement compares canonical URL observations inside the same reviewed exact-question/provider/exact-model answer slots.",
  });
  if (sourceGains.length || sourceLosses.length) events.push({
    id: "unique-sources",
    kind: "source",
    direction: sourceLosses.length ? "changed" : "new",
    title: `${sourceGains.length} new unique source${sourceGains.length === 1 ? "" : "s"} · ${sourceLosses.length} lost`,
    detail: "Unique-source movement is derived from canonical citation URLs after the exact comparison pair passes the evidence gate.",
  });
  if (input.competitorContextComparable && (competitorGains.length || competitorLosses.length)) events.push({
    id: "competitor-context",
    kind: "competitor",
    direction: competitorLosses.length ? "changed" : "new",
    title: `${competitorGains.length} newly observed competitor${competitorGains.length === 1 ? "" : "s"} · ${competitorLosses.length} lost`,
    detail: [...competitorGains.slice(0, 3).map((name) => `New on reviewed cited pages: ${name}`), ...competitorLosses.slice(0, 3).map((name) => `No longer observed on reviewed cited pages: ${name}`)].join(" · "),
  });
  if (answerContextChanges) events.push({
    id: "answer-context",
    kind: "answer_context",
    direction: "changed",
    title: `${answerContextChanges} comparable AI answer${answerContextChanges === 1 ? "" : "s"} changed exact text`,
    detail: "This records exact answer-text change only. It does not claim that meaning, factual accuracy, buyer behavior, or a customer action caused the difference.",
  });

  return {
    ...base,
    status: "comparable",
    comparable: true,
    summary,
    events,
    note: "These events use the exact comparable reviewed collection pair already selected by Foremention, including exact persisted buyer-question text. Observed differences do not establish causation.",
  };
}
