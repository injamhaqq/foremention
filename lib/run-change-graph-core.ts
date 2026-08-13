export type RunChangeEventKind = "methodology" | "brand_mention" | "citation" | "source" | "competitor" | "context";

export type RunChangeEvent = {
  id: string;
  kind: RunChangeEventKind;
  direction: "new" | "lost" | "changed" | "withheld";
  title: string;
  detail: string;
};

export type RunChangeAnswer = {
  runId: string;
  promptKey: string;
  prompt: string;
  provider: string;
  model: string | null;
  answerText: string;
  brandPresent: boolean | null;
  citationUrls: string[];
};

export type RunChangeInput = {
  latest: { id: string; methodologyVersion: string | null };
  previous: { id: string; methodologyVersion: string | null } | null;
  answers: RunChangeAnswer[];
  competitors?: Array<{ runId: string; names: string[] }>;
};

export type RunChangeGraph = {
  status: "baseline" | "comparable" | "not_comparable" | "fictional";
  comparable: boolean;
  latestRunId: string;
  previousRunId: string | null;
  methodology: { latest: string | null; previous: string | null };
  answerMatrix: { latest: number; previous: number; missingExactModels: number; missingQuestionTexts: number };
  summary: {
    brandGains: number;
    brandLosses: number;
    citationGains: number;
    citationLosses: number;
    sourceGains: number;
    sourceLosses: number;
    competitorGains: number;
    competitorLosses: number;
    contextChanges: number;
  };
  events: RunChangeEvent[];
  note: string;
};

export const EMPTY_RUN_CHANGE_SUMMARY: RunChangeGraph["summary"] = {
  brandGains: 0,
  brandLosses: 0,
  citationGains: 0,
  citationLosses: 0,
  sourceGains: 0,
  sourceLosses: 0,
  competitorGains: 0,
  competitorLosses: 0,
  contextChanges: 0,
};

const normalizedText = (value: string) => value.replace(/\s+/g, " ").trim();
const keyFor = (answer: RunChangeAnswer) => `${answer.promptKey}\u0000${normalizedText(answer.prompt)}\u0000${answer.provider}\u0000${answer.model || "model-not-recorded"}`;
const difference = (left: Set<string>, right: Set<string>) => [...left].filter((value) => !right.has(value));

function competitorSet(rows: RunChangeInput["competitors"], runId: string) {
  return new Set((rows || [])
    .filter((row) => row.runId === runId)
    .flatMap((row) => row.names)
    .map(normalizedText)
    .filter(Boolean));
}

function baseGraph(input: RunChangeInput) {
  const latestAnswers = input.answers.filter((answer) => answer.runId === input.latest.id);
  const previousAnswers = input.previous ? input.answers.filter((answer) => answer.runId === input.previous.id) : [];
  return {
    latestAnswers,
    previousAnswers,
    base: {
      latestRunId: input.latest.id,
      previousRunId: input.previous?.id || null,
      methodology: {
        latest: input.latest.methodologyVersion,
        previous: input.previous?.methodologyVersion || null,
      },
      answerMatrix: {
        latest: latestAnswers.length,
        previous: previousAnswers.length,
        missingExactModels: [...latestAnswers, ...previousAnswers].filter((answer) => !answer.model).length,
        missingQuestionTexts: [...latestAnswers, ...previousAnswers].filter((answer) => !normalizedText(answer.prompt)).length,
      },
      summary: { ...EMPTY_RUN_CHANGE_SUMMARY },
    },
  };
}

export function fictionalRunChangeGraph(latestRunId: string, previousRunId: string | null): RunChangeGraph {
  return {
    status: "fictional",
    comparable: false,
    latestRunId,
    previousRunId,
    methodology: { latest: null, previous: null },
    answerMatrix: { latest: 0, previous: 0, missingExactModels: 0, missingQuestionTexts: 0 },
    summary: { ...EMPTY_RUN_CHANGE_SUMMARY },
    events: [],
    note: "Run Change Graph is disabled in the fictional demo so demo values cannot be mistaken for customer evidence.",
  };
}

export function buildRunChangeGraph(input: RunChangeInput): RunChangeGraph {
  const { latestAnswers, previousAnswers, base } = baseGraph(input);
  if (!input.previous) {
    return {
      ...base,
      status: "baseline",
      comparable: false,
      events: [],
      note: "One reviewed collection establishes a baseline. Repeat the same buyer questions, provider, exact model, and methodology before interpreting movement.",
    };
  }

  const latestKeys = latestAnswers.map(keyFor).sort();
  const previousKeys = previousAnswers.map(keyFor).sort();
  const sameMethodology = Boolean(input.latest.methodologyVersion)
    && input.latest.methodologyVersion === input.previous.methodologyVersion;
  const sameMatrix = latestKeys.length > 0
    && latestKeys.length === previousKeys.length
    && latestKeys.every((key, index) => key === previousKeys[index]);

  let withheldReason: string | null = null;
  if (!sameMethodology) {
    withheldReason = `Methodology changed from ${input.previous.methodologyVersion || "not recorded"} to ${input.latest.methodologyVersion || "not recorded"}.`;
  } else if (base.answerMatrix.missingExactModels > 0) {
    withheldReason = `${base.answerMatrix.missingExactModels} reviewed answer${base.answerMatrix.missingExactModels === 1 ? " is" : "s are"} missing exact model provenance.`;
  } else if (base.answerMatrix.missingQuestionTexts > 0) {
    withheldReason = `${base.answerMatrix.missingQuestionTexts} reviewed answer${base.answerMatrix.missingQuestionTexts === 1 ? " is" : "s are"} missing the persisted buyer-question text.`;
  } else if (!sameMatrix) {
    withheldReason = "The reviewed buyer-question text/provider/exact-model matrix changed between collections.";
  }

  if (withheldReason) {
    return {
      ...base,
      status: "not_comparable",
      comparable: false,
      events: [{
        id: "methodology-withheld",
        kind: "methodology",
        direction: "withheld",
        title: "Cross-collection movement withheld",
        detail: `${withheldReason} The latest collection remains valid evidence on its own, but the difference is not labeled as product movement.`,
      }],
      note: "Methodology or provenance changes stay separate from product observations. Foremention does not turn an incomparable pair into a trend.",
    };
  }

  const latestByKey = new Map(latestAnswers.map((answer) => [keyFor(answer), answer]));
  const previousByKey = new Map(previousAnswers.map((answer) => [keyFor(answer), answer]));
  const brandGains: string[] = [];
  const brandLosses: string[] = [];
  let citationGains = 0;
  let citationLosses = 0;
  let contextChanges = 0;

  for (const [key, latestAnswer] of latestByKey) {
    const previousAnswer = previousByKey.get(key);
    if (!previousAnswer) continue;
    if (previousAnswer.brandPresent !== true && latestAnswer.brandPresent === true) brandGains.push(latestAnswer.prompt);
    if (previousAnswer.brandPresent === true && latestAnswer.brandPresent !== true) brandLosses.push(latestAnswer.prompt);
    if (normalizedText(previousAnswer.answerText) !== normalizedText(latestAnswer.answerText)) contextChanges += 1;

    const latestCitations = new Set(latestAnswer.citationUrls);
    const previousCitations = new Set(previousAnswer.citationUrls);
    citationGains += difference(latestCitations, previousCitations).length;
    citationLosses += difference(previousCitations, latestCitations).length;
  }

  const latestSources = new Set(latestAnswers.flatMap((answer) => answer.citationUrls));
  const previousSources = new Set(previousAnswers.flatMap((answer) => answer.citationUrls));
  const sourceGains = difference(latestSources, previousSources);
  const sourceLosses = difference(previousSources, latestSources);
  const latestCompetitors = competitorSet(input.competitors, input.latest.id);
  const previousCompetitors = competitorSet(input.competitors, input.previous.id);
  const competitorGains = difference(latestCompetitors, previousCompetitors);
  const competitorLosses = difference(previousCompetitors, latestCompetitors);

  const summary: RunChangeGraph["summary"] = {
    brandGains: brandGains.length,
    brandLosses: brandLosses.length,
    citationGains,
    citationLosses,
    sourceGains: sourceGains.length,
    sourceLosses: sourceLosses.length,
    competitorGains: competitorGains.length,
    competitorLosses: competitorLosses.length,
    contextChanges,
  };
  const events: RunChangeEvent[] = [];

  if (brandGains.length || brandLosses.length) events.push({
    id: "brand-mentions",
    kind: "brand_mention",
    direction: brandLosses.length ? "changed" : "new",
    title: `${brandGains.length} new brand mention${brandGains.length === 1 ? "" : "s"} · ${brandLosses.length} lost`,
    detail: [...brandGains.slice(0, 2).map((prompt) => `Appeared: ${prompt}`), ...brandLosses.slice(0, 2).map((prompt) => `Disappeared: ${prompt}`)].join(" · "),
  });
  if (citationGains || citationLosses) events.push({
    id: "citations",
    kind: "citation",
    direction: citationLosses ? "changed" : "new",
    title: `${citationGains} new citation observation${citationGains === 1 ? "" : "s"} · ${citationLosses} lost`,
    detail: "Citation movement compares canonical URL observations inside the same reviewed buyer-question/provider/exact-model answer slots.",
  });
  if (sourceGains.length || sourceLosses.length) events.push({
    id: "sources",
    kind: "source",
    direction: sourceLosses.length ? "changed" : "new",
    title: `${sourceGains.length} new unique source${sourceGains.length === 1 ? "" : "s"} · ${sourceLosses.length} lost`,
    detail: "Source movement counts unique canonical citation URLs after the answer matrix passes the comparability gate.",
  });
  if (competitorGains.length || competitorLosses.length) events.push({
    id: "competitors",
    kind: "competitor",
    direction: competitorLosses.length ? "changed" : "new",
    title: `${competitorGains.length} newly observed competitor${competitorGains.length === 1 ? "" : "s"} · ${competitorLosses.length} lost`,
    detail: [...competitorGains.slice(0, 3).map((name) => `New on reviewed cited pages: ${name}`), ...competitorLosses.slice(0, 3).map((name) => `No longer observed: ${name}`)].join(" · "),
  });
  if (contextChanges) events.push({
    id: "answer-context",
    kind: "context",
    direction: "changed",
    title: `${contextChanges} comparable AI answer${contextChanges === 1 ? "" : "s"} changed exact text`,
    detail: "This records exact answer-text change only. It does not claim meaning, factual accuracy, buyer behavior, or a customer action caused the difference.",
  });

  return {
    ...base,
    summary,
    status: "comparable",
    comparable: true,
    events,
    note: "Run movement is reported only across the same reviewed buyer-question text, provider, exact-model, and methodology matrix. Observed differences do not establish causation.",
  };
}
