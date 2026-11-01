import {
  assessCompleteRunHistory,
  MAX_COMPLETE_RUN_HISTORY_ANSWERS,
  MAX_COMPLETE_RUN_HISTORY_RUNS,
} from "./complete-run-evidence.mjs";

export const MAX_COMPETITOR_HISTORY_RUNS = MAX_COMPLETE_RUN_HISTORY_RUNS;
export const MAX_COMPETITOR_HISTORY_ANSWERS = MAX_COMPLETE_RUN_HISTORY_ANSWERS;

/**
 * Whether an answer names a brand as a whole term, not as part of another word.
 *
 * Plain substring matching counted "Box" inside "Inbox"/"Dropbox" and "Notion"
 * inside "notional", inflating competitor mention frequency (false precision).
 * A match must not be preceded or followed by a Unicode letter or number, so
 * punctuation, possessives ("Rival's") and multi-word names ("Acme Cloud") still match.
 *
 * @param {string} answerText
 * @param {string} brandName
 * @returns {boolean}
 */
export function answerMentionsName(answerText, brandName) {
  if (typeof answerText !== "string" || typeof brandName !== "string") return false;
  const name = brandName.trim().toLocaleLowerCase();
  if (!name) return false;
  const text = answerText.toLocaleLowerCase();
  const isWordChar = (char) => char !== undefined && /[\p{L}\p{N}]/u.test(char);
  let from = 0;
  while (from <= text.length - name.length) {
    const index = text.indexOf(name, from);
    if (index === -1) return false;
    const before = index > 0 ? [...text.slice(0, index)].at(-1) : undefined;
    const after = [...text.slice(index + name.length)][0];
    const nameStartsWord = isWordChar([...name][0]);
    const nameEndsWord = isWordChar([...name].at(-1));
    if ((!nameStartsWord || !isWordChar(before)) && (!nameEndsWord || !isWordChar(after))) return true;
    from = index + 1;
  }
  return false;
}

export function assessCompleteCompetitorHistory(runs, rows) {
  return assessCompleteRunHistory(runs, rows);
}

/**
 * Competitor movement for one exact comparable pair (#387).
 *
 * `pairAnswers` MUST be the rows returned by an independent re-read that has
 * already proven both complete verified answer sets with
 * `assessCompleteVerifiedRunPair` (see `assessWorkspaceRunPairComparability`).
 * The delta is computed only from those exact rows, never from the bounded
 * historical research window, and fails closed (null) if either side is empty
 * or carries rows from any other run.
 *
 * @param {Array<{runId:string, answerText:string}>} pairAnswers
 * @param {{latestId:string, previousId:string}} pair
 * @param {string} competitorName
 * @returns {number|null} percentage-point change, or null when unavailable
 */
export function competitorPairDelta(pairAnswers, pair, competitorName) {
  if (!Array.isArray(pairAnswers) || !pair || !pair.latestId || !pair.previousId || pair.latestId === pair.previousId) return null;
  const name = typeof competitorName === "string" ? competitorName.trim().toLocaleLowerCase() : "";
  if (!name) return null;
  if (pairAnswers.some((answer) => !answer || (answer.runId !== pair.latestId && answer.runId !== pair.previousId) || typeof answer.answerText !== "string")) return null;
  const frequency = (runId) => {
    const answers = pairAnswers.filter((answer) => answer.runId === runId);
    if (!answers.length) return null;
    const mentions = answers.filter((answer) => answerMentionsName(answer.answerText, name)).length;
    return Math.round((mentions / answers.length) * 100);
  };
  const latest = frequency(pair.latestId);
  const previous = frequency(pair.previousId);
  if (latest === null || previous === null) return null;
  return latest - previous;
}
