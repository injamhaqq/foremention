# Outcome Ledger independent context gate — 28 September 2026

## Why this is a product blocker

Foremention cannot credibly differentiate on decision evidence if an Outcome Ledger card reports a completed, comparable improvement based only on the current production Resolution trigger's narrower comparison criteria. Issue #351 documents that the production trigger does not yet validate all nine material fields in `run_answers.measurement_context_json`; the staged forward database correction is PR #352, still blocked on the production migration-lineage and backup gates in #332/#354.

This change is **read-only application defense-in-depth** on top of draft strategic PR #356. It does **not** apply the database correction, update historical rows, repair migration history, approve commercial retrieval rights, or make a live customer pilot ready.

## Exact customer-facing rule

For each persisted `complete` follow-up, before reporting any directional change in either the Outcome Ledger or the board-ready export:

1. Independently re-read the actual baseline and later run identities from the current authenticated, project-scoped workspace.
2. Require distinct finalized runs with the same nonempty methodology version.
3. Fetch only the six minimal provenance fields from **verified answer rows**: run identity, question key/text, provider, exact model, and persisted material measurement context. Do not fetch answer bodies, citation content or customer secrets for this gate.
4. Require a complete verified answer set matching each run's persisted `answer_count` and reject duplicate question/provider slots.
5. Reuse `assessExactQuestionComparability()` to compare exact persisted question text, provider, model, locale, market, buyer stage, prompt version, parser version, retrieval version, policy version, schema version and evaluation version.
6. Ensure the follow-up baseline matches the resolution asset's own baseline and the read is bounded: batches of ten scoped runs, 1000-response cutoff. If a read is saturated or metadata is missing, report **incomparable / withheld**, not eligible movement.

The second layer cannot confer trust if the first database layer remains weak: **both must eventually agree**, with release proof against PR #352's trigger and isolated authenticated second-cycle acceptance PR #353.

## Full-chain reporting correction

A “complete inspectable chain” additionally requires an actually linked customer-owned Change Specification, `applied` status and nonempty recorded execution reference. A legacy approved resolution without its parent decision is not complete proof.

## Verification strategy

The deterministic tests cover all nine context mutations, changed question/model/provider, missing/partial verified answers, duplicate slots, methodology changes, unreadable/not-finalized runs, oversized reads, stored-outcome suppression, mismatched resolution baselines, synthetic positive pairs, legacy incomplete chains, tenant-scope query contracts and export/page alignment.

For release acceptance, require exact-head CI/build/security/browser gates. Then test in a **disposable environment with an authenticated synthetic workspace** and compare before/after states. Never use the unresolved old synthetic canary password. Database release remains blocked pending founder-controlled secure credential rotation (#323), retrieval/data-retention rights (#346), genuine source relevance (#345), a privately preserved production SQL ledger with tested staging restore (#332), and a separately authorized forward-only migration (#351).

## Current limitations

- This is a read-side fail-closed additional check. It does not repair underlying production trigger logic or guarantee tenants cannot bypass business validations through other read/write surfaces.
- The independent read is intentionally conservative: historical rows missing any version field, partially verified answers, or datasets beyond the bounded read remain incomparable even if some aggregate database record was finalized.
- A comparable before-and-after observation is **not** evidence of causation, revenue or decision quality. Commercial value still requires real external design-partner confirmation.
- Query permissions continue to rely on existing PostgREST object grants + RLS and the signed-in viewer's token. The code does not elevate to the service role.
