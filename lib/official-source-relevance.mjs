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
      // An exact official-source citation must use authenticated HTTPS, not
      // a plaintext link, a credential-bearing URL or a nonstandard service.
      // This is still only a necessary URL-provenance check: independent
      // inspection must establish whether the page supports the claim.
      const hostAllowed = host === requirement.host || host === "www." + requirement.host;
      // A required official *section* is narrower than a host. A URL on the
      // same organization domain but outside /news (or /newsroom) is NOT the
      // requested /news source. Disallow encoded slashes/backslashes that
      // could be decoded inconsistently downstream.
      const hint = typeof requirement.pathHint === "string" ? requirement.pathHint : "";
      if (hint && !new RegExp("^[a-z0-9_-]+(?:/[a-z0-9_-]+)*$", "i").test(hint)) return false;
      // URL paths are case-sensitive, even when hostnames are not.
      const requiredPath = hint ? "/" + hint : "";
      const path = url.pathname;
      const pathAllowed = !requiredPath || path === requiredPath || path === requiredPath + "/"
        || path.startsWith(requiredPath + "/");
      return url.protocol === "https:" && !url.username && !url.password && !url.port &&
        hostAllowed && pathAllowed && !/%(?:2f|5c)/i.test(path);
    } catch {
      return false;
    }
  });
}

export function assessExplicitOfficialSourceAnswer(answer, citations, requirement) {
  if (!requirement) return { ok: false, reason: "NO_EXPLICIT_OFFICIAL_REQUIREMENT" };
  const official = filterOfficialDomainCitations(citations, requirement);
  if (!official.length) return { ok: false, reason: "NO_OFFICIAL_DOMAIN_CITATIONS" };
  // A response that also cites unrelated domains/sections cannot be bulk
  // VERIFIED as an exact official-source answer merely because one URL passed.
  if (!Array.isArray(citations) || official.length !== citations.length) {
    return { ok: false, reason: "UNQUALIFIED_CITATIONS_PRESENT" };
  }
  const normalized = typeof answer === "string" ? answer.trim() : "";
  // An official URL displayed beside an explicit non-answer does not prove
  // that the cited page supports a title, a publication date, or a claim.
  // Keep this strict only for explicitly requested official-source evidence;
  // ordinary comparison questions do not use this assessment.
  const answerPrefix = normalized.replace(/^[\s"'“‘]+/, "");
  const refusals = [
    /^i\s+(?:do not|don't)\s+know\b/i,
    /^i\s+(?:(?:cannot|can't|could\s+not|couldn't)\s+|(?:am|was)\s+unable\s+to\s+)(?:verify|confirm|determine|find|locate|access)\b/i,
    /^i\s+(?:am|was)\s+not\s+able\s+to\s+(?:verify|confirm|determine|find|locate|access)\b/i,
    /^unable\s+to\s+(?:verify|confirm|determine|find|locate|access)\b/i,
    /^(?:(?:there\s+is\s+)?(?:not\s+enough|insufficient)|there\s+(?:isn't|is\s+not)\s+enough)\s+(?:(?:current|available|reliable)\s+)?(?:evidence|information)\b/i,
    /^no\s+(?:reliable|verifiable|current|available)\s+(?:evidence|information|source)\b/i,
    /^(?:the\s+)?(?:available|current)\s+evidence\s+does\s+not\s+(?:verify|establish|confirm)\b/i,
  ];
  if (!normalized || refusals.some((pattern) => pattern.test(answerPrefix))) {
    return { ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE" };
  }
  // Presence of an official returned citation is a necessary minimum gate,
  // not proof of source relevance, latest publication date, or causality.
  return { ok: true, reason: null };
}
