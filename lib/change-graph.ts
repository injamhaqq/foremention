import type { Viewer } from "@/lib/auth";
import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import { loadWorkspaceContext } from "@/lib/data";
import { supabaseRest } from "@/lib/supabase-rest";

export type ChangeGraphEventKind =
  | "methodology"
  | "brand_mention"
  | "citation"
  | "source"
  | "source_content"
  | "competitor"
  | "context";

export type ChangeGraphEvent = {
  id: string;
  kind: ChangeGraphEventKind;
  direction: "new" | "lost" | "changed" | "unreachable" | "withheld";
  title: string;
  detail: string;
  href: string;
};

export type ChangeGraph = {
  status: "baseline" | "comparable" | "not_comparable" | "fictional";
  comparable: boolean;
  latestRunId: string;
  previousRunId: string | null;
  methodology: { latest: string | null; previous: string | null };
  answerMatrix: { latest: number; previous: number; missingExactModels: number };
  summary: {
    brandGains: number;
    brandLosses: number;
    citationGains: number;
    citationLosses: number;
    sourceGains: number;
    sourceLosses: number;
    sourceContentChanges: number;
    competitorGains: number;
    competitorLosses: number;
    contextChanges: number;
  };
  events: ChangeGraphEvent[];
  note: string;
};

type RunFact = {
  id: string;
  methodologyVersion: string | null;
};

type AnswerFact = {
  runId: string;
  promptKey: string;
  prompt: string;
  provider: string;
  model: string | null;
  answer: string;
  brandPresent: boolean | null;
  citations: string[];
};

type SnapshotFact = {
  id: string;
  runId: string | null;
  sourceId: string;
  canonicalUrl: string;
  pageTitle: string | null;
  changeState: "initial" | "unchanged" | "changed" | "unreachable" | "unknown";
  changeReason: string | null;
};

type CompetitorFact = {
  runId: string;
  names: string[];
};

type ChangeGraphInput = {
  latest: RunFact;
  previous: RunFact | null;
  answers: AnswerFact[];
  snapshots?: SnapshotFact[];
  competitors?: CompetitorFact[];
};

type RunRow = {
  id: string;
  methodology_version: string | null;
  project_id: string | null;
};

type AnswerRow = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  answer_text: string;
  citations_json: Array<{ url?: string; title?: string }> | null;
  brand_present: boolean | null;
};

type SnapshotRow = {
  id: string;
  run_id: string | null;
  source_id: string;
  canonical_url: string;
  page_title: string | null;
  change_state: SnapshotFact["changeState"];
  change_reason: string | null;
};

type SourceMapRow = { id: string; run_id: string | null };
type SourceMapEntryRow = { source_map_id: string; competitors_present: string[] | null };

const emptySummary = (): ChangeGraph["summary"] => ({
  brandGains: 0,
  brandLosses: 0,
  citationGains: 0,
  citationLosses: 0,
  sourceGains: 0,
  sourceLosses: 0,
  sourceContentChanges: 0,
  competitorGains: 0,
  competitorLosses: 0,
  contextChanges: 0,
});

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

function answerKey(answer: AnswerFact) {
  return `${answer.promptKey}\u0000${answer.provider}\u0000${answer.model || "model-not-recorded"}`;
}

function canonicalCitation(value: string) {
  return canonicalizeEvidenceUrl(value) || null;
}

function setDifference(left: Set<string>, right: Set<string>) {
  return [...left].filter((value) => !right.has(value));
}

function host(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function uniqueCompetitors(rows: CompetitorFact[], runId: string) {
  return new Set(rows.filter((row) => row.runId === runId).flatMap((row) => row.names).map((name) => cleanText(name)).filter(Boolean));
}

function snapshotEvents(snapshots: SnapshotFact[], latestRunId: string) {
  const changed = snapshots.filter((snapshot) => snapshot.runId === latestRunId && ["changed", "unreachable"].includes(snapshot.changeState));
  const events: ChangeGraphEvent[] = changed.slice(0, 6).map((snapshot) => ({
    id: `source-content:${snapshot.id}`,
    kind: "source_content",
    direction: snapshot.changeState === "unreachable" ? "unreachable" : "changed",
    title: snapshot.changeState === "unreachable"
      ? `${snapshot.pageTitle || host(snapshot.canonicalUrl)} became unreachable to the bounded inspector`
      : `${snapshot.pageTitle || host(snapshot.canonicalUrl)} changed since its previous saved page observation`,
    detail: `${snapshot.changeReason || "The saved page fingerprint changed."} This page observation does not prove what caused the difference or that AI behavior changed because of it.`,
    href: "/app/source-map",
  }));
  if (changed.length > events.length) {
    events.push({
      id: "source-content:more",
      kind: "source_content",
      direction: "changed",
      title: `${changed.length - events.length} more cited page change${changed.length - events.length === 1 ? "" : "s"} were saved`,
      detail: "Open Sources to inspect the dated page observations and their citation links.",
      href: "/app/source-map",
    });
  }
  return { count: changed.length, events };
}

export function buildChangeGraph(input: ChangeGraphInput): ChangeGraph {
  const latestAnswers = input.answers.filter((answer) => answer.runId === input.latest.id);
  const previousAnswers = input.previous ? input.answers.filter((answer) => answer.runId === input.previous!.id) : [];
  const missingExactModels = [...latestAnswers, ...previousAnswers].filter((answer) => !answer.model).length;
  const pageChanges = snapshotEvents(input.snapshots || [], input.latest.id);
  const summary = emptySummary();
  summary.sourceContentChanges = pageChanges.count;

  const base = {
    latestRunId: input.latest.id,
    previousRunId: input.previous?.id || null,
    methodology: {
      latest: input.latest.methodologyVersion,
      previous: input.previous?.methodologyVersion || null,
    },
    answerMatrix: {
      latest: latestAnswers.length,
      previous: previousAnswers.length,
      missingExactModels,
    },
    summary,
  };

  if (!input.previous) {
    return {
      ...base,
      status: "baseline",
      comparable: false,
      events: pageChanges.events,
      note: "One reviewed collection establishes a baseline. A later collection must use the same buyer questions, provider, exact model, and methodology before Foremention reports movement.",
    };
  }

  const latestKeys = latestAnswers.map(answerKey).sort();
  const previousKeys = previousAnswers.map(answerKey).sort();
  const sameMethodology = Boolean(input.latest.methodologyVersion)
    && input.latest.methodologyVersion === input.previous.methodologyVersion;
  const sameMatrix = latestKeys.length > 0
    && latestKeys.length === previousKeys.length
    && latestKeys.every((key, index) => key === previousKeys[index]);

  let withheldReason: string | null = null;
  if (!sameMethodology) {
    withheldReason = `Methodology changed from ${input.previous.methodologyVersion || "not recorded"} to ${input.latest.methodologyVersion || "not recorded"}.`;
  } else if (missingExactModels > 0) {
    withheldReason = `${missingExactModels} reviewed answer${missingExactModels === 1 ? " is" : "s are"} missing exact model provenance.`;
  } else if (!sameMatrix) {
    withheldReason = "The reviewed question/provider/model matrix changed between these collections.";
  }

  if (withheldReason) {
    return {
      ...base,
      status: "not_comparable",
      comparable: false,
      events: [{
        id: "methodology:withheld",
        kind: "methodology",
        direction: "withheld",
        title: "Cross-collection movement withheld",
        detail: `${withheldReason} The latest collection remains valid evidence on its own, but Foremention will not label the difference as product movement.`,
        href: `/app/runs/${input.latest.id}`,
      }, ...pageChanges.events],
      note: "Methodology changes are kept separate from product observations. Dated page-snapshot changes can still appear because they compare the page to its own previous saved representation.",
    };
  }

  const latestByKey = new Map(latestAnswers.map((answer) => [answerKey(answer), answer]));
  const previousByKey = new Map(previousAnswers.map((answer) => [answerKey(answer), answer]));
  const gainedPrompts: string[] = [];
  const lostPrompts: string[] = [];
  let citationGains = 0;
  let citationLosses = 0;
  let contextChanges = 0;

  for (const [key, latestAnswer] of latestByKey) {
    const previousAnswer = previousByKey.get(key);
    if (!previousAnswer) continue;
    if (previousAnswer.brandPresent !== true && latestAnswer.brandPresent === true) gainedPrompts.push(latestAnswer.prompt);
    if (previousAnswer.brandPresent === true && latestAnswer.brandPresent !== true) lostPrompts.push(latestAnswer.prompt);
    if (cleanText(previousAnswer.answer) !== cleanText(latestAnswer.answer)) contextChanges += 1;

    const latestCitations = new Set(latestAnswer.citations.map(canonicalCitation).filter((url): url is string => Boolean(url)));
    const previousCitations = new Set(previousAnswer.citations.map(canonicalCitation).filter((url): url is string => Boolean(url)));
    citationGains += setDifference(latestCitations, previousCitations).length;
    citationLosses += setDifference(previousCitations, latestCitations).length;
  }

  const latestSources = new Set(latestAnswers.flatMap((answer) => answer.citations).map(canonicalCitation).filter((url): url is string => Boolean(url)));
  const previousSources = new Set(previousAnswers.flatMap((answer) => answer.citations).map(canonicalCitation).filter((url): url is string => Boolean(url)));
  const gainedSources = setDifference(latestSources, previousSources);
  const lostSources = setDifference(previousSources, latestSources);
  const latestCompetitors = uniqueCompetitors(input.competitors || [], input.latest.id);
  const previousCompetitors = uniqueCompetitors(input.competitors || [], input.previous.id);
  const gainedCompetitors = setDifference(latestCompetitors, previousCompetitors);
  const lostCompetitors = setDifference(previousCompetitors, latestCompetitors);

  summary.brandGains = gainedPrompts.length;
  summary.brandLosses = lostPrompts.length;
  summary.citationGains = citationGains;
  summary.citationLosses = citationLosses;
  summary.sourceGains = gainedSources.length;
  summary.sourceLosses = lostSources.length;
  summary.competitorGains = gainedCompetitors.length;
  summary.competitorLosses = lostCompetitors.length;
  summary.contextChanges = contextChanges;

  const events: ChangeGraphEvent[] = [];
  if (gainedPrompts.length || lostPrompts.length) {
    events.push({
      id: "brand-mentions",
      kind: "brand_mention",
      direction: lostPrompts.length ? "changed" : "new",
      title: `${gainedPrompts.length} new brand mention${gainedPrompts.length === 1 ? "" : "s"} · ${lostPrompts.length} lost`,
      detail: [...gainedPrompts.slice(0, 2).map((prompt) => `Appeared: ${prompt}`), ...lostPrompts.slice(0, 2).map((prompt) => `Disappeared: ${prompt}`)].join(" · "),
      href: `/app/runs/${input.latest.id}`,
    });
  }
  if (citationGains || citationLosses) {
    events.push({
      id: "citations",
      kind: "citation",
      direction: citationLosses ? "changed" : "new",
      title: `${citationGains} new citation observation${citationGains === 1 ? "" : "s"} · ${citationLosses} lost`,
      detail: "Citation movement compares URL observations inside the same buyer-question/provider/exact-model answer slots.",
      href: `/app/runs/${input.latest.id}`,
    });
  }
  events.push({
    id: "sources",
    kind: "source",
    direction: lostSources.length ? "changed" : gainedSources.length ? "new" : "changed",
    title: `${gainedSources.length} new source${gainedSources.length === 1 ? "" : "s"} · ${lostSources.length} lost`,
    detail: [...gainedSources.slice(0, 2).map((url) => `New: ${host(url)}`), ...lostSources.slice(0, 2).map((url) => `Lost: ${host(url)}`)].join(" · ") || "The unique reviewed citation-source set did not change.",
    href: "/app/source-map",
  });
  if (gainedCompetitors.length || lostCompetitors.length) {
    events.push({
      id: "competitors",
      kind: "competitor",
      direction: lostCompetitors.length ? "changed" : "new",
      title: `${gainedCompetitors.length} newly observed competitor${gainedCompetitors.length === 1 ? "" : "s"} · ${lostCompetitors.length} lost`,
      detail: [...gainedCompetitors.slice(0, 3).map((name) => `New on reviewed cited pages: ${name}`), ...lostCompetitors.slice(0, 3).map((name) => `No longer observed: ${name}`)].join(" · "),
      href: "/app/competitors",
    });
  }
  if (contextChanges) {
    events.push({
      id: "answer-context",
      kind: "context",
      direction: "changed",
      title: `${contextChanges} comparable AI answer${contextChanges === 1 ? "" : "s"} changed exact text`,
      detail: "This records answer/context change only. It does not claim that meaning, factual accuracy, buyer behavior, or a customer action caused the difference.",
      href: `/app/runs/${input.latest.id}`,
    });
  }
  events.push(...pageChanges.events);

  return {
    ...base,
    status: "comparable",
    comparable: true,
    events,
    note: "Movement is reported only across the same reviewed buyer-question, provider, exact-model, and methodology matrix. Page changes remain separate observations and never imply causation.",
  };
}

export async function loadChangeGraph(viewer: Viewer, latestRunId: string, previousRunId: string | null): Promise<ChangeGraph> {
  if (viewer.mode === "demo") {
    return {
      status: "fictional",
      comparable: false,
      latestRunId,
      previousRunId,
      methodology: { latest: null, previous: null },
      answerMatrix: { latest: 0, previous: 0, missingExactModels: 0 },
      summary: emptySummary(),
      events: [],
      note: "This is the fictional demo workspace. Change Graph comparisons are disabled here so demo values cannot be mistaken for customer evidence.",
    };
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context || !viewer.accessToken) {
    return {
      status: "baseline",
      comparable: false,
      latestRunId,
      previousRunId,
      methodology: { latest: null, previous: null },
      answerMatrix: { latest: 0, previous: 0, missingExactModels: 0 },
      summary: emptySummary(),
      events: [],
      note: "A workspace baseline is required before Change Graph can compare reviewed observations.",
    };
  }

  const requestedRunIds = [latestRunId, previousRunId].filter((value): value is string => Boolean(value));
  const runs = await supabaseRest<RunRow[]>(
    `runs?select=id,methodology_version,project_id&organization_id=eq.${context.organizationId}&id=in.(${requestedRunIds.join(",")})`,
    { token: viewer.accessToken },
  );
  const runById = new Map(runs.map((run) => [run.id, run]));
  const latestRow = runById.get(latestRunId);
  const previousRow = previousRunId ? runById.get(previousRunId) || null : null;
  if (!latestRow || latestRow.project_id !== context.projectId || (previousRow && previousRow.project_id !== context.projectId)) {
    return {
      status: "not_comparable",
      comparable: false,
      latestRunId,
      previousRunId,
      methodology: { latest: latestRow?.methodology_version || null, previous: previousRow?.methodology_version || null },
      answerMatrix: { latest: 0, previous: 0, missingExactModels: 0 },
      summary: emptySummary(),
      events: [{
        id: "methodology:workspace",
        kind: "methodology",
        direction: "withheld",
        title: "Cross-collection movement withheld",
        detail: "The requested collections are not both inside the active workspace project.",
        href: "/app/runs",
      }],
      note: "Change Graph never compares observations across workspace projects.",
    };
  }

  const answers = await supabaseRest<AnswerRow[]>(
    `run_answers?select=run_id,prompt_key,prompt_text,provider,model,answer_text,citations_json,brand_present&organization_id=eq.${context.organizationId}&run_id=in.(${requestedRunIds.join(",")})&review_status=eq.verified`,
    { token: viewer.accessToken },
  );
  const snapshots = await supabaseRest<SnapshotRow[]>(
    `source_snapshots?select=id,run_id,source_id,canonical_url,page_title,change_state,change_reason&organization_id=eq.${context.organizationId}&run_id=eq.${latestRunId}&order=retrieved_at.desc&limit=100`,
    { token: viewer.accessToken },
  );
  const maps = await supabaseRest<SourceMapRow[]>(
    `source_maps?select=id,run_id&organization_id=eq.${context.organizationId}&run_id=in.(${requestedRunIds.join(",")})&status=eq.published`,
    { token: viewer.accessToken },
  );
  const mapIds = maps.map((map) => map.id);
  const entries = mapIds.length
    ? await supabaseRest<SourceMapEntryRow[]>(
      `source_map_entries?select=source_map_id,competitors_present&organization_id=eq.${context.organizationId}&source_map_id=in.(${mapIds.join(",")})`,
      { token: viewer.accessToken },
    )
    : [];
  const runByMapId = new Map(maps.map((map) => [map.id, map.run_id]));
  const competitorFacts = entries.flatMap((entry) => {
    const runId = runByMapId.get(entry.source_map_id);
    return runId ? [{ runId, names: entry.competitors_present || [] }] : [];
  });

  return buildChangeGraph({
    latest: { id: latestRow.id, methodologyVersion: latestRow.methodology_version },
    previous: previousRow ? { id: previousRow.id, methodologyVersion: previousRow.methodology_version } : null,
    answers: answers.map((answer) => ({
      runId: answer.run_id,
      promptKey: answer.prompt_key,
      prompt: answer.prompt_text || answer.prompt_key,
      provider: answer.provider,
      model: answer.model,
      answer: answer.answer_text,
      brandPresent: answer.brand_present,
      citations: (answer.citations_json || []).flatMap((citation) => citation.url ? [citation.url] : []),
    })),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      runId: snapshot.run_id,
      sourceId: snapshot.source_id,
      canonicalUrl: snapshot.canonical_url,
      pageTitle: snapshot.page_title,
      changeState: snapshot.change_state,
      changeReason: snapshot.change_reason,
    })),
    competitors: competitorFacts,
  });
}
