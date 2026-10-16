/**
 * A deterministic, factual first-evidence release fixture, NOT a general
 * factuality validator. The real release must still collect a live API-hosted
 * model response through authenticated customer paths and return the source.
 *
 * First-party fact independently checked against:
 * https://openai.com/index/chatgpt/
 * Heading: Introducing ChatGPT; date: November 30, 2022.
 */
import {
  assessOfficialSourceAnswer,
  citationMatchesScope,
  sourceDomainScopeFromPrompt,
} from "./official-source-relevance.mjs";

export const officialFirstEvidenceQuestion =
  "Use web search now. On OpenAI's official announcement at openai.com/index/chatgpt/, what are the exact article title and publication date? Verify both directly using that official page, not memory. Reply on separate lines as 'Title: ...' and 'Publication date: ...' and cite the exact openai.com/index/chatgpt/ source URL. If the source does not establish both details, explicitly say you cannot verify them.";

export const officialFirstEvidenceUrl = "https://openai.com/index/chatgpt/";
const officialScope = sourceDomainScopeFromPrompt(officialFirstEvidenceQuestion);
if (!officialScope || officialScope.domain !== "openai.com" || officialScope.pathPrefix !== "/index/chatgpt") {
  throw new Error("Fixed first-evidence fixture lost its strict official-page scope.");
}

/** @param {unknown} answer @param {unknown} citations */
export function assessOfficialFirstEvidenceAnswer(answer, citations) {
  const qualified = assessOfficialSourceAnswer(answer, citations, officialScope);
  if (!qualified.ok) return qualified;
  // The positive canary is independently mergeable before or after Chat 02:
  // older main branches recognized only leading refusals. Never allow an
  // embedded "I cannot verify" after a plausible title/date to count as proof.
  const text = typeof answer === "string" ? answer.normalize("NFKC").replace(/[\u2018\u2019]/g, "'") : "";
  if (/\b(?:i|we)\s+(?:(?:cannot|can't|could\s+not|couldn't)\s+(?:currently\s+)?(?:verify|confirm|determine|establish)\b|(?:am|are|was|were)\s+(?:unable|not\s+able)\s+to\s+(?:verify|confirm|determine|establish)\b)/i.test(text)) {
    return { ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE" };
  }

  const links = Array.isArray(citations) ? citations : [];
  const exact = links.some((item) => {
    const raw = item && typeof item === "object" ? item.url : null;
    if (typeof raw !== "string" || !citationMatchesScope(raw, officialScope)) return false;
    try {
      const url = new URL(raw);
      return url.hostname.replace(/^www\./, "").toLowerCase() === "openai.com"
        && url.pathname.replace(/\/+$/, "").toLowerCase() === "/index/chatgpt";
    } catch { return false; }
  });
  if (!exact) return { ok: false, reason: "EXACT_OFFICIAL_ARTICLE_CITATION_MISSING" };

  // Require assertions, not incidental dates/URLs or misleading sentences.
  const lines = typeof answer === "string"
    ? answer.normalize("NFKC").split(/\r?\n/).map((line) =>
      line.replace(/[*_]/g, "").replace(/^\s*[-•]\s*/, "").trim())
    : [];
  const titleLines = lines.filter((line) => /^title\s*:/i.test(line));
  const dateLines = lines.filter((line) => /^publication\s+date\s*:/i.test(line));
  if (titleLines.length !== 1 || !/^title\s*:\s*["“']?introducing chatgpt["”']?\.?$/i.test(titleLines[0])) {
    return { ok: false, reason: "EXPECTED_ARTICLE_TITLE_UNVERIFIED" };
  }
  if (dateLines.length !== 1 || !/^publication\s+date\s*:\s*(?:november\s+30,?\s+2022|2022-11-30)\.?$/i.test(dateLines[0])) {
    return { ok: false, reason: "EXPECTED_ARTICLE_DATE_UNVERIFIED" };
  }
  return { ok: true, reason: null };
}
