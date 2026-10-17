# FM360 release sequencing (Chat 01, 2026-10-17)

Status: **proposal only.** Nothing here has been applied, merged or deployed.
Applies to the stack draft #604 (integration) → #605 (atomic invitation accept) → #606 (evidence page read).

## Read-only production preflight (2026-10-17 ~18:10 UTC, Supabase project `vuujwdxivjsdikdstwib`)

Run through the Supabase Management API read-only query endpoint. Counts only; no row contents read.

| Check | Result |
|---|---|
| Latest applied migration | `20261014180000` (= newest on `main` fc43577; prod schema matches main) |
| `public.invitations` rows / pending | 0 / 0 |
| Normalized duplicate pending invitations (`organization_id, lower(email)`) | 0 groups, so the #605 guard will not abort |
| `invitations_one_pending_normalized_mailbox` index, `accept_foremention_invitation` RPC | absent (expected) |
| `measurement_schedules` rows | 4; none has the new columns or constraint yet |
| `runs.originating_schedule_id`, billing inbox tables | absent (expected) |

Every new constraint is satisfied by existing data: existing schedules default to `schedule_origin = 'legacy_unknown'`, which the new check always allows, and the partial unique index covers only modern origins (0 rows).

## Migrations not yet in production (apply in this order)

1. `20261016130000_chat04_strict_decision_save_replay.sql` (#604)
2. `20261016160000_schedule_contract_fm360.sql` (#604)
3. `20261016190000_chat06_billing_verified_inbox.sql` (#604)
4. `20261017150000_chat01_atomic_invitation_accept.sql` (#605)

## Order of operations (needs explicit founder go at each step)

1. Re-run the preflight queries above immediately before applying; abort on any duplicate group.
2. Apply migrations 1–4 to production in order (`supabase db push` against the linked project). The deploy workflow does **not** do this.
3. Merge the stack to `main`, then run `production-deploy` for the exact `main` SHA. Code that calls the new RPCs/columns must never be live before step 2.
4. Verify: `scripts/production-auth-smoke.mjs` with the expected SHA; the Authenticated First-Evidence Canary on the new SHA (first real proof of #606 from Workers egress); a live signed-in invitation accept (#605).
5. Rollback: code via `production-deploy` of the previous SHA. Migrations are additive (new columns, tables, functions, index, triggers), so the old code keeps working against the new schema; no down-migration is needed for rollback.

## Workers Builds

Cloudflare Workers Builds (Git integration) fails on every `main` commit and is not the deploy path. Recommendation: disconnect it in the Cloudflare dashboard so a future accidental success can never deploy around the release gates.
