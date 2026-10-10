# Weekly pilot capacity and repeat-measurement backup (2026-10-08)

Status: **code ready, owner action required for the database quota.** Nothing here has been applied to production.

## Why

A weekly second cycle over the full Foundation question set needs
10 questions x 1 provider x up to 5 scheduled weeks = **50 provider-prompt
observations per calendar month**. The server quota default is 20
(`organization_entitlements.monthly_run_units`), so a weekly cadence stops in its
third week. The $2.00 monthly AI spend cap is **not** changed by this work.

## What the code PR changes

- `lib/product-limits.ts`: Foundation limits are env-configurable with bounded
  parsing. Defaults: 10 questions, **50** observations/month, **$2.00** spend cap
  (unchanged). Overrides: `FOREMENTION_FOUNDATION_RUN_UNITS_PER_MONTH`,
  `FOREMENTION_FOUNDATION_BUYER_QUESTIONS`,
  `FOREMENTION_FOUNDATION_MONTHLY_AI_SPEND_CAP_USD`,
  `FOREMENTION_FOUNDATION_HISTORY_DAYS`. Invalid or out-of-range values fall back
  to the default.
- Settings shows the **server-enforced** quota for the workspace when it can be
  read, so the UI never claims capacity the server will refuse.
- Cloudflare cron backup (`wrangler.jsonc` `triggers.crons`, `worker/index.ts`
  `scheduled`, `lib/jobs/schedule-backup-plan.mjs`): minute 47 re-runs the same
  idempotent schedule dispatcher pass the Inngest cron runs at minute 17.
  Disable with `FOREMENTION_SCHEDULE_BACKUP_CRON=0`. An opt-in 6-hourly Inngest
  self-sync (PUT `/api/inngest` in-process) runs only with
  `FOREMENTION_INNGEST_SELF_SYNC=1` and `INNGEST_SIGNING_KEY` set.

## Why there is no migration in the PR

`tests/migration-sql-receipt-audit.test.mjs` pins the repository to the 93
migrations corroborated by the 26 September production SQL receipt snapshot and
must be explicitly refreshed after any migration change. Production migration
lineage is still unreconciled (#332). Adding a migration would require that
owner-gated refresh, so the quota change is left as an explicit owner action.

## Owner action (after #332 lineage is reconciled, or per pilot workspace)

Per pilot workspace (narrowest change, reversible):

```sql
update public.organization_entitlements
set monthly_run_units = 50
where organization_id = '<pilot organization id>'
  and plan = 'free_beta'
  and monthly_ai_spend_cap_usd = 2.00;
```

Default for all legacy Foundation workspaces (as a future migration, with the
receipt-fixture refresh):

```sql
alter table public.organization_entitlements alter column monthly_run_units set default 50;
update public.organization_entitlements
set monthly_run_units = 50
where plan = 'free_beta' and monthly_run_units = 20 and monthly_ai_spend_cap_usd = 2.00;
```

`reserve_run_budget_server` still fails closed at the dollar cap, so a
higher-cost provider (for example Groq at a $0.10 reserved cost per observation)
stops after 20 observations whatever units remain.

## Limits of the cron backup

The backup prepares and queues due runs and sends the deterministic
`foremention/run.requested` event (`foremention-schedule-<runId>`), which Inngest
de-duplicates. Collection itself still executes in the Inngest
`run-multi-engine-scan` function, so if the Inngest app is not synced at all the
queued run waits until it is; enable the self-sync or re-sync on deploy.
Verify on production by checking Worker logs for `measurement_schedule_backup_pass`.
