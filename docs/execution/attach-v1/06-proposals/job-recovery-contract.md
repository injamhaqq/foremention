# Chat06 — job execution and recovery contract (provided to Chat04, Chat08, Chat09, FM-00)

Exact behavior on branch `fm-attach-v1/06-operations`. Answers Chat04's request (PR #563) for run-start idempotency keys, terminal states for failed/cancelled/interrupted runs, and later-cycle scheduling pinned to baseline settings (A14).

## 1. Idempotency keys (run start)

| Path | Key | Effect |
|---|---|---|
| Interactive `POST /api/runs` | `Idempotency-Key` header required (`[A-Za-z0-9:_-]{16,100}`), persisted as `runs.idempotency_key = "<projectId>:<key>"`; plus `active_request_key = "<provider>:<sorted question ids>"` while queued/running | Same key or same active question set → `202 {duplicate:true}` with the existing run; no second reservation/provider call |
| Scheduled occurrence | `measurement-schedule:<scheduleId>:<dueAtISO>:<methodology>:<model>` | One run per occurrence; a pre-dispatch failure releases the key so the next pass can retry that occurrence |
| Queue event | `foremention-run-<runId>` / `foremention-schedule-<runId>` | Inngest de-duplicates the event |
| Function | `idempotency: "event.data.runId"`, concurrency 1 per org, 4 global | One execution per run |
| Provider call | `collect-<provider>-<promptKey>` step, memoized; persistence is a separate step | A replay or retry of persistence never re-calls the paid provider |

## 2. Run states and who may write them

`queued → running → review → (complete | partial)` is the success path. Terminal failure states:

| Final state | `error_summary` | Written by | Capacity |
|---|---|---|---|
| `cancelled` | `Collection was cancelled.` | customer cancel route (owner/admin/analyst) | released if it never started (route RPC for creator; cleanup job idempotently for anyone else) |
| `failed` | provider/circuit/free-only/unpinned reason | collector / `onFailure` after retries | released only if it never started |
| `failed` (interrupted) | `INTERRUPTED_RUN_SUMMARY` = "Collection was interrupted before completion (worker timeout or platform cancellation). No evidence was invented; start a new collection to retry." | platform cancellation (Inngest start 5 m / finish 30 m timeouts, dashboard cancel) and the interrupted-run sweeper (runs active > 140 min, every 3 h) | released only if it never started |

**Invariant (new, tested):** every failure/cancel write is a compare-and-set from `queued|running` (`lib/jobs/run-terminal-settlement.ts`). A run in `review|complete|partial` is never overwritten by a late handler, cancellation or sweeper; a cancel/failure race settles exactly once; capacity release is fenced on `status=queued AND started_at IS NULL` and is completed idempotently by a retried handler. The customer cancel route returns **409** if the collector reached review first.

No new enum value was added (`interrupted` is distinguishable by `error_summary`). If Chat04/Chat05 need a first-class state, FM-00 can add `run_status` value `interrupted` via migration; this branch does not.

## 3. Observation pinning across retries (A14)

- **Model:** pinned once per run in a memoized step (`pin-provider-model`). If deployment configuration changes mid-run, no further provider calls are made (each un-collected question fails `NonRetriable`); answers already collected under the pinned model are kept and the run goes to review as partial-with-failures. A run never mixes two models.
- **Questions/locale:** the run uses its immutable `run_prompt_selections` snapshot (text + locale + market), never live prompt rows.
- **Schedules:** a schedule whose `model_snapshot` differs from the configured model is **held** (not admitted, stays due, `measurement_schedule_model_pin_hold` logged) before any run, quota or budget reservation. Methodology mismatch was already held. Legacy schedules without a snapshot require a configured model.
- **DST / local time:** unchanged `nextScheduleAt` policy (same wall-clock time, fold → earlier, gap → shifted forward, month-end clamp); new **bounded catch-up**: an overdue schedule is collected once, then jumps to the first future occurrence (`nextFutureScheduleAt`) instead of one paid run per missed period; skips are logged.

## 4. Retries, bounds and quotas (unchanged, verified)

Provider retries 2 (3 attempts), 45 s timeout, 1,200 output tokens, max 10 questions, one provider, $0.50/run and $5/org-month Groq guards (Chat01 owns the guard code), circuit opens after failures across 3 runs in 15 min. The circuit-open path is now replay-safe (memoized, conflict-tolerant exclusion rows); previously a replay hit the unique attempt key and failed the function.

## 5. Notifications and delivery

- In-app notifications: unique `(organization_id, user_id, event_key)`; `run_ready:<runId>` / `run_failed:<runId>`. A run that reaches review no longer receives a false `run_failed` from a late `onFailure`.
- Email: unique delivery ledger; stable Resend `Idempotency-Key` `foremention-alert:<deliveryUUID>`; ambiguous provider outcome stays `pending` + `delivery_outcome_uncertain`, never auto-replayed; links restricted to same-origin `/app` routes; preferences/unsubscribe checked before reservation. Weekly digest key is now ISO-week stable (`weekly_digest:<org>:<project>:<Monday>`), so a retry or re-run in the same week cannot send twice.
- Outbound webhooks (A13): unchanged and **off** unless `WEBHOOK_SIGNING_SECRET`, the egress allowlist and `WORKSPACE_WEBHOOK_ATOMIC_CLAIMS_ENABLED=1` are all set; DNS public-host check before claim, `redirect: "error"`, 90 s fenced lease, receivers must de-duplicate the event `id`.

## 6. What consumers should test (Chat09)

Use `tests/06-support/fake-postgrest.mjs` + `tests/06-support/inngest-replay.mjs` as reference harnesses; real acceptance needs a disposable Supabase + Inngest dev server: cancel-vs-review race (expect 409, review preserved), Inngest finish-timeout (expect failed/interrupted, never-started capacity released), sweeper on a seeded stale run, model env change between two questions (expect 1 answer + failures, single model), overdue schedule (expect one run, future `next_run_at`).
