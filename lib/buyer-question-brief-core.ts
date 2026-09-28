/**
 * Buyer-question evidence packet for one human-reviewed collection.
 *
 * Intentionally NOT a visibility score or an automated recommendation engine.
 * It combines verified, persisted answer observations with reviewed source-map
 * annotations from precisely the same run. No background crawling, enrichment,
 * cross-run inference, or paid provider calls are performed here.
 */
export type BuyerBriefRun = {
  id: string;
  status: string;
  created_at: string;
  methodology_version: string | null;
};

export type BuyerBriefAnswer = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
  review_status: string;
  answer_text: string;
  brand_present: boolean | null;
  citations_json: Array<{ url?: string | null; title?: string | null }> | null;
};

export type BuyerBriefCompetitor = {
  id: string;
  name: string;
  active: boolean;
};

export type BuyerBriefReviewedSource = {
  url: string;
  reviewedAt: string | null;
  clientPresent: boolean;
  competitors: string[];
};

export type QuestionSourceReview = {
  url: string;
  competitor: string;
  questionKey: string;
  observationCount: number;
  /** Explicit reviewer annotation on a returned citation, not a claim about AI reasoning. */
  reviewBasis: "human_reviewed_cited_page";
};

export type BuyerQuestionEvidence = {
  key: string;
  question: string;
  verifiedAnswerSlots: number;
  customerPresent: number;
  customerAbsent: number;
  presenceUndetermined: number;
  returnedCitationUrls: number;
  /** Literal, boundary-matched names observed in answer text; identity isn't verified. */
  competitorNameCandidates: Array<{ name: string; observedAnswerSlots: number }>;
  /** A same-run citation also explicitly reviewed as mentioning the competitor and excluding the customer. */
  reviewedCitationGaps: QuestionSourceReview[];
  attention: "reviewed_source_to_inspect" | "candidate_answer_gap" | "observation_only" | "undetermined";
};

export type BuyerQuestionBrief = {
  state: "available" | "withheld" | "empty" | "fictional";
  runId: string | null;
  runCreatedAt: string | null;
  methodologyVersion: string | null;
  reason: string;
  questions: BuyerQuestionEvidence[];
  /** Counts cover only persisted, verified answer slots in the selected run. */
  verifiedAnswerSlots: number;
  limitation: string;
};

const LIMITATION = "This is one human-reviewed collection, not market share, buyer demand, model intent, causal attribution, or a cross-run trend. Competitor names are literal candidates in verified answer text; only explicitly reviewed cited pages are described as page-level gaps. A returned URL alone does not verify a page's contents.";
const empty = (state: BuyerQuestionBrief["state"], reason: string, run: BuyerBriefRun | null): BuyerQuestionBrief => ({
  state, reason, runId: run?.id || null, runCreatedAt: run?.created_at || null,
  methodologyVersion: run?.methodology_version || null, questions: [], verifiedAnswerSlots: 0,
  limitation: LIMITATION,
});
const clean = (value: string) => value.replace(/\s+/gu, " ").trim();
const fold = (value: string) => clean(value).toLocaleLowerCase("en-US");
const escapeRegex = (value: string) => value.replace(/[^\p{L}\p{N}]/gu, "\\$&");

/** Only a text-matching candidate: punctuation/case/brand-name ambiguity remains. */
export function containsLiteralCompetitorName(answerText: string, competitorName: string) {
  const name = clean(competitorName);
  if (!name || name.length > 120 || /[\r\n]/u.test(competitorName)) return false;
  // Unicode letter/number boundaries prevent e.g. SAP from matching ASAP.
  const body = name.split(" ").map(escapeRegex).join("\\s+");
  return new RegExp("(?<![\\p{L}\\p{N}])" + body + "(?![\\p{L}\\p{N}])", "iu").test(answerText);
}

export function canonicalBriefCitation(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return null;
    if (!url.hostname || /^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[::1\]$)/i.test(url.hostname)) return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/u, "");
    return url.toString();
  } catch {
    return null;
  }
}

/** Refuses truncation and contradictory duplicate answer slots; never invents missing observations. */
export function buildBuyerQuestionBrief(input: {
  run: BuyerBriefRun | null;
  verifiedAnswers: BuyerBriefAnswer[];
  competitors: BuyerBriefCompetitor[];
  reviewedSources: BuyerBriefReviewedSource[];
  fictional?: boolean;
}): BuyerQuestionBrief {
  const { run, verifiedAnswers, competitors, reviewedSources } = input;
  if (input.fictional) return empty("fictional", "Demo observations are fictional and cannot substantiate a buyer-decision evidence packet.", null);
  if (!run) return empty("empty", "Complete and review your first collection to prepare a buyer-question evidence packet.", null);
  if (!new Set(["complete", "partial"]).has(run.status) || !run.methodology_version) {
    return empty("withheld", "A finalized, human-reviewed collection with recorded methodology is required.", run);
  }
  if (verifiedAnswers.length > 500 || competitors.length > 100 || reviewedSources.length > 500) {
    return empty("withheld", "The bounded evidence fetch was exceeded. Inspect the collection rather than publishing a partial packet.", run);
  }
  if (verifiedAnswers.some(a => a.run_id !== run.id || a.review_status !== "verified" ||
      !clean(a.prompt_key || "") || !clean(a.prompt_text || "") || !clean(a.provider || "") ||
      !clean(a.model || "") || typeof a.answer_text !== "string" ||
      ![true, false, null].includes(a.brand_present) ||
      (a.citations_json !== null && !Array.isArray(a.citations_json)))) {
    return empty("withheld", "Verified answer provenance is missing, unreviewed, or does not belong to this finalized run.", run);
  }
  if (!verifiedAnswers.length) {
    return empty("empty", "This finalized collection has no verified answer slots yet. Review its answers first.", run);
  }
  const seenSlots = new Set<string>();
  const promptKeys = new Map<string, string>();
  for (const answer of verifiedAnswers) {
    const slot = JSON.stringify([fold(answer.prompt_key), fold(answer.provider), fold(answer.model!)]);
    if (seenSlots.has(slot)) return empty("withheld", "A duplicate persisted question/provider/model slot requires review before aggregation.", run);
    seenSlots.add(slot);
    const old = promptKeys.get(answer.prompt_key);
    const question = clean(answer.prompt_text!);
    if (old && old !== question) return empty("withheld", "One buyer-question key has inconsistent recorded wording in the selected run.", run);
    promptKeys.set(answer.prompt_key, question);
  }
  const active = competitors.filter(c => c.active && clean(c.name).length >= 2 && clean(c.name).length <= 120);
  const byName = new Map<string, BuyerBriefCompetitor>();
  for (const c of active) {
    const id = fold(c.name);
    if (byName.has(id)) return empty("withheld", "Duplicate active competitor names need disambiguation before the packet can attribute them.", run);
    byName.set(id, c);
  }
  const sourcesByUrl = new Map<string, BuyerBriefReviewedSource>();
  for (const s of reviewedSources) {
    if (!s.reviewedAt) continue; // automated access checks are not human review
    const url = canonicalBriefCitation(s.url);
    if (!url) continue;
    if (sourcesByUrl.has(url)) {
      return empty("withheld", "Duplicated human-reviewed source URLs need reconciliation before any source gap is shown.", run);
    }
    sourcesByUrl.set(url, s);
  }
  const groups = new Map<string, BuyerBriefAnswer[]>();
  for (const answer of verifiedAnswers) groups.set(answer.prompt_key, [...(groups.get(answer.prompt_key) || []), answer]);
  const questions: BuyerQuestionEvidence[] = [...groups.entries()].map(([key, answers]) => {
    const observed = new Map<string, number>();
    const citations = new Set<string>();
    const reviewedGaps = new Map<string, QuestionSourceReview>();
    for (const answer of answers) {
      const names = [...byName.values()].filter(c => containsLiteralCompetitorName(answer.answer_text, c.name));
      for (const c of names) observed.set(c.name, (observed.get(c.name) || 0) + 1);
      const seenCitationInAnswer = new Set<string>();
      for (const citation of answer.citations_json || []) {
        const url = canonicalBriefCitation(citation?.url);
        if (!url || seenCitationInAnswer.has(url)) continue;
        seenCitationInAnswer.add(url);
        citations.add(url);
        // A source gap is not inferred if the customer is in this exact answer;
        // nor if the reviewed page belongs to another run, URL or competitor.
        if (answer.brand_present !== false) continue;
        const source = sourcesByUrl.get(url);
        if (!source || source.clientPresent !== false) continue;
        for (const competitor of names) {
          if (!source.competitors.some(name => fold(name) === fold(competitor.name))) continue;
          const id = JSON.stringify([url, competitor.name]);
          const existing = reviewedGaps.get(id);
          reviewedGaps.set(id, {
            url, competitor: competitor.name, questionKey: key,
            observationCount: (existing?.observationCount || 0) + 1,
            reviewBasis: "human_reviewed_cited_page",
          });
        }
      }
    }
    const absent = answers.filter(a => a.brand_present === false).length;
    const unknown = answers.filter(a => a.brand_present === null).length;
    const candidates = [...observed.entries()].map(([name, observedAnswerSlots]) => ({ name, observedAnswerSlots })).sort((a,b) => a.name.localeCompare(b.name));
    const review = [...reviewedGaps.values()].sort((a,b) => a.competitor.localeCompare(b.competitor) || a.url.localeCompare(b.url));
    const anyCandidateGap = answers.some(a => a.brand_present === false && [...byName.values()].some(c => containsLiteralCompetitorName(a.answer_text, c.name)));
    const attention: BuyerQuestionEvidence["attention"] = review.length ? "reviewed_source_to_inspect" : anyCandidateGap ? "candidate_answer_gap" :
      unknown === answers.length ? "undetermined" : "observation_only";
    return {
      key, question: promptKeys.get(key)!, verifiedAnswerSlots: answers.length,
      customerPresent: answers.filter(a => a.brand_present === true).length,
      customerAbsent: absent, presenceUndetermined: unknown,
      returnedCitationUrls: citations.size,
      competitorNameCandidates: candidates, reviewedCitationGaps: review, attention,
    };
  }).sort((a,b) => a.question.localeCompare(b.question) || a.key.localeCompare(b.key));
  return {
    state: "available", reason: "Observed answer and cited-page evidence from one finalized, reviewed collection.",
    runId: run.id, runCreatedAt: run.created_at, methodologyVersion: run.methodology_version,
    questions, verifiedAnswerSlots: verifiedAnswers.length, limitation: LIMITATION,
  };
}
