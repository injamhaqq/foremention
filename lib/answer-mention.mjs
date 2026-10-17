/**
 * Whole-term brand/competitor mention matching for collected AI answers.
 *
 * Competitor visibility used to count an answer as a mention when the
 * lower-cased answer merely *contained* the name as a substring, so a
 * competitor called "Box" was counted in answers about inboxes or Dropbox,
 * "Notion" in "notional", and "SAP" in "ASAP". That inflated mention rates
 * and Source-Gap-style comparisons. The buyer-question brief already used a
 * Unicode-boundary match (`containsLiteralCompetitorName`); this module gives
 * competitor tracking, pair deltas and evidence integrity the same rule.
 *
 * Rules:
 * - Case-insensitive (Unicode aware).
 * - The name must not be preceded or followed by a letter, combining mark or
 *   number, so "Box" does not match "Dropbox"/"inbox", but does match
 *   "Box's", "(Box)", "Box." or "Box-based".
 * - Punctuation inside a name stays significant ("Monday.com", "Acme.ai").
 * - Runs of whitespace inside a multi-word name match any whitespace.
 * This checks a literal mention only, never sentiment or endorsement.
 */

const REGEX_SPECIALS = new Set(["\\", ".", "*", "+", "?", "^", "$", "{", "}", "(", ")", "|", "[", "]", "/"]);

function escapeRegex(value) {
  let escaped = "";
  for (const char of value) escaped += REGEX_SPECIALS.has(char) ? "\\" + char : char;
  return escaped;
}

const MAX_NAME_LENGTH = 120;

/**
 * Builds a reusable matcher for one name. Returns null for an unusable name
 * (empty, too long, or containing line breaks), which callers treat as
 * "never mentioned" so they fail closed instead of matching everything.
 * @param {unknown} name
 * @returns {((text: unknown) => boolean) | null}
 */
export function buildMentionMatcher(name) {
  if (typeof name !== "string" || /[\r\n]/u.test(name)) return null;
  const clean = name.replace(/\s+/gu, " ").trim();
  if (!clean || clean.length > MAX_NAME_LENGTH) return null;
  const body = clean.split(" ").map(escapeRegex).join("\\s+");
  const pattern = new RegExp("(?<![\\p{L}\\p{M}\\p{N}])" + body + "(?![\\p{L}\\p{M}\\p{N}])", "iu");
  return (text) => typeof text === "string" && pattern.test(text);
}

/**
 * True when `text` mentions `name` as a whole term.
 * @param {unknown} text
 * @param {unknown} name
 */
export function answerMentionsName(text, name) {
  const matcher = buildMentionMatcher(name);
  return matcher ? matcher(text) : false;
}
