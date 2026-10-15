/**
 * runs.answer_count / citation_count are written once, when collection reaches
 * review. While a run is still collecting, answers it has already persisted
 * exist in run_answers, so a collecting run must not be shown as "0 answers"
 * when real answers are saved. Counts come only from persisted rows.
 */
export type CountableRun = { id: string; status: string; answers: number; citations: number };
export type PersistedAnswerRow = { run_id: string; citations_json: Array<{ url?: string | null }> | null };

export const COLLECTING_STATUSES = new Set(["queued", "running"]);

export function collectingRunIds(runs: CountableRun[]) {
  return runs.filter((run) => COLLECTING_STATUSES.has(run.status)).map((run) => run.id);
}

export function withLiveCollectionCounts<T extends CountableRun>(runs: T[], rows: PersistedAnswerRow[]): T[] {
  if (!rows.length) return runs;
  const counts = new Map<string, { answers: number; citations: number }>();
  for (const row of rows) {
    const current = counts.get(row.run_id) || { answers: 0, citations: 0 };
    current.answers += 1;
    current.citations += (row.citations_json || []).filter((citation) => Boolean(citation?.url)).length;
    counts.set(row.run_id, current);
  }
  return runs.map((run) => {
    const live = COLLECTING_STATUSES.has(run.status) ? counts.get(run.id) : undefined;
    if (!live) return run;
    return { ...run, answers: Math.max(run.answers || 0, live.answers), citations: Math.max(run.citations || 0, live.citations) };
  });
}
