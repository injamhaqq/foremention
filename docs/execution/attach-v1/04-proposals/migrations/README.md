# Chat04 migration proposal — customer value loop persistence (CV-05 / A15 / A14)

**File:** `20261013140000_chat04_customer_value_loop_persistence.proposal.sql` — a reviewed **proposal** for FM-00. Chat04 does not write to `supabase/migrations/` (FM-00 owns shared migrations). Adoption = copy unchanged to `supabase/migrations/20261013140000_chat04_customer_value_loop_persistence.sql`.

| Part | What | Callers (Chat04-owned, already on this branch) |
|---|---|---|
| 1 | `project_question_set_versions` epoch per project, bumped by trigger on any change to the active question set | `app/api/customer-value-loop/route.ts` |
| 2 | `runs.question_set_version` (stamped at insert, immutable), `runs.cycle_origin` (`customer_cycle` for signed-in member runs; service-role writers must declare it, else NULL = unknown) | `lib/customer-value-loop-snapshot.ts` |
| 3 | `run_answers.observation_method`, `run_answers.sampling_json` derived only from `raw_json` (`observationMethod`, `sampling`) | same |
| 4 | `record_decisions` + `save_record_decision` (idempotent by `save_key`) + `complete_record_decision_action` | `app/api/records/[id]/decision/route.ts`, `lib/record-decisions.ts` |

Not included: zero-question `setup_only` (FM-00 deferred until the founder wants it; 1–5 questions stays enforced). Existing `change_specifications` lifecycle is untouched; a decision may link one via `change_specification_id`.

Until FM-00 applies it, the callers answer **503 `decision_persistence_pending`** (unknown table/RPC/column) — never a fake save.

## Validation (disposable PGlite 0.5.9, outside the lockfile, never production)

Harness: Chat02's `docs/execution/attach-v1/02-proposals/rls-replay/replay.mjs` (Supabase auth/role shim), with `@electric-sql/pglite` installed in a scratch directory.

```bash
CHAT04_PROPOSAL=$PWD/docs/execution/attach-v1/04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql \
  node replay.mjs <repo-or-composed-tree> $PWD/docs/execution/attach-v1/04-proposals/migrations/chat04-probe.mjs
```

Results recorded 2026-10-13 (`chat04-probe-result-*.json`): branch-04 tree 97/97 + probe **17/17**; composed `fm-attach-v1/00-coordinator@327237d6` tree 99/99 + probe **17/17**; proposal copied into the migrations dir: 04 tree **98/98**, composed **100/100**; Chat02 RLS probe on composed + proposal **10/10**. Fidelity limit: PGlite is Postgres 18 with a shim; CI uses Supabase-local Postgres 15, production 17.6 — a Postgres-17 replay on a disposable Supabase project is still required before production.
