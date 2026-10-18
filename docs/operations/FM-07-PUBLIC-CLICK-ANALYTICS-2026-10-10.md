# FM-07 public click taxonomy — 2026-10-10

**Base:** `main@d4fea60a7bb8e047f2282cea9134121e9496c67e`.
**Owner:** FM-07; **integrator:** FM-00. **Related:** [#475](https://github.com/injamhaqq/foremention/issues/475), draft [#483](https://github.com/injamhaqq/foremention/pull/483).
**Status:** verification pending, no deployment/merge or live PostHog modification.

## Verified source defect and minimal correction

`components/public-activation-analytics.tsx` calls `captureProductEvent("sample_opened")` and `captureProductEvent("evidence_inspected")` for `data-public-sample-open` and `data-public-evidence-inspect` click surfaces. The production `sanitizeProductAnalyticsEvent` rejects those unknown names: both analytics observations are silently lost. `publicSurface("/use-cases")` returns `use_cases`, which the finite allowlist also discards.

The contract now maps the **existing emitter aliases**, without changing FM-03 components:
- `sample_opened` → `public_sample_cta_clicked`;
- `evidence_inspected` → `public_evidence_inspection_cta_clicked`.

These are **click-only** events: they must never be used as proof that a sample was evaluated, evidence was retrieved, a human completed an inspection, a recommendation was reviewed, or a product workflow was activated. The normal `evidence_inspection_opened` and `evidence_review_completed` meanings remain distinct. Each canonical event accepts only an allowlisted finite `surface` dimension, including `use_cases`; raw URLs, user IDs, full form fields, answers, emails and arbitrary client keys are discarded.

## Verification and conflict boundary

- New `tests/fm07-public-click-contract.test.mjs` exercises both aliases against **real sanitizer code**, checks clean finite properties and protects legacy emitters without manipulating the UI.
- Only `lib/product-analytics-contract.ts`, the new test and this document change. No Supabase or PostHog production writes, analytics service setup, tag changes, API/public UI modifications, package, workflow or secrets changes.
- **Known exact-path overlap:** draft [#448](https://github.com/injamhaqq/foremention/pull/448) adds `omniroute` to the same contract's provider enum; it does **not** change these click-specific hunks. FM-00 must reconcile it by explicit merge/cherry-pick and rerun exact-head checks. The independently reviewed [#440](https://github.com/injamhaqq/foremention/pull/440), [#491](https://github.com/injamhaqq/foremention/pull/491) and [#492](https://github.com/injamhaqq/foremention/pull/492) own overlapping public UI paths; none are modified.
- **Nonclaims:** A passing contract test does not prove browser SDK delivery in live production, external visitor conversion or a valid design-partner submission. PostHog project scope, cookie/privacy consent and ingest settings must remain subject to owner policy. Accurate authoritative application/paying-customer counts still come from first-party evidence and remain an unresolved part of #475. Browser-origin `design_partner_application_submitted` continues blocked by independently green draft #483.

## FM-00 acceptance conditions

1. Review contract allowlist, event semantics and strict property sanitization.
2. Verify exact-head tests, full CI, CodeQL, browser and authenticated journeys. No production write.
3. Integrate after reconciling #448 provider enum and any meanwhile changed main branch; only FM-00 may authorize merge/deploy with founder approval.
4. After release, verify on controlled test traffic that named events are *actually ingested*, label test traffic and exclude it from customer acquisition and activation reports.
