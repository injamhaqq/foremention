/**
 * A public opt-in flag alone does not certify the completeness of a reported
 * measurement. This deterministic guard requires independent full verified
 * answer reads before any public aggregate, provider count or trend is shown.
 * No customer data is logged, modified or inferred by this module.
 */
export const PUBLIC_REPORT_ANSWER_READ_LIMIT = 500;

const fail = (reason) => ({ ok: false, reason });
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const percent = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
const validUrl = (value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch { return false; }
};

/**
 * Limitations: this proves persisted answer-count, citation-count, provenance
 * and recorded brand-presence arithmetic. It DOES NOT prove that citations
 * support a claim, that the answer is correct, or that external buyers exist.
 */
export function assessPublicReportEvidence(runs, rows) {
  if (!Array.isArray(runs) || runs.length < 1 || runs.length > 52 || !Array.isArray(rows)) {
    return fail("The bounded set of public runs or their independently read answers is unavailable.");
  }
  const ids = new Set();
  let expected = 0;
  for (const run of runs) {
    if (typeof run.id !== "string" || !run.id.trim() || ids.has(run.id)
      || run.status !== "complete" || !Number.isSafeInteger(run.answer_count)
      || run.answer_count <= 0 || !whole(run.citation_count)
      || !percent(run.brand_presence_pct)) {
      return fail("A public candidate is duplicated, unfinished, or missing a valid independent measurement denominator.");
    }
    ids.add(run.id);
    expected += run.answer_count;
    if (expected >= PUBLIC_REPORT_ANSWER_READ_LIMIT) {
      return fail("The requested public run set exceeds the safe verified-answer read; a sentinel row cannot be reserved.");
    }
  }
  if (rows.length !== expected) {
    return fail("The complete verified answer set does not match independently recorded public run denominators.");
  }
  const perRun = new Map(runs.map((run) => [run.id, { run, count: 0, cited: 0, present: 0, ids: new Set(), slots: new Set(), providers: new Set() }]));
  for (const answer of rows) {
    const state = perRun.get(answer?.run_id);
    if (!state || typeof answer.id !== "string" || !answer.id.trim() || state.ids.has(answer.id)
      || answer.review_status !== "verified" || typeof answer.prompt_key !== "string"
      || !answer.prompt_key.trim() || typeof answer.provider !== "string" || !answer.provider.trim()
      || typeof answer.brand_present !== "boolean" || !Array.isArray(answer.citations_json)) {
      return fail("At least one public answer has ambiguous provenance, review, provider, or persisted citations.");
    }
    const slot = JSON.stringify([answer.prompt_key.trim(), answer.provider.trim()]);
    if (state.slots.has(slot)) return fail("Duplicate public buyer-question/provider slots do not constitute independent evidence.");
    if (!Array.isArray(state.run.provider_ids) || !state.run.provider_ids.includes(answer.provider)) {
      return fail("A reported provider was not part of its recorded collection.");
    }
    let cited = 0;
    for (const citation of answer.citations_json) {
      if (!citation || typeof citation.url !== "string" || !validUrl(citation.url)) {
        return fail("Unverifiable citation URL provenance cannot be counted as publicly reviewed evidence.");
      }
      cited += 1;
    }
    state.count += 1;
    state.cited += cited;
    if (answer.brand_present) state.present += 1;
    state.ids.add(answer.id);
    state.slots.add(slot);
    state.providers.add(answer.provider);
  }
  for (const state of perRun.values()) {
    const calculatedPresence = Math.round((state.present / state.count) * 10000) / 100;
    if (state.count !== state.run.answer_count || state.cited !== state.run.citation_count
      || Math.abs(calculatedPresence - Number(state.run.brand_presence_pct)) > 0.011) {
      return fail("The public run counters conflict with its independently readable verified evidence.");
    }
  }
  return {
    ok: true, reason: null,
    totalAnswers: rows.length,
    totalCitations: [...perRun.values()].reduce((sum, item) => sum + item.cited, 0),
    providerCoverage: new Set([...perRun.values()].flatMap((item) => [...item.providers])).size,
    latestBrandPresence: Math.round((perRun.get(runs[0].id).present / perRun.get(runs[0].id).count) * 10000) / 100,
  };
}
