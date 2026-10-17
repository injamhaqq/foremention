# FM-07 — Account activation and cohort timestamp integrity

**Checkpoint:** 2026-10-10. **Base main:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
**Owner:** FM-07. **Merge/release authority:** FM-00. **Stage:** bounded, synthetic regression tests; no real customer impact claimed.

## Why this is a correctness defect

The first-party PMF metric implementation in `lib/pmf-metrics.ts` treated six independent *non-null* timestamps as completed activation. The monthly cohort implementation in `lib/pmf-cohorts.ts` grouped a record by `firstActionAssignedAt` whenever the earlier timestamps were non-null. As a result, an event in the future, or an action created before review, could be counted as already activated; malformed facts could also inflate second-cycle and partner-conversion rates. A record being present is not sufficient evidence it happened in valid causal workflow order.

No real eligible account cohort was established in the FM-07 Oct 9 production observation: the classification ledger had 0 rows for 11 organizations. **This change does not claim any real counts were previously inflated.** It prevents overcounting if/when real first-party evidence is loaded into the calculator.

## New fail-closed contract

- `lib/pmf-activation-boundary.ts` centralizes activation chronology: known account-creation time (when provided) → workspace setup → five questions approved → first measurement → first human review → action created → action assigned. Same-time milestones are allowed; backwards or after-as-of times are excluded.
- `lib/pmf-metrics.ts` uses this contract; first reviewed records must not predate first measurement, action creation must not predate review, and comparisons must occur after activation by the as-of timestamp. Future-dated acceptance and payment cannot count as completed design-partner conversion. Unobserved durations are never promoted to a zero median.
- `lib/pmf-cohorts.ts` shares the exact activation boundary, so direct activation percentage and monthly activation cohort membership cannot disagree merely due to reversed or future timestamps.
- Seven new synthetic regression tests cover valid facts, reverse order, future steps, pre-activation second cycles, invalid partner payment chronology, cohort exclusion and five-case duration samples.

## Intentional limits / release conditions

- No real billing, partner acceptance, human review, data collection or customer retention was inferred; `includedInCompanyKpis` must still be a verified first-party classification from company-controlled records.
- Caller-provided `secondComparableCycleAt` must originate from a separately validated exact comparable human-reviewed cycle. This module does **not** establish comparability or fabricate second-cycle time.
- Caller inputs represent one row per stable organization; duplicate organization-level facts and ambiguous event lineage must be rejected or reconciled upstream, rather than arbitrarily selecting one in this aggregation layer.
- Existing duration median minimum of five valid KPI-eligible observations is preserved; no false precision at tiny samples.
- No Supabase schema/API, PostHog settings, UI, providers, worker, CI workflows, billing, new dependencies, secrets, external calls or production dataset changes.
- FM-00 must review source and exact-head CI, reconcile any newly opened overlapping PR and authorize integration. The submitted draft is not a release or proof of commercial activation.

## CI acceptance

```bash
node --experimental-strip-types --test tests/fm07-pmf-temporal-integrity.test.mjs
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Full exact-commit release checks, including browser/authenticated journey and security, must pass before FM-00 considers a merge. The original event-level ledger and invoices remain authoritative over this derived synthetic-account metric function.
