/**
 * Deterministic calendar keys for scheduled jobs (Chat06).
 *
 * A cron-triggered job that is retried, replayed, or manually re-run later in
 * the same week must produce the SAME dedup key, otherwise the unique
 * delivery ledger cannot suppress a second digest. The key is the UTC date of
 * the Monday that starts the ISO week containing `instant`.
 */
export function isoWeekKey(instant: Date = new Date()) {
  if (!Number.isFinite(instant.getTime())) throw new Error("A valid instant is required for the week key.");
  const day = instant.getUTCDay(); // 0 = Sunday
  const offsetToMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate() - offsetToMonday));
  return monday.toISOString().slice(0, 10);
}
