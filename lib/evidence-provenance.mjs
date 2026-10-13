/**
 * Chat01 observation / provenance / metric contract (CV-02, CV-11, A08, A09).
 *
 * Pure and dependency-free so record, export, example, job and acceptance
 * owners can consume it without importing provider adapters.
 *
 * Four reference origins are kept apart and never upgraded into each other:
 *   native_citation        structured citation returned by the provider's own
 *                          search/grounding tool in an API response
 *   answer_url             a URL the model wrote in its answer text; never a
 *                          citation and never evidence by itself
 *   independent_retrieval  a search result Foremention retrieved itself
 *                          (Brave Search API / Bing RSS) and gave to a hosted
 *                          model; NOT a provider citation
 *   unknown                origin could not be established; shown as unknown
 * Human review is an overlay on a reference, not an origin: a reviewed
 * independent result is still independent retrieval.
 *
 * None of these is a consumer-app (ChatGPT/Gemini/Perplexity UI) observation.
 */
import { isAbstentionAnswer } from "./official-source-relevance.mjs";

export const REFERENCE_ORIGINS = Object.freeze(["native_citation", "answer_url", "independent_retrieval", "unknown"]);

export const REFERENCE_ORIGIN_LABELS = Object.freeze({
  native_citation: "Citation returned by the provider's API search tool",
  answer_url: "URL written in the answer text (not a citation)",
  independent_retrieval: "Search result retrieved by Foremention and given to the model (not a provider citation)",
  unknown: "Source origin not recorded",
});

export const HUMAN_REVIEW_LABELS = Object.freeze({
  verified: "Reviewed by a person",
  rejected: "Rejected by a person",
  unreviewed: "Not yet reviewed by a person",
});

/** Providers whose adapters only emit citations from structured API search output. */
const NATIVE_CITATION_PROVIDERS = new Set(["openai", "anthropic", "gemini", "groq", "openrouter", "zenmux", "omnirouters"]);

/**
 * Origin of the entries in an answer's `citations` array.
 * @param {{ provider?: string, raw?: Record<string, unknown> | null }} answer
 */
export function citationOriginForAnswer(answer) {
  const provider = typeof answer?.provider === "string" ? answer.provider : "";
  const raw = answer?.raw && typeof answer.raw === "object" ? answer.raw : {};
  if (raw.referenceProvenance && REFERENCE_ORIGINS.includes(raw.referenceProvenance)) return raw.referenceProvenance;
  if (provider === "cloudflare" || typeof raw.retrievalProvider === "string") return "independent_retrieval";
  if (NATIVE_CITATION_PROVIDERS.has(provider)) return "native_citation";
  return "unknown";
}

/**
 * Typed reference list for record/export/example surfaces.
 * @param {{ provider?: string, raw?: object, citations?: Array<{url:string,title?:string}>, mentionedUrls?: Array<{url:string}> }} answer
 * @param {"verified"|"rejected"|"unreviewed"} [reviewStatus]
 */
export function typedReferences(answer, reviewStatus = "unreviewed") {
  const origin = citationOriginForAnswer(answer);
  const review = HUMAN_REVIEW_LABELS[reviewStatus] ? reviewStatus : "unreviewed";
  const out = [];
  for (const item of Array.isArray(answer?.citations) ? answer.citations : []) {
    if (item && typeof item.url === "string") out.push(describe(item.url, item.title, origin, review));
  }
  for (const item of Array.isArray(answer?.mentionedUrls) ? answer.mentionedUrls : []) {
    if (item && typeof item.url === "string") out.push(describe(item.url, undefined, "answer_url", review));
  }
  return out;
}

function describe(url, title, origin, review) {
  return {
    url,
    ...(title ? { title } : {}),
    origin,
    originLabel: REFERENCE_ORIGIN_LABELS[origin],
    countsAsProviderCitation: origin === "native_citation",
    humanReview: review,
    humanReviewLabel: HUMAN_REVIEW_LABELS[review],
  };
}

/** CSV/export column values. Stable machine values + human label. */
export function referenceExportColumns(reference) {
  return {
    reference_origin: reference.origin,
    reference_origin_label: reference.originLabel,
    human_review: reference.humanReview,
  };
}

/**
 * Observation outcome for metric denominators.
 *   observed            an answer exists and addresses the question
 *   abstained           the model said it could not answer/verify: NOT a negative finding
 *   evidence_unavailable retrieval rights/relevance/scope gate withheld evidence (403/422)
 *   failed              provider/transport failure, refused, cancelled, timeout
 * Only `observed` enters a visibility denominator.
 * @param {{ status?: string, httpStatus?: number, answer?: string|null }} attempt
 */
export function observationOutcome(attempt) {
  const status = typeof attempt?.status === "string" ? attempt.status : "";
  if (attempt?.httpStatus === 422 || attempt?.httpStatus === 403 || attempt?.httpStatus === 410) return "evidence_unavailable";
  if (status && status !== "complete") return "failed";
  if (typeof attempt?.answer !== "string" || !attempt.answer.trim()) return "failed";
  if (isAbstentionAnswer(attempt.answer)) return "abstained";
  return "observed";
}

/**
 * Brand-visibility share with explicit denominator semantics.
 * value is null (withheld) when nothing was observed, or when requireComplete
 * and any attempt was not observed. Missing/refused/partial never becomes 0%.
 * @param {Array<{ status?: string, httpStatus?: number, answer?: string|null, brandPresent?: boolean }>} attempts
 */
export function summarizeVisibility(attempts, { requireComplete = false } = {}) {
  const counts = { attempted: 0, observed: 0, classified: 0, unclassified: 0, present: 0, abstained: 0, evidence_unavailable: 0, failed: 0 };
  for (const attempt of Array.isArray(attempts) ? attempts : []) {
    counts.attempted++;
    const outcome = observationOutcome(attempt);
    counts[outcome]++;
    // An answer can exist without a trustworthy brand-presence classification.
    // Unknown/null/omitted must never be silently counted as a negative.
    if (outcome === "observed") {
      if (typeof attempt.brandPresent !== "boolean") counts.unclassified++;
      else {
        counts.classified++;
        if (attempt.brandPresent) counts.present++;
      }
    }
  }
  const incomplete = counts.attempted - counts.classified;
  const withheldReason = counts.observed === 0
    ? "NO_OBSERVED_ANSWERS"
    : counts.classified === 0 ? "NO_CLASSIFIED_OBSERVATIONS"
      : requireComplete && incomplete > 0 ? "INCOMPLETE_OBSERVATION_SET" : null;
  return {
    ...counts,
    denominator: counts.classified,
    value: withheldReason ? null : Math.round((counts.present / counts.classified) * 10_000) / 100,
    withheldReason,
    unit: "percent of classified observed answers that mention the brand",
    exclusions: "abstained, evidence_unavailable, failed and unclassified answers are excluded from the denominator and reported separately",
  };
}

/**
 * ObservationEnvelope (FM-00 interface #1, provided by Chat01).
 * Built from a ProviderAnswer (or a failed attempt) plus caller context.
 * Every field the source did not supply is null AND listed in `unavailable`;
 * nothing is defaulted to zero or inferred.
 *
 * @param {{ provider?: string, model?: string, answer?: string, citations?: any[], mentionedUrls?: any[], raw?: object, collectedAt?: string, requestId?: string, usage?: object, billedCostUsd?: number, finishReason?: string } | null} answer
 * @param {{ organizationId?: string, projectId?: string, questionId?: string, questionVersion?: string|number, questionText?: string, locale?: string, attempt?: { status?: string, httpStatus?: number, errorCode?: string }, reviewStatus?: "verified"|"rejected"|"unreviewed", budgetAdmission?: object|null }} context
 */
export function buildObservationEnvelope(answer, context = {}) {
  const raw = answer?.raw && typeof answer.raw === "object" ? answer.raw : {};
  const attempt = context.attempt || (answer ? { status: "complete" } : { status: "failed" });
  const pick = (value) => (value === undefined || value === "" ? null : value);
  const envelope = {
    contractVersion: "fm01.observation.v1",
    organizationId: pick(context.organizationId),
    projectId: pick(context.projectId),
    questionId: pick(context.questionId),
    questionVersion: pick(context.questionVersion),
    questionText: pick(context.questionText),
    locale: pick(context.locale),
    // Without a recorded method, do not infer native grounding from a
    // provider name, grounded boolean or citation count. Unknown stays null.
    method: pick(raw.observationMethod),
    consumerProductObservation: false,
    provider: pick(answer?.provider),
    model: pick(answer?.model),
    observedAt: pick(answer?.collectedAt),
    providerRequestId: pick(answer?.requestId),
    finishReason: pick(answer?.finishReason),
    rawAnswer: typeof answer?.answer === "string" ? answer.answer : null,
    references: answer ? typedReferences(answer, context.reviewStatus || "unreviewed") : [],
    retrieval: raw.retrievalProvider ? {
      provider: raw.retrievalProvider,
      query: pick(raw.retrievalQuery),
      candidateCount: typeof raw.retrievedCandidateCount === "number" ? raw.retrievedCandidateCount : null,
      relevanceRejectedCount: typeof raw.relevanceRejectedCount === "number" ? raw.relevanceRejectedCount : null,
    } : null,
    outcome: observationOutcome({ ...attempt, answer: answer?.answer ?? null }),
    attemptStatus: pick(attempt.status),
    httpStatus: typeof attempt.httpStatus === "number" ? attempt.httpStatus : null,
    usage: answer?.usage && typeof answer.usage === "object" ? answer.usage : null,
    billedCostUsd: typeof answer?.billedCostUsd === "number" ? answer.billedCostUsd : null,
    budgetAdmission: context.budgetAdmission ?? null,
    humanReview: HUMAN_REVIEW_LABELS[context.reviewStatus] ? context.reviewStatus : "unreviewed",
  };
  envelope.unavailable = Object.entries(envelope)
    .filter(([key, value]) => value === null && key !== "retrieval")
    .map(([key]) => key);
  return envelope;
}
