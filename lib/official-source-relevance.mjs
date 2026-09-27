/**
 * Narrow source-provenance guard for requests explicitly requiring a cited
 * official site. This is not an answer factuality validator or a web license.
 * No URLs, prompts, or answer text are logged by these helpers.
 */
export function explicitOfficialSourceRequirement(question) {
  if (typeof question !== "string" || !/\bofficial\b/i.test(question) ||
      !/\bcite\b[^.!?]{0,150}\bexact\b/i.test(question)) return null;
  const beforeCitation = question.split(/\bcite\b/i)[0] || "";
  const matches = [...beforeCitation.matchAll(/\b(?:on|from|at)\s+(?:https?:\/\/)?((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})(\/[a-z0-9/_-]*)?/gi)];
  const match = matches.at(-1);
  if (!match) return null;
  const host = match[1].toLowerCase().replace(/^www\./, "");
  if (host.endsWith(".invalid") || host === "localhost") return null;
  return { host, pathHint: (match[2] || "").replace(/^\/|\/$/g, "") };
}

export function boundedOfficialSiteQuery(question, requirement) {
  if (!requirement || !/^[a-z0-9.-]+$/.test(requirement.host)) {
    throw new Error("A validated official-source requirement is necessary.");
  }
  // Extract the *question* rather than passing search instructions to search.
  // Query terms and optional source path are bounded; this is not a license to
  // fetch or redistribute any search result.
  const searchQuestion = (question.match(/\b(?:what|which|who|when|where|how)\b[^?]{0,300}\?/i) || [question])[0];
  const terms = searchQuestion
    .replace(/(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[a-z0-9/_-]*)?/gi, " ")
    .replace(/\b(?:what|which|who|when|where|how|is|the|and|of|on|from|at|according|to|official|website|source|url|used|answer|you|most|recently|that|exact)\b/gi, " ")
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(/\s+/).filter(x => x.length >= 2).slice(0, 14);
  const pathTerms = requirement.pathHint.split(/[\/_-]/).filter(x => /^[a-z0-9]{2,24}$/i.test(x)).slice(0, 3);
  return `site:${requirement.host} ${[...pathTerms, ...terms].join(" ")}`.trim().slice(0, 180);
}

export function filterOfficialDomainCitations(citations, requirement) {
  if (!requirement) return citations;
  return citations.filter(citation => {
    try {
      const url = new URL(citation.url);
      const host = url.hostname.toLowerCase();
      return ["http:", "https:"].includes(url.protocol) &&
        (host === requirement.host || host === "www." + requirement.host);
    } catch {
      return false;
    }
  });
}

export function assessExplicitOfficialSourceAnswer(answer, citations, requirement) {
  if (!requirement) return { ok: false, reason: "NO_EXPLICIT_OFFICIAL_REQUIREMENT" };
  const official = filterOfficialDomainCitations(citations, requirement);
  if (!official.length) return { ok: false, reason: "NO_OFFICIAL_DOMAIN_CITATIONS" };
  const normalized = typeof answer === "string" ? answer.trim() : "";
  if (!normalized || /^(?:i\s+(?:(?:cannot|can't|could\s+not|couldn't|am\s+unable\s+to)\s+verify|(?:cannot|can't)\s+determine)|unable\s+to\s+verify|the\s+available\s+evidence\s+does\s+not\s+(?:verify|establish))/i.test(normalized)) {
    return { ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE" };
  }
  // Presence of an official returned citation is a necessary minimum gate,
  // not proof of source relevance, latest publication date, or causality.
  return { ok: true, reason: null };
}
