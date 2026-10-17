# Chat 03 — Repeat / Comparability implementation candidate

Batch: fm360-20261016. Scope: FM-AUD-02, FM-AUD-03, FM-AUD-13.
Status: IMPLEMENTED IN ISOLATED BRANCH — NOT RELEASE-VERIFIED.
Base: 6bf8bfda6ec0573dbbf432b831eff45688f8f47b. No live schedule, trial, payment, or provider mutation.

## Code changes
- Run creation does not create an early auto-schedule while the baseline is queued.
- After human review, only a fully complete baseline with full verified answer count, exact recorded model/provider, question identity and nine measurement-context keys creates a schedule.
- New automatic schedule records its origin, baseline, original trial expiry, actual model/method and versioned question pins. Existing disabled/manual/legacy rows are untouched.
- Trial first follow-up targets 72 hours after the completed baseline, never sooner than 24 hours, and leaves a two-hour expiry buffer. When impossible, returns an explicit no-schedule reason rather than extending or borrowing entitlements.
- A new additive migration identifies legacy unknown rows, prevents direct browser forging of schedule/run provenance and persists originating schedule ID on queued runs.
- Manual scheduling is an explicit form submission, pins a configured exact model, and is routed through server-validated service-role insertion. Legacy null-model manual schedules remain held.
- Dispatcher rejects unknown origin/pins, model drift, entitlement downgrade, expired trial and changed question context before provider cost reservation; it preserves terminal occurrence idempotency keys.
- Collection worker rechecks schedule/entitlement at start AND immediately before each new provider call, preventing delayed event replay after authorized expiry.
- Comparison page's verified pair backend withholds partial-run movement. Stochastic model text variance alone is not a mismatch; unknown method/settings should remain disclosed and not described as causal effect.

## Verification
Local pure-policy fixture: 12/12 PASS (Node 22.16.0, no provider calls).
Local isolated review-hook mock: 5/5 PASS; this was exercised against a locally authored equivalent helper, not an exact GitHub checkout.
Additional dispatcher fixture cases committed but NOT independently executed against the full repository.
NO full pnpm tests, lint, strict TS typecheck, migration replay, live RLS, exact-sha CI, browser checks, paid-provider proof or production verification performed. The container cannot clone the repository (DNS access unavailable).
Do not merge/deploy until those receipts pass on the exact PR head, migration goes through Chat 01, and Chat 06 confirms shared quota/billing semantics.

## Known limitations / release blockers
1. Existing historical trial schedules are not repaired in place. They default to legacy_unknown and will be held, not silently reactivated. The four historical rows observed October 15 were NOT independently rechecked live on October 16.
2. We have not implemented a complete durable UI for every held reason. Chat 07 must surface schedule state, next action and trial-expiry text.
3. Exact sampling/temperature/seed and provider-side model revision are not universally captured. This change does not claim complete experimental comparability or causal uplift from before/after changes. Chat 02 must capture actual settings where available before such precision is sold.
4. Atomic quota/budget reserve remains the existing RPC; row idempotency keys, event identity and conditioned schedule advancement remain existing infrastructure. A full isolated duplicate-cron and worker interruption test is a hard release gate.
5. The early trial follow-up is an initial observation interval, NOT a literal seven-day weekly gap. Public copy requires approval and must not promise the latter within the same 7-day entitlement.

## Exact customer statuses
BASELINE_INCOMPLETE; BASELINE_UNKNOWN_CONTRACT; TRIAL_NOT_ACTIVE;
TRIAL_WINDOW_TOO_SHORT; TRIAL_WINDOW_EXPIRED; ENTITLEMENT_UNKNOWN;
ENTITLEMENT_CHANGED; CAPACITY_UNAVAILABLE; CONTRACT_NOT_PINNED;
USER_PAUSED; QUESTION_CONTEXT_CHANGED; SCHEDULE_PERSISTENCE_FAILED;
SCHEDULED_RUN_NOT_BASELINE; EXISTING_SCHEDULE.

## Rollback / next action
Do not delete historical schedules, evidence or billable observations.
Rollback only a verified previous Worker release; retain additive columns and
reconcile old/new schedule rows forward. Chat 01 reviews executable migration
and type/schema ownership before any merge. Chat 06 validates entitlement and
atomic reservation. Chat 07 owns truthful customer-facing copy and held-status UI.
Run current exact-head CI + isolated Supabase migration/RLS replay and tenant-safe
end-to-end review->scheduled follow-up->expiry fixtures before promoting the PR.
