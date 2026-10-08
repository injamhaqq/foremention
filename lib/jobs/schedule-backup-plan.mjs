/**
 * Cloudflare cron backup plan for repeat measurement (gap 5).
 *
 * The Inngest dispatcher runs at minute 17. The Worker backup runs the same
 * idempotent dispatcher pass at minute 47, so the two never overlap in normal
 * operation and a due cadence is picked up within an hour even when the
 * Inngest cron is not firing. Both crons must stay listed in wrangler.jsonc.
 */
export const MEASUREMENT_BACKUP_CRON = "47 * * * *";
export const INNGEST_SELF_SYNC_CRON = "13 */6 * * *";
export const WORKER_CRONS = Object.freeze([MEASUREMENT_BACKUP_CRON, INNGEST_SELF_SYNC_CRON]);

/**
 * @param {string} cron the controller.cron that fired
 * @param {{ FOREMENTION_SCHEDULE_BACKUP_CRON?: string, FOREMENTION_INNGEST_SELF_SYNC?: string, INNGEST_SIGNING_KEY?: string }} env
 * @returns {{ dispatch: boolean, selfSync: boolean }}
 */
export function scheduledBackupPlan(cron, env = {}) {
  // Backup dispatch is on by default (set FOREMENTION_SCHEDULE_BACKUP_CRON=0 to disable).
  const dispatch = cron === MEASUREMENT_BACKUP_CRON && env.FOREMENTION_SCHEDULE_BACKUP_CRON !== "0";
  // Self-sync is opt-in and needs the signing key the Inngest serve handler uses.
  const selfSync = cron === INNGEST_SELF_SYNC_CRON
    && env.FOREMENTION_INNGEST_SELF_SYNC === "1"
    && Boolean(env.INNGEST_SIGNING_KEY);
  return { dispatch, selfSync };
}
