import { canonicalizeEvidenceUrl } from "@/lib/collection-policy";
import type { WorkspaceRunAnswer } from "@/lib/data";
import type { IntelligenceRun } from "@/lib/intelligence-loop";

export type ComparableObservationEvent = {
  id: "brand-presence" | "citations" | "sources" | "answer-text";
  kind: "brand_presence" | "citation" | "source" | "answer";
  direction: "increased" | "decreased" | "changed";
  title: string;
  detail: string;
  href: string;
};

type ComparableObservationInput = {
  latest: IntelligenceRun;
  previous: IntelligenceRun | null;
  latestAnswers: WorkspaceRunAnswer[];
  previousAnswers: WorkspaceRunAnswer[];
};

const normalizedText = (value: string) => value.replace(/\s+/g, " ").trim();
const slotKey = (answer: WorkspaceRunAnswer) => `${normalizedText(answer.prompt)}\u0000${answer.provider}\u0000${answer.model || "model-not-recorded"}`;

function canonicalCitationSet(answer: WorkspaceRunAnswer) {
  const urls = answer.citations.flatMap((citation) => {
    try {
      const canonical = canonicalizeEvidenceUrl(citation.url);
      return canonical ? [canonical] : [];
    } catch {
      return [];
    }
  });
  return new Set(urls);
}

function difference(left: Set<string>, right: Set<string>) {
  return [...left].filter((value) => !right.has(value));
}

function verifiedBySlot(answers: WorkspaceRunAnswer[]) {
  return new Map(answers
    .filter((answer) => answer.status === "verified")
    .map((answer) => [slotKey(answer), answer]));
}

/**
 * Turns the already-selected safe exact comparable pair into customer-readable
 * events. This function never chooses which runs are comparable. That decision
 * remains owned by loadSafeWeeklyIntelligence, including exact persisted buyer-
 * question text, provider, exact model, methodology, tenant and review gates.
 */
export function buildComparableObservationEvents(input: ComparableObservationInput): ComparableObservationEvent[] {
  if (!input.previous) return [];

  const events: ComparableObservationEvent[] = [];
  const latestBySlot = verifiedBySlot(input.latestAnswers);
  const previousBySlot = verifiedBySlot(input.previousAnswers);
  const matchingKeys = [...latestBySlot.keys()].filter((key) => previousBySlot.has(key));

  const presenceDelta = input.latest.presence - input.previous.presence;
  if (presenceDelta !== 0) {
    events.push({
      id: "brand-presence",
      kind: "brand_presence",
      direction: presenceDelta > 0 ? "increased" : "decreased",
      title: `Brand presence ${presenceDelta > 0 ? "increased" : "decreased"} by ${Math.abs(presenceDelta)} percentage point${Math.abs(presenceDelta) === 1 ? "" : "s"}`,
      detail: `${input.previous.presence}% across ${input.previous.answers} verified answers → ${input.latest.presence}% across ${input.latest.answers} verified answers. This is observed movement, not a causal claim.`,
      href: `/app/runs/${input.latest.id}`,
    });
  }

  let citationGains = 0;
  let citationLosses = 0;
  let answerTextChanges = 0;
  for (const key of matchingKeys) {
    const latestAnswer = latestBySlot.get(key)!;
    const previousAnswer = previousBySlot.get(key)!;
    const latestCitations = canonicalCitationSet(latestAnswer);
    const previousCitations = canonicalCitationSet(previousAnswer);
    citationGains += difference(latestCitations, previousCitations).length;
    citationLosses += difference(previousCitations, latestCitations).length;
    if (normalizedText(latestAnswer.answer) !== normalizedText(previousAnswer.answer)) answerTextChanges += 1;
  }

  if (citationGains || citationLosses) {
    events.push({
      id: "citations",
      kind: "citation",
      direction: citationGains > citationLosses ? "increased" : citationLosses > citationGains ? "decreased" : "changed",
      title: `${citationGains} new citation observation${citationGains === 1 ? "" : "s"} · ${citationLosses} no longer returned`,
      detail: `Compared canonical citation URLs inside ${matchingKeys.length} verified question + provider + exact-model answer slot${matchingKeys.length === 1 ? "" : "s"}. A citation change does not prove publisher or ranking impact.`,
      href: "/app/source-map",
    });
  }

  const latestSources = new Set([...latestBySlot.values()].flatMap((answer) => [...canonicalCitationSet(answer)]));
  const previousSources = new Set([...previousBySlot.values()].flatMap((answer) => [...canonicalCitationSet(answer)]));
  const sourceGains = difference(latestSources, previousSources);
  const sourceLosses = difference(previousSources, latestSources);
  if (sourceGains.length || sourceLosses.length) {
    events.push({
      id: "sources",
      kind: "source",
      direction: sourceGains.length > sourceLosses.length ? "increased" : sourceLosses.length > sourceGains.length ? "decreased" : "changed",
      title: `${sourceGains.length} new unique source${sourceGains.length === 1 ? "" : "s"} · ${sourceLosses.length} no longer returned`,
      detail: "Unique sources are canonical cited URLs across the verified comparable answer set. This is separate from whether the page itself later changed.",
      href: "/app/source-map",
    });
  }

  if (answerTextChanges) {
    events.push({
      id: "answer-text",
      kind: "answer",
      direction: "changed",
      title: `${answerTextChanges} comparable AI answer${answerTextChanges === 1 ? "" : "s"} changed exact text`,
      detail: `Exact normalized answer text differed in ${answerTextChanges} of ${matchingKeys.length} matched answer slot${matchingKeys.length === 1 ? "" : "s"}. This does not claim meaning, accuracy, buyer behavior, or causation changed.`,
      href: `/app/runs/${input.latest.id}`,
    });
  }

  return events;
}
