# Issue #329: historical provider-attempt cost gaps (17), reconciliation status

Status: **documented, not repaired.** No code change can close #329 on its own, and none is made here.

## Why there is no code fix

#329's acceptance says that a repair happens only "if approved evidence warrants it" (step 4). It also needs vendor billing evidence (steps 2 and 3) that is not in this repository. The cost-ledger code path is already correct for new attempts:

- Since `20260915171500_provider_attempt_cost_ledger.sql`, the `ledger_run_attempt_cost_after_write` trigger writes the `ai_cost_events` row in the same transaction as the terminal attempt. CI verifies this with `scripts/verify-terminal-attempt-ledger.sql`.
- The September 26 control sample found 0 new gaps across 5 terminal Cloudflare attempts.
- An automated backfill would break the issue's own rules. It would book `estimated` values as charges without invoice evidence, and it could double-book retries that are already billed.

So the safe deliverable is a **read-only diagnostic** plus this record. A repair stays an owner decision.

## What the repository already shows

| Fact | Source |
| --- | --- |
| The ledger trigger migration `provider_attempt_cost_ledger` was applied in production at version `20260915184836` (15 Sep 2026, 18:48:36 UTC) | `docs/operations/PRODUCTION-MIGRATION-LEDGER-METADATA-SNAPSHOT-2026-09-26.json` |
| 5 OpenRouter failures (Sept 7–14, $0.015500 estimated) | #329 table |
| 12 Cloudflare/Gemini failures and rate limits (Sept 20, $0.000000 estimated) | #329 table |

**Inference, to confirm with the diagnostic:**
- The **5 OpenRouter gaps predate the trigger.** Before it existed, the ledger row was a separate, later app write. A failure between the two writes left the attempt without a ledger row. This matches the historical mechanism and does **not** show a current trigger failure.
- The **12 Sept 20 gaps postdate the trigger** and carry $0 estimates. They are *not* explained by trigger timing. The likely causes the diagnostic separates are a ledger row stored under another organization, a retry booked on a sibling attempt, or a ledger link nulled by `on delete set null`. If none of these applies, treat them as `post_trigger_*_unexplained` and investigate (#329 step 4: "investigate original app ledger persistence on failures if new missing entries appear"). Their dollar impact is $0 estimated either way.

## Owner procedure (no spend, no writes)

1. Run `scripts/diagnose-cost-ledger-gaps.sql` as `service_role` against production or a staging clone. It is `begin transaction read only` … `rollback`, and it makes no provider calls. For each gap it lists the attempt id, lifecycle timestamps, the ledger-trigger install time, ledger rows under another organization, sibling-attempt ledger rows, unlinked ledger rows for the run, and a `gap_class`.
2. For the 5 OpenRouter attempts, check the OpenRouter activity/billing export for those timestamps. Record each one as `invoiced actual`, `zero on available usage records`, or `unknown`. Never convert `estimated` into `provider_reported`. A finding of no charge also needs evidence.
3. Only with that evidence and owner approval, write a separate, idempotent, forward-only migration. It must insert ledger rows only for attempts proven to be charged, keep `cost_source = 'estimated'` unless provider-reported data exists, use `on conflict (run_attempt_id) do nothing`, and be validated on a staging clone against `provider_attempt_operational_facts`.
4. Keep `verified_total_cost_per_reviewed_decision_usd` NULL. Nothing in this procedure changes it.

## Not done here

- No backfill, invoice, migration, or production query was run.
- No provider request or paid spend was made.
