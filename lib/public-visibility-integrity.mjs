import {
  assessCompleteRunHistory,
  MAX_COMPLETE_RUN_HISTORY_ANSWERS,
  MAX_COMPLETE_RUN_HISTORY_RUNS,
} from "./complete-run-evidence.mjs";

/**
 * Fail-closed gate for opt-in public visibility aggregates (#386).
 *
 * A public figure may be shown only when every selected completed run has its
 * complete, fully human-verified persisted answer set independently readable
 * inside a bounded read that still reserves a truncation sentinel. Persisted
 * run summary counters (brand presence and citation count) must reconcile with
 * the arithmetic recomputed from those exact answers; any contradiction,
 * saturation, duplicate slot or unrecorded provider withholds the WHOLE
 * aggregate instead of publishing a partial figure.
 *
 * The cited-source count is derived only from URLs returned in those verified
 * answers. It is never an organization-wide `sources` table count and it does
 * not claim that a returned URL supports or caused a recommendation.
 */
export const MAX_PUBLIC_REPORT_RUNS = MAX_COMPLETE_RUN_HISTORY_RUNS;
export const MAX_PUBLIC_REPORT_ANSWERS = MAX_COMPLETE_RUN_HISTORY_ANSWERS;

const positiveCount = (value) =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const roundedPct = (numerator, denominator) =>
  Math.round((numerator / denominator) * 10_000) / 100;

function defaultCanonicalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Choose the newest completed runs (input ordered newest first) whose combined
 * persisted answer denominators fit under the bounded answer read with a
 * sentinel row to spare. Any run without a valid positive denominator stops the
 * selection so that a malformed run can never be silently skipped.
 */
export function selectPublicReportRuns(runs) {
  if (!Array.isArray(runs)) return { ok: false, reason: "INVALID_RUN_LIST", runs: [] };
  const selected = [];
  let total = 0;
  for (const run of runs.slice(0, MAX_PUBLIC_REPORT_RUNS)) {
    if (!run || run.status !== "complete" || !positiveCount(run.answer_count)) {
      if (!selected.length) return { ok: false, reason: "INVALID_RECORDED_RUN_DENOMINATOR", runs: [] };
      break;
    }
    if (total + run.answer_count >= MAX_PUBLIC_REPORT_ANSWERS) break;
    total += run.answer_count;
    selected.push(run);
  }
  if (!selected.length) return { ok: false, reason: "ANSWER_HISTORY_SATURATED", runs: [] };
  return { ok: true, reason: null, runs: selected, expectedAnswers: total };
}

/**
 * @param {Array<{id:string,status:string,answer_count:number,citation_count:number,brand_presence_pct:number|string|null,provider_ids?:string[],completed_at?:string|null}>} runs newest first
 * @param {Array<{id:string,run_id:string,prompt_key:string,provider:string,review_status:string,brand_present:boolean|null,citations_json:unknown}>} rows
 */
export function assessPublicVisibilityAggregate(runs, rows, canonicalUrl = defaultCanonicalUrl) {
  if (!Array.isArray(runs) || !runs.length) return { ok: false, reason: "NO_REVIEWED_RUNS" };
  if (runs.some((run) => run?.status !== "complete")) return { ok: false, reason: "NON_COMPLETE_RUN" };

  const completeness = assessCompleteRunHistory(runs, rows);
  if (!completeness.ok) return { ok: false, reason: completeness.reason };

  const citedUrls = new Set();
  const providers = new Set();
  let totalCitations = 0;
  let latestBrandPresence = null;

  for (const [index, run] of runs.entries()) {
    const runRows = rows.filter((row) => row.run_id === run.id);
    if (runRows.some((row) => typeof row.brand_present !== "boolean")) {
      return { ok: false, reason: "UNRESOLVED_BRAND_OBSERVATION" };
    }
    let runCitations = 0;
    for (const row of runRows) {
      if (row.citations_json != null && !Array.isArray(row.citations_json)) {
        return { ok: false, reason: "INVALID_CITATION_PROVENANCE" };
      }
      const citations = Array.isArray(row.citations_json) ? row.citations_json : [];
      runCitations += citations.length;
      for (const citation of citations) {
        const canonical = citation && typeof citation.url === "string" ? canonicalUrl(citation.url) : null;
        if (canonical) citedUrls.add(canonical);
      }
      providers.add(row.provider.trim());
    }
    if (Number(run.citation_count) !== runCitations) {
      return { ok: false, reason: "CITATION_COUNT_MISMATCH" };
    }
    const recomputed = roundedPct(runRows.filter((row) => row.brand_present).length, runRows.length);
    const persisted = Number(run.brand_presence_pct);
    if (!Number.isFinite(persisted) || Math.abs(persisted - recomputed) > 0.01) {
      return { ok: false, reason: "BRAND_PRESENCE_MISMATCH" };
    }
    if (index === 0) latestBrandPresence = recomputed;
    totalCitations += runCitations;
  }

  return {
    ok: true,
    reason: null,
    aggregate: {
      runs: runs.length,
      providerCoverage: providers.size,
      latestBrandPresence,
      totalAnswers: rows.length,
      totalCitations,
      citedUrlCount: citedUrls.size,
    },
  };
}
