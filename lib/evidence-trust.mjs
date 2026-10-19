/**
 * Evidence trust contract (fix track "evidence", 2026-10-19).
 *
 * Pure and dependency-free (apart from the shared abstention policy) so the
 * Cloudflare grounded adapter, the collector, the review API, the UI and the
 * offline evaluation suite all apply exactly the same rules.
 *
 *  1. Labelling. A search result Foremention retrieved itself (Brave Search API,
 *     or Bing RSS where explicitly authorised) and handed to a hosted model is
 *     Foremention's own retrieval. It is never the model's citation, even when
 *     the model selected it as supporting its answer.
 *  2. Snapshots. The exact (sanitised) title/snippet text each retrieved source
 *     contributed is saved with the observation, so every later support check
 *     and every human reviewer reads the same evidence the model read.
 *  3. Support check. Each claim sentence in an answer is checked against the
 *     saved snippets of the sources it relies on. This is a conservative
 *     LEXICAL check (shared content terms and exact numbers), not semantic
 *     verification and never proof of truth: "supported" means "the saved
 *     snippets contain the claim's key terms", nothing more. Unsupported
 *     claims are marked so a reviewer sees them.
 *  4. Abstention. An answer that refuses or says it cannot verify is
 *     `verificationBlocked` and can never be marked verified.
 *  5. Prompt-injection hardening. Retrieved page text is data. Instruction-like
 *     text and prompt-structure spoofing are removed before the model sees it,
 *     and every removal is flagged on the snapshot.
 */
import { isAbstentionAnswer, isVerificationBlockedAnswer } from "./official-source-relevance.mjs";
import { citationOriginForAnswer } from "./evidence-provenance.mjs";

export const EVIDENCE_TRUST_VERSION = "evidence-trust.2026-10-19.1";

/**
 * Retrieval method identity stamped into run_answers.measurement_context_json
 * (retrievalVersion). The database trigger in
 * supabase/migrations/20261019173100_evidence_trust_retrieval_version_guard.sql
 * derives the same value from raw_json.retrievalProvider; keep them identical.
 *
 * Answers collected before this change carry "returned-references.2026-08-30.1"
 * whether they used Bing RSS or Brave Search, so a new Brave answer is never
 * silently compared with an old Bing (or un-sanitised Brave) answer: the
 * comparability gate requires an identical retrievalVersion.
 */
export const LEGACY_RETRIEVAL_VERSION = "returned-references.2026-08-30.1";
export const RETRIEVAL_VERSIONS = Object.freeze({
  "brave-search": "independent-retrieval.brave-search.2026-10-19.1",
  "bing-rss": "independent-retrieval.bing-rss.2026-10-19.1",
});

/** @param {unknown} retrievalProvider */
export function retrievalVersionFor(retrievalProvider) {
  return typeof retrievalProvider === "string" && Object.hasOwn(RETRIEVAL_VERSIONS, retrievalProvider)
    ? RETRIEVAL_VERSIONS[retrievalProvider]
    : LEGACY_RETRIEVAL_VERSION;
}

export const RETRIEVAL_PROVIDER_LABELS = Object.freeze({
  "brave-search": "Brave Search API",
  "bing-rss": "Bing Search RSS",
});

/** Human label for the reference list of an answer. */
export function retrievalLabel(retrievalProvider) {
  const name = RETRIEVAL_PROVIDER_LABELS[retrievalProvider] || "web search";
  return `Search results Foremention retrieved (${name}) and gave to the model. These are not citations returned by the AI model.`;
}

// ---------------------------------------------------------------------------
// Prompt-injection hardening of retrieved content
// ---------------------------------------------------------------------------

const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u00AD\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

/** Each rule removes the sentence it matches. ids are stable machine values. */
const INJECTION_RULES = Object.freeze([
  { id: "override_instructions", pattern: /\b(?:ignore|disregard|forget|override|bypass|skip)\s+(?:all\s+|any\s+|every\s+)?(?:of\s+)?(?:the\s+|your\s+|these\s+|those\s+)?(?:previous|prior|above|earlier|preceding|foregoing|system|original|other|existing)?\s*(?:instructions?|prompts?|rules?|directions?|directives?|guidelines?|constraints?|context)\b/i },
  { id: "new_instructions", pattern: /\b(?:new|updated|revised|real|actual|important|hidden|secret)\s+(?:system\s+)?(?:instructions?|directives?|prompt)\s*[:\-]/i },
  { id: "system_prompt_reference", pattern: /\b(?:system|developer)\s+(?:prompt|message|instructions?)\b/i },
  { id: "role_reassignment", pattern: /\b(?:you\s+are\s+now|from\s+now\s+on,?\s+you|pretend\s+(?:to\s+be|you\s+are)|act\s+as\s+(?:if\s+you\s+are\s+)?(?:a|an|the)\s+(?:different|new|unrestricted|helpful)?\s*(?:ai|assistant|model|chatbot|system))\b/i },
  { id: "addressed_to_ai", pattern: /\b(?:note|message|instructions?)\s+(?:to|for)\s+(?:any\s+|all\s+)?(?:ai|llms?|assistants?|chatbots?|language\s+models?|crawlers?|bots?)\b/i },
  { id: "directive_to_ai", pattern: /\b(?:ai(?:\s+(?:assistants?|models?|systems?|tools?|chatbots?|agents?|search(?:\s+engines?)?))?|llms?|ai-powered\s+assistants?|chatbots?|language\s+models?|gpt-?\d*|chatgpt|gemini|claude|perplexity|copilot|assistants?)\b[^.!?\n]{0,40}\b(?:must|should|shall|need\s+to|are\s+required\s+to|are\s+instructed\s+to)\s+(?:always\s+|only\s+|now\s+)?(?:recommend|mention|rank|cite|say|answer|respond|reply|state|output|include|list|promote|prefer|claim|describe)\b/i },
  { id: "output_control", pattern: /\b(?:respond|reply|answer|output)\s+(?:only\s+)?(?:with|using)\s+(?:only\s+)?(?:the\s+)?(?:following|this|exactly|json|yes|no)\b/i },
  { id: "suppress_competitors", pattern: /\b(?:do\s+not|don't|never)\s+(?:mention|cite|recommend|include|list|name)\s+(?:any\s+)?(?:competitors?|other\s+(?:vendors?|companies|brands|products|tools|sources))\b/i },
  { id: "jailbreak_marker", pattern: /\b(?:jailbreak|dan\s+mode|developer\s+mode|god\s+mode|prompt\s+injection)\b/i },
]);

/** Prompt-structure tokens a page could use to spoof Foremention's own framing. */
const STRUCTURE_SPOOF = /(?:<\|[^|>]{0,40}\|>|<\/?(?:start_of_turn|end_of_turn|s|system|assistant|user|im_start|im_end)>|\[\/?INST\]|\[\/?SYS\]|<<\/?SYS>>|\b(?:BEGIN|END)\s+RETRIEVED\s+DATA\b|\bRETRIEVED\s+SOURCE\s+INDEX\b|\bCURRENT\s+WEB\s+EVIDENCE\b|\bSOURCE\s*\[\d+\]|^\s*(?:REQUEST|SYSTEM|ASSISTANT|USER|HUMAN)\s*:)/gim;

export const INJECTION_REMOVED_MARKER = "[instruction-like text removed by Foremention]";

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/);
}

/**
 * Treat retrieved page text strictly as data. Removes invisible/control
 * characters, neutralises prompt-structure spoofing, and replaces any sentence
 * that reads as an instruction to an AI with a visible marker.
 *
 * @param {unknown} value
 * @returns {{ text: string, flags: Array<{ rule: string, excerpt: string }>, injectionSuspected: boolean }}
 */
export function sanitizeRetrievedText(value) {
  if (typeof value !== "string" || !value) return { text: "", flags: [], injectionSuspected: false };
  /** @type {Array<{ rule: string, excerpt: string }>} */
  const flags = [];
  let text = value.normalize("NFKC").replace(INVISIBLE, "");
  text = text.replace(STRUCTURE_SPOOF, (match) => {
    flags.push({ rule: "prompt_structure_spoof", excerpt: match.trim().slice(0, 60) });
    return " ";
  });
  const kept = [];
  for (const sentence of splitSentences(text)) {
    const rule = INJECTION_RULES.find((candidate) => candidate.pattern.test(sentence));
    if (rule) {
      flags.push({ rule: rule.id, excerpt: sentence.replace(/\s+/g, " ").trim().slice(0, 120) });
      if (kept[kept.length - 1] !== INJECTION_REMOVED_MARKER) kept.push(INJECTION_REMOVED_MARKER);
    } else if (sentence.trim()) {
      kept.push(sentence.trim());
    }
  }
  return { text: kept.join(" ").replace(/\s+/g, " ").trim(), flags, injectionSuspected: flags.length > 0 };
}

// ---------------------------------------------------------------------------
// Retrieved-source snapshot (persisted with each observation)
// ---------------------------------------------------------------------------

const SNAPSHOT_SNIPPET_CHARS = 1_200;
const SNAPSHOT_TITLE_CHARS = 240;

/**
 * @param {Array<{ url: string, title?: string, snippet?: string }>} results  ranked, already scope/relevance filtered
 * @param {"brave-search"|"bing-rss"} retrievalProvider
 * @param {{ retrievedAt?: string }} [options]
 */
export function buildRetrievedSourceSnapshot(results, retrievalProvider, options = {}) {
  const retrievedAt = options.retrievedAt || new Date().toISOString();
  return (Array.isArray(results) ? results : []).filter((item) => item && typeof item.url === "string").map((item, index) => {
    const title = sanitizeRetrievedText(item.title || "");
    const snippet = sanitizeRetrievedText(item.snippet || "");
    const flags = [...title.flags, ...snippet.flags];
    return {
      ordinal: index + 1,
      url: item.url,
      title: title.text.slice(0, SNAPSHOT_TITLE_CHARS) || null,
      snippet: snippet.text.slice(0, SNAPSHOT_SNIPPET_CHARS),
      origin: "independent_retrieval",
      retrievedBy: "foremention",
      retrievalProvider,
      retrievedAt,
      countsAsModelCitation: false,
      injectionSuspected: flags.length > 0,
      injectionFlags: flags.map((flag) => flag.rule),
    };
  });
}

/**
 * Label each citation an answer carries with its true origin. For hosted-model
 * answers grounded on Foremention's retrieval, a "citation" is the model's
 * selection from Foremention's own search results, never a model citation.
 *
 * @template {{ url: string, title?: string }} T
 * @param {T[]} citations
 * @param {"brave-search"|"bing-rss"} retrievalProvider
 * @returns {Array<T & { origin: "independent_retrieval", retrievedBy: "foremention", retrievalProvider: "brave-search"|"bing-rss", countsAsModelCitation: false }>}
 */
export function labelIndependentRetrievalCitations(citations, retrievalProvider) {
  return (Array.isArray(citations) ? citations : []).map((citation) => ({
    ...citation,
    origin: /** @type {const} */ ("independent_retrieval"),
    retrievedBy: /** @type {const} */ ("foremention"),
    retrievalProvider,
    countsAsModelCitation: /** @type {const} */ (false),
  }));
}

export const SOURCE_TYPE_INDEPENDENT_RETRIEVAL = "foremention-retrieved search result";
export const SOURCE_TYPE_PROVIDER_CITATION = "provider-returned citation";

/**
 * sources.source_type for the references of one answer. A Foremention-
 * retrieved result is never stored as a provider-returned citation.
 * @param {{ provider?: string, raw?: unknown, citations?: Array<{ origin?: string }> }} answer
 */
export function sourceTypeForAnswer(answer) {
  const labelled = Array.isArray(answer?.citations) && answer.citations.some((item) => isIndependentRetrievalReference(item));
  const origin = labelled ? "independent_retrieval" : citationOriginForAnswer(/** @type {any} */ (answer));
  if (origin === "independent_retrieval") return SOURCE_TYPE_INDEPENDENT_RETRIEVAL;
  if (origin === "native_citation") return SOURCE_TYPE_PROVIDER_CITATION;
  return "reference (origin not recorded)";
}

/** True when a citation/reference row is Foremention's own retrieval. */
export function isIndependentRetrievalReference(reference) {
  return Boolean(reference && typeof reference === "object"
    && (reference.origin === "independent_retrieval" || reference.retrievedBy === "foremention"));
}

/**
 * Display label for an answer's reference list. `origin` comes from
 * raw_json.referenceProvenance / citation labels; never inferred upward.
 */
export function referenceListHeading({ origin, retrievalProvider } = {}) {
  if (origin === "independent_retrieval") {
    return {
      heading: `Sources Foremention retrieved${RETRIEVAL_PROVIDER_LABELS[retrievalProvider] ? ` via ${RETRIEVAL_PROVIDER_LABELS[retrievalProvider]}` : ""}`,
      boundary: "Foremention ran this web search itself and gave the results to the model. The model chose which ones to rely on; these are not the model's own citations and not what a consumer AI app would show.",
    };
  }
  if (origin === "native_citation") {
    return { heading: "Citations returned by the AI provider", boundary: "Structured citations returned by the provider's own search tool in its API response." };
  }
  return { heading: "Recorded references", boundary: "How these references were produced was not recorded for this answer." };
}

// ---------------------------------------------------------------------------
// Claim support check against saved snippets
// ---------------------------------------------------------------------------

const STOP = new Set(("a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours "
  + "according based best currently evidence including known leading many may might offer offers option options popular provide provides retrieved several source sources supplied support supports such teams tool tools various well widely").split(/\s+/));

function contentTerms(text) {
  const tokens = String(text || "").normalize("NFKC").toLowerCase().replace(/[\u2018\u2019]/g, "'").match(/[a-z0-9][a-z0-9'+.-]*[a-z0-9]|[a-z0-9]/g) || [];
  const out = new Set();
  for (const raw of tokens) {
    const token = raw.replace(/'s$/, "").replace(/[.'-]+$/, "");
    if (token.length < 3 && !/^\d+$/.test(token)) continue;
    if (STOP.has(token)) continue;
    out.add(token.length > 4 && token.endsWith("s") && !token.endsWith("ss") ? token.slice(0, -1) : token);
  }
  return out;
}

function numbersIn(text) {
  return new Set((String(text || "").match(/\d+(?:[.,]\d+)*/g) || []).map((value) => value.replace(/,/g, "")));
}

function claimSentences(answer) {
  return String(answer || "")
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/))
    .map((sentence) => sentence.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter(Boolean);
}

const MIN_CLAIM_TERMS = 3;
export const CLAIM_SUPPORT_THRESHOLD = 0.6;

/**
 * Check an answer's claims against the snippets saved for the sources it
 * selected. Inline markers like "[2]" narrow a claim to those sources.
 *
 * @param {{ answer: string, citations?: Array<{ url: string }>, snapshot?: ReturnType<typeof buildRetrievedSourceSnapshot> | null }} input
 */
export function assessAnswerSupport({ answer, citations = [], snapshot = null }) {
  const verificationBlocked = isVerificationBlockedAnswer(answer);
  const base = {
    version: EVIDENCE_TRUST_VERSION,
    method: "lexical-overlap-against-saved-retrieved-snippets",
    note: "A lexical check against the saved search snippets, not semantic verification. Supported means the snippets contain the claim's key terms and numbers; it does not prove the claim is true.",
    verificationBlocked,
    abstained: isAbstentionAnswer(answer),
  };
  const saved = Array.isArray(snapshot) ? snapshot : null;
  const cited = (Array.isArray(citations) ? citations : []).filter((item) => item && typeof item.url === "string");
  if (!saved || !saved.length) {
    return { ...base, status: verificationBlocked ? "verification_blocked" : "no_saved_snippets", claimCount: 0, supportedCount: 0, unsupportedCount: 0, claims: [], citationsNotInSnapshot: [] };
  }
  const byUrl = new Map(saved.map((entry) => [entry.url, entry]));
  const citationsNotInSnapshot = cited.filter((item) => !byUrl.has(item.url)).map((item) => item.url);
  const citedEntries = cited.map((item) => byUrl.get(item.url)).filter(Boolean);

  const claims = [];
  for (const sentence of claimSentences(answer)) {
    const markers = Array.from(sentence.matchAll(/\[(\d{1,2})\]/g), (match) => Number(match[1]));
    const text = sentence.replace(/\[\d{1,2}\]/g, "").trim();
    const terms = contentTerms(text);
    if (terms.size < MIN_CLAIM_TERMS) continue;
    if (isVerificationBlockedAnswer(text)) {
      claims.push({ text: text.slice(0, 300), sourceOrdinals: [], supported: false, reason: "UNCERTAINTY_STATEMENT", coverage: 0 });
      continue;
    }
    const markerEntries = markers.length ? markers.map((ordinal) => citedEntries[ordinal - 1] || saved.find((entry) => entry.ordinal === ordinal)).filter(Boolean) : [];
    const sources = markers.length ? markerEntries : citedEntries;
    if (!sources.length) {
      claims.push({ text: text.slice(0, 300), sourceOrdinals: [], supported: false, reason: markers.length ? "MARKER_NOT_IN_SAVED_SOURCES" : "NO_CITED_SAVED_SOURCE", coverage: 0 });
      continue;
    }
    const sourceText = sources.map((entry) => {
      const meta = entry.pageMetadata && typeof entry.pageMetadata === "object" ? entry.pageMetadata : {};
      return `${entry.title || ""} ${entry.snippet || ""} ${entry.url} ${meta.title || ""} ${meta.published || ""} ${meta.description || ""}`;
    }).join(" ");
    const sourceTerms = contentTerms(sourceText);
    const sourceNumbers = numbersIn(sourceText);
    let matched = 0;
    for (const term of terms) if (sourceTerms.has(term)) matched += 1;
    const coverage = Math.round((matched / terms.size) * 100) / 100;
    const missingNumbers = [...numbersIn(text)].filter((number) => !sourceNumbers.has(number));
    const reason = missingNumbers.length ? "NUMBER_NOT_IN_SAVED_SNIPPETS" : coverage < CLAIM_SUPPORT_THRESHOLD ? "LOW_OVERLAP_WITH_SAVED_SNIPPETS" : null;
    claims.push({ text: text.slice(0, 300), sourceOrdinals: sources.map((entry) => entry.ordinal), supported: reason === null, reason, coverage });
  }
  const supportedCount = claims.filter((claim) => claim.supported).length;
  const unsupportedCount = claims.length - supportedCount;
  const status = verificationBlocked ? "verification_blocked"
    : !claims.length ? "no_checkable_claims"
      : unsupportedCount === 0 && !citationsNotInSnapshot.length ? "supported"
        : supportedCount === 0 ? "unsupported" : "partially_supported";
  return { ...base, status, claimCount: claims.length, supportedCount, unsupportedCount, claims, citationsNotInSnapshot };
}

export const SUPPORT_STATUS_LABELS = Object.freeze({
  supported: "Every checked claim shares its key terms with the saved snippets",
  partially_supported: "Some claims are not found in the saved snippets",
  unsupported: "No checked claim is found in the saved snippets",
  no_checkable_claims: "No claim long enough to check",
  no_saved_snippets: "No saved snippets to check against",
  verification_blocked: "The answer refuses or says it cannot verify; it cannot be marked verified",
});

/** True when a persisted evidenceSupport object says the answer cannot be verified. */
export function isVerificationBlockedSupport(support) {
  return Boolean(support && typeof support === "object" && !Array.isArray(support) && support.verificationBlocked === true);
}

/**
 * Read the evidence-trust fields back from a persisted raw_json payload.
 * Missing values stay null; nothing is inferred.
 * @param {unknown} raw
 */
export function evidenceTrustFromRaw(raw) {
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const snapshot = Array.isArray(record.retrievedSources) ? record.retrievedSources : null;
  const support = record.evidenceSupport && typeof record.evidenceSupport === "object" ? record.evidenceSupport : null;
  return {
    origin: typeof record.referenceProvenance === "string" ? record.referenceProvenance : null,
    retrievalProvider: typeof record.retrievalProvider === "string" ? record.retrievalProvider : null,
    retrievalVersion: typeof record.retrievalVersion === "string" ? record.retrievalVersion : null,
    snapshot,
    support,
    verificationBlocked: support?.verificationBlocked === true,
  };
}
