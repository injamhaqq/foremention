/**
 * Official-domain evidence relevance (#345, A08).
 *
 * One shared, dependency-free policy used by:
 *   - free web retrieval (Brave Search API and Bing RSS) before any model call,
 *   - the workspace bulk run-review API before anything is marked VERIFIED,
 *   - the synthetic first-evidence production canary before it publishes.
 *
 * It is a URL-provenance guard, not a factuality validator: an in-scope URL is
 * a necessary minimum, never proof that the page supports a claim. When no
 * in-scope evidence exists the outcome is "unavailable/unknown", never an
 * off-domain substitute and never a fabricated official link. No prompts,
 * URLs or answer text are logged here.
 */

const DOMAIN_PATTERN = /\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|org|net|io|ai|co|dev|app|gov|edu|info|news|blog|tech|cloud|so|xyz|us|uk|de|fr|in|bd))(\/[a-z0-9\-._~/%]*)?/gi;
const PROVENANCE_REQUIREMENT = /\b(official\s+(?:[\w.-]+\s+){0,3}(?:website|site|domain|blog|newsroom|page|source)|from\s+the\s+official|exact\s+(?:[\w.-]+\s+){0,2}(?:source\s+)?url|only\s+(?:cite|use)\s+(?:sources?\s+)?from)\b/i;
const SAFE_PATH_PREFIX = /^(?:\/[a-z0-9\-._~]+)+$/;

/**
 * A scope is produced ONLY when the request names exactly one web domain and
 * explicitly requires that provenance. Ordinary comparison questions and
 * questions naming several domains are never site-scoped.
 *
 * Path: a mention without a path does not conflict with a mention that has one
 * ("posts on openai.com/news ... cite the exact openai.com URL" scopes to
 * /news). Two different paths for the same domain drop the path requirement
 * (domain scope only) rather than guessing which one was meant.
 *
 * @param {string} prompt
 * @returns {{ domain: string, pathPrefix: string | null } | null}
 */
export function sourceDomainScopeFromPrompt(prompt) {
  if (typeof prompt !== "string" || !prompt.trim()) return null;
  const text = prompt.normalize("NFKC");
  if (!PROVENANCE_REQUIREMENT.test(text)) return null;
  /** @type {Map<string, Set<string>>} */
  const found = new Map();
  for (const match of text.matchAll(DOMAIN_PATTERN)) {
    const domain = match[1].toLowerCase().replace(/^www\./, "");
    if (domain.endsWith(".invalid") || domain === "localhost") continue;
    const rawPath = (match[2] || "").replace(/[.,;:!?)]+$/, "").replace(/\/+$/, "").toLowerCase();
    const paths = found.get(domain) || new Set();
    if (rawPath && rawPath !== "/" && SAFE_PATH_PREFIX.test(rawPath)) paths.add(rawPath);
    found.set(domain, paths);
  }
  if (found.size !== 1) return null;
  const [[domain, paths]] = Array.from(found.entries());
  return { domain, pathPrefix: paths.size === 1 ? Array.from(paths)[0] : null };
}

/**
 * Strict URL-provenance match against an explicit scope: authenticated HTTPS,
 * the exact domain or a subdomain of it (no suffix/prefix/lookalike spoofs),
 * no credentials, no non-default port, no encoded path separators, and the
 * required path section when one was requested.
 *
 * @param {string} url
 * @param {{ domain: string, pathPrefix: string | null } | null} scope
 */
export function citationMatchesScope(url, scope) {
  if (!scope || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== scope.domain && !host.endsWith(`.${scope.domain}`)) return false;
    if (/%(?:2f|5c)/i.test(parsed.pathname) || parsed.pathname.includes("\\")) return false;
    if (!scope.pathPrefix) return true;
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, "");
    return path === scope.pathPrefix || path.startsWith(`${scope.pathPrefix}/`);
  } catch {
    return false;
  }
}

const ABSTENTIONS = [
  /^i\s+(?:do not|don't)\s+know\b/i,
  /^(?:i\s+)?(?:(?:cannot|can't|could\s+not|couldn't)\s+|(?:am|was)\s+unable\s+to\s+|(?:am|was)\s+not\s+able\s+to\s+)(?:currently\s+)?(?:verify|confirm|determine|find|locate|access|identify|provide)\b/i,
  /^unable\s+to\s+(?:verify|confirm|determine|find|locate|access|identify)\b/i,
  /^(?:(?:there\s+is\s+)?(?:not\s+enough|insufficient)|there\s+(?:isn't|is\s+not)\s+enough)\s+(?:(?:current|available|reliable|retrieved)\s+)?(?:evidence|information)\b/i,
  /^no\s+(?:reliable|verifiable|current|available|retrieved)\s+(?:evidence|information|source)\b/i,
  /^(?:the\s+)?(?:available|current|retrieved|provided|supplied)\s+(?:web\s+)?(?:evidence|sources?)\s+(?:does|do)\s+not\s+(?:verify|establish|confirm|contain|include|show|support)\b/i,
];

// An explicit refusal can appear after a short preamble or after a proposed
// answer. Its presence does not become verified merely because a URL was
// returned alongside it. Keep such answers available for manual review.
const EXPLICIT_UNVERIFIED_CLAIM = /\b(?:i|we)\s+(?:(?:cannot|can't|could\s+not|couldn't)\s+(?:currently\s+)?(?:verify|confirm|determine|identify|establish)\b|(?:am|are|was|were)\s+(?:unable|not\s+able)\s+to\s+(?:verify|confirm|determine|identify|establish)\b)|\bi'm\s+(?:unable|not\s+able)\s+to\s+(?:verify|confirm|determine|identify|establish)\b/i;

/** @param {unknown} answer */
export function isAbstentionAnswer(answer) {
  const normalized = typeof answer === "string" ? answer.normalize("NFKC").replace(/[\u2018\u2019]/g, "'").trim().replace(/^[\s"'“‘*_>#-]+/, "") : "";
  return !normalized || ABSTENTIONS.some((pattern) => pattern.test(normalized)) || EXPLICIT_UNVERIFIED_CLAIM.test(normalized);
}

/**
 * Whether a persisted/displayed answer may count as verified evidence for a
 * question that explicitly requires official-domain provenance.
 *
 * @param {unknown} answer
 * @param {unknown} citations array of { url } (anything else is ignored as unqualified)
 * @param {{ domain: string, pathPrefix: string | null } | null} scope
 * @returns {{ ok: boolean, reason: string | null }}
 */
export function assessOfficialSourceAnswer(answer, citations, scope) {
  if (!scope) return { ok: false, reason: "NO_EXPLICIT_OFFICIAL_REQUIREMENT" };
  const list = Array.isArray(citations) ? citations : [];
  const urls = list.map((item) => (item && typeof item === "object" && typeof item.url === "string" ? item.url : null));
  const official = urls.filter((url) => url !== null && citationMatchesScope(url, scope));
  if (!official.length) return { ok: false, reason: "NO_OFFICIAL_DOMAIN_CITATIONS" };
  // One qualifying URL does not launder unrelated domains/sections cited beside it.
  if (official.length !== urls.length) return { ok: false, reason: "UNQUALIFIED_CITATIONS_PRESENT" };
  // An official URL beside an explicit non-answer is not evidence of the claim.
  if (isAbstentionAnswer(answer)) return { ok: false, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE" };
  return { ok: true, reason: null };
}

/**
 * Partition persisted run answers for bulk review. Answers to questions that
 * explicitly require official-domain provenance but lack qualifying evidence
 * (off-domain/wrong-section citations, none, or an abstention) are withheld
 * from VERIFIED; their finding stays unknown. Generic-question abstentions
 * are withheld too; substantive generic answers keep human review.
 *
 * @param {Array<{ id: string, prompt_text?: string | null, answer_text?: string | null, citations_json?: unknown }>} rows
 * @returns {{ verifiable: string[], withheld: Array<{ id: string, reason: string }> }}
 */
export function partitionOfficialSourceReview(rows) {
  /** @type {string[]} */
  const verifiable = [];
  /** @type {Array<{ id: string, reason: string }>} */
  const withheld = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const scope = sourceDomainScopeFromPrompt(row.prompt_text || "");
    if (!scope) {
      // An ordinary buyer question has no official-domain constraint, but
      // an explicit refusal cannot be bulk-marked VERIFIED.
      if (isAbstentionAnswer(row.answer_text)) withheld.push({ id: row.id, reason: "ABSTENTION_NOT_VERIFIED_EVIDENCE" });
      else verifiable.push(row.id);
      continue;
    }
    const assessment = assessOfficialSourceAnswer(row.answer_text, row.citations_json, scope);
    if (assessment.ok) verifiable.push(row.id);
    else withheld.push({ id: row.id, reason: assessment.reason || "UNQUALIFIED" });
  }
  return { verifiable, withheld };
}
