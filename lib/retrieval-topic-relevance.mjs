/**
 * Conservative pre-synthesis relevance screen for independent search results.
 * A lexical match is NOT claim verification, credibility or native citation.
 */
const STOP = new Set([
  "a","about","according","after","all","also","an","and","answer","are","as","at","be","best","between","by",
  "can","choose","choosing","compare","compared","consider","could","current","date","did","do","does",
  "evaluate","evaluating","exact","find","for","from","has","have","how","in","is","it","its","latest",
  "most","of","on","or","our","recommend","recommendations","say","select","selecting","should",
  "show","source","sources","than","that","the","their","these","this","to","today","top","use",
  "using","versus","vs","was","what","when","where","which","who","why","will","with","would","you","your",
]);
const BROAD = new Set(["ai","b2b","saas","software","business","brand","company","customer","enterprise","marketing","product","service","team"]);
const ALIASES = {
  apps:"software",application:"software",applications:"software",platform:"software",platforms:"software",
  tools:"software",tool:"software",solutions:"software",solution:"software",systems:"software",
  monitors:"monitoring",monitor:"monitoring",tracked:"monitoring",tracking:"monitoring",track:"monitoring",
  measure:"monitoring",measurement:"monitoring",measurements:"monitoring",
  visible:"visibility",discoverability:"visibility",presence:"visibility",mentions:"visibility",
  llms:"ai",llm:"ai",chatgpt:"ai",generative:"ai",
  crms:"crm",customers:"customer",businesses:"business",companies:"company",
  saases:"saas",services:"service",brands:"brand",teams:"team",
};
function terms(value) {
  const tokens = (String(value || "").normalize("NFKC").toLowerCase().match(/[a-z0-9]+/g) || []);
  return new Set(tokens.filter(t => t.length >= 3 || ["ai","hr"].includes(t))
    .filter(t => !STOP.has(t)).map(t => ALIASES[t] || t));
}
function candidateText(item) {
  let path = "";
  try {
    const url = new URL(item.url);
    path = decodeURIComponent(url.pathname).replace(/[%/_.-]+/g, " ");
  } catch { /* invalid URLs contribute no path */ }
  return [item.title || "", item.snippet || "", path].join(" ");
}
/** @param {string} question @param {Array<{url:string,title?:string,snippet?:string}>} candidates */
export function assessRetrievedTopicRelevance(question, candidates) {
  const required = terms(question);
  const specific = [...required].filter(t => !BROAD.has(t));
  const accepted = [];
  const rejected = [];
  const insufficientQuestion = required.size < 2 || specific.length === 0;
  for (const item of Array.isArray(candidates) ? candidates : []) {
    const content = terms(candidateText(item));
    const matched = [...required].filter(t => content.has(t));
    if (!insufficientQuestion && matched.length >= 2 && matched.some(t => !BROAD.has(t))) {
      accepted.push(item);
    } else {
      rejected.push({ url: item.url, matchedTerms: matched });
    }
  }
  return {
    accepted, rejected,
    reason: accepted.length ? null : insufficientQuestion ? "QUESTION_TOO_AMBIGUOUS" : "NO_TOPICALLY_RELEVANT_RESULTS",
  };
}
export class RetrievedTopicUnavailableError extends Error {
  constructor(reason, retrievedCount) {
    super("No independently retrieved candidate met the buyer-question topical relevance gate (" + reason + "); " + retrievedCount + " candidate(s) were withheld, not counted as answer evidence.");
    this.name = "RetrievedTopicUnavailableError";
    this.reason = reason;
    this.retrievedCount = retrievedCount;
  }
}
