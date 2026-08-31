# Foremention — Billion-Dollar Build 01: PMF + Wedge + Activation + Retention

Status: implementation candidate on `build/billion-dollar-01-pmf-retention` / PR #171. This handoff separates repository facts from market hypotheses and does not invent customer proof.

## Exact starting state

- Repository: `injamhaqq/foremention`
- Exact starting `main` SHA: `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`
- Scoped branch: `build/billion-dollar-01-pmf-retention`
- Pull request: #171, **Build PMF activation + customer proof contract**
- Recent merged work inspected before implementation: #166 Retention Loop v1, #169 product compression/commercial readiness, #170 responsive canonical-brand acceptance proof.
- Open PRs were inspected before branching; this work does not absorb unrelated dependency/release/hardening work.

## Locked constitution preserved

- Category remains **Recommendation Intelligence**.
- Primary signed-in IA remains **Attention, Questions, Records, Comparisons, Settings**.
- Recommendation Record remains the canonical inspectable object.
- Evidence inspection stays inside Recommendation Records; do not resurrect standalone Source X-Ray.
- Evidence semantics remain **Returned → Retrieved → Observed → Reviewed → Safe Conclusion**.
- Human review remains a real decision boundary.
- Exact comparability remains strict across buyer-question fingerprint, provider, exact model, methodology, locale, and market.
- Auth/authz, Supabase RLS, tenant isolation, provider boundaries, Inngest orchestration, cost controls, and analytics privacy remain intact.
- Canonical Foremention logo and black/graphite + registered-green identity remain intact.
- Homepage/brand were not redesigned.
- No customers, usage, benchmarks, prices, ROI, certifications, revenue, or traction were fabricated.

## What already existed at the starting SHA

### Product and journey

- Five canonical signed-in workspace objects were already in place.
- Recommendation Records already carried inspectable evidence and the human-review boundary.
- Questions, collection runs, comparisons, actions/placements, settings, schedules, sharing, and team mechanics already existed.
- Design-partner application intake already existed and was trusted-server/service-role controlled.

### Retention engine

- `lib/retention-loop.ts` already derived Attention items, comparable changes, due-action reminders, and activation guidance.
- Recurring measurement already used the schedule/Inngest architecture.
- Safe comparison already withheld movement when terminal human review or exact comparability was missing.
- Reviewed-change notifications already used event-level idempotency/dedupe and avoided causal claims.
- Workspace email alerts already honored opt-in/unsubscribe and duplicate-delivery suppression.
- Safe weekly intelligence already surfaced reviewed longitudinal movement when an eligible comparison existed.

### Analytics and privacy

- Product analytics already had a privacy-safe event contract and safe milestone events.
- Raw commercial/contact PII was already outside the product analytics contract.
- Historical `activation_completed` event semantics are deliberately not redefined here, because silently changing an existing event would make its time series incomparable. The canonical PMF activation metric below is an account-level contract requiring all six activation boundaries.

### Customer proof

`20260818000100_company_customer_proof.sql` already supplied the correct foundation:

- organization classifications distinguish `unknown`, `internal`, `synthetic`, `benchmark`, `design_partner`, and `customer`;
- only explicitly eligible real external organizations may enter company KPIs;
- commercial accounts, protected contacts, opportunities, verified payment/renewal/expansion/churn events, lost reasons, and real-zero scorecards existed;
- RLS was enabled and browser roles had no direct access; service role remained the operator boundary;
- no customer/revenue rows were seeded;
- aggregate time-to-value was already withheld below the real minimum sample threshold.

The separate design-partner application table also already existed with trusted-server insertion and no public table policy.

## What was missing

1. The visible activation journey had seven states rather than the required eight.
2. `first_action` jumped directly to the second comparable cycle instead of proving an action owner.
3. Attention checked action existence but not persisted `owner_id`.
4. There was no single canonical account-level definition/derivation module for the required PMF metrics.
5. Activation-cohort retention rules were not encoded in a reusable fail-closed derivation.
6. Retention health existed implicitly in product signals but not as a transparent customer-visible state.
7. The existing customer-proof ledger did not classify interviews, objections, feature requests, validated use cases, referrals, and explicit lost-deal research events.
8. Design-partner applications had no optional first-party link into the existing commercial account ledger.

## Exact wedge — Hypothesis vs validated fact

### Validated product/repository facts

Foremention can preserve exact buyer-question/provider/model/methodology measurement context; keep Recommendation Records with inspectable returned/retrieved/observed/reviewed evidence; enforce human review and exact-comparability gates; store action owners and remeasurement timing; schedule recurring measurements; and retain first-party commercial/customer-proof records behind service-role boundaries.

### No customer evidence yet

**No customer evidence was found in the repository that is sufficient to validate the ICP, economic buyer, willingness-to-pay, retention, conversion, ROI, or category-demand hypotheses below.** Product/schema capabilities are implementation facts. Market claims remain hypotheses until first-party interviews, opportunities, payments, renewals, expansions, referrals, churn, and cohort behavior prove them.

| Element | Current hypothesis | Validation required |
| --- | --- | --- |
| Primary ICP | English-language growth-stage B2B software companies where AI-mediated buyer recommendations may affect category discovery/shortlisting and a marketing team can act on evidence. | Real interviews, pipeline evidence, activation, and second-cycle cohorts. |
| Economic buyer | VP/Head of Marketing or CMO depending on company size. | Opportunity role + verified authority + won/lost reason. |
| Champion | Product Marketing, Growth, SEO/Organic, or another marketing operator responsible for buyer visibility and competitive response. | Usage/interview evidence and sustained workflow ownership. |
| Urgent problem | Teams cannot reliably know what AI-mediated buyers are shown for priority buying questions, what inspected evidence supports it, what changed, or what owned action should be remeasured. | Repeated interview pain + fast activation + repeat cycles. |
| Trigger event | Category/repositioning launch, competitor movement, executive request for recommendation evidence, new-market launch, or visibility-prioritization need. | First-party event/reason evidence. |
| First use case | Configure → five approved buyer questions → real measurement → reviewed Recommendation Record → one evidence-backed action → owner. | Activation and time to first value. |
| Recurring use case | Exact-comparable remeasurement after owned actions; inspect what changed, improved/worsened where evidence permits, competitor/evidence movement, then decide again. | Second-cycle rate, time to second cycle, WAU/MAU accounts, retention. |
| Why now | AI-mediated buyer discovery may be important enough that growth teams need a repeatable evidence workflow rather than occasional manual checks. | Customer urgency and budget evidence. |
| Why Foremention | Hypothesized differentiation: inspectable Recommendation Records + human review + exact comparability + owner + schedule + longitudinal remeasurement. | Win/loss and continued-use evidence. |
| Why pay | Buyers may pay to reduce uncertainty and turn recommendation evidence into accountable follow-through. | Verified payment/pilot evidence only. |
| Why continue paying | Change detection, owned follow-through, remeasurement, longitudinal history, and team decision support may create recurring value. | Renewals, expansions, retained cohorts, referrals, churn reasons. |
| Primary competitive alternative | Manual ChatGPT/assistant checks plus spreadsheets/docs; secondarily generic AI-visibility dashboards or ad-hoc PMM/SEO research. | Alternative-used and win/loss evidence. |
| Why ChatGPT + spreadsheets may be insufficient | Manual work does not inherently guarantee stable question/provider/model/methodology snapshots, inspected evidence provenance, review boundaries, exact comparability, owner/reminder orchestration, deduped alerts, tenant isolation, or an audit-ready longitudinal record. | Confirm which differences customers value enough to pay for. |

## Canonical customer journey

**Configure → 5 approved buyer questions → live run → Recommendation Record → evidence review → action → owner → comparable remeasurement → decision**

The eight-stage state machine is:

1. `workspace_configured`
2. `five_questions`
3. `first_record` — first real measurement / Recommendation Record
4. `first_review` — human-review boundary
5. `first_action`
6. `action_assigned` — persisted owner required
7. `second_comparable_cycle`
8. `retained_loop`

Stages 1–6 define canonical activation. Stages 7–8 are retention outcomes.

## What this branch built

### Activation + customer-facing next step

- `lib/retention-loop.ts` now contains the exact eight-stage path.
- A created action cannot advance past the ownership boundary until `firstActionAssigned` is true.
- `app/api/retention/attention/route.ts` reads organization-scoped `placements.owner_id`, derives action ownership, and returns the next activation stage.
- `components/retention-surface-bridge.tsx` keeps the existing visible **Next best step** and now renders the transparent **Retention health** state on Attention rather than discarding it.

### Transparent retention health

`lib/retention-health.ts` implements a rule-based state machine rather than an opaque score:

- `not_activated`
- `waiting_for_second_cycle`
- `needs_schedule`
- `at_risk` when owned work is overdue
- `healthy` when activation, second comparable cycle, recurring schedule, and overdue-action conditions are satisfied

The Attention surface renders the label/reason and exposes the inspectable `data-retention-health` state. No proprietary numerical health score is invented.

### Canonical PMF metric contract

`lib/pmf-metrics.ts` defines/derives the required metrics from caller-supplied first-party account facts only. Missing evidence/denominators return `insufficient_data`.

- **Activation rate** — KPI-eligible accounts completing all six activation boundaries / all KPI-eligible accounts in the cohort.
- **First-record-review rate** — first reviewed Recommendation Record / first real measurement.
- **Action creation rate** — action created after first review / first review.
- **Second-cycle rate** — activated accounts with second exact-comparable reviewed cycle / activated accounts.
- **WAU accounts** — distinct KPI-eligible accounts with meaningful product activity in trailing 7 days.
- **MAU accounts** — distinct KPI-eligible accounts with meaningful product activity in trailing 30 days.
- **Retained account rate** — prior-30-day active accounts also active in current trailing 30 days / prior-30-day active accounts.
- **Time to first value** — median account creation → first human-reviewed Recommendation Record, withheld until at least five real observations.
- **Time to second cycle** — median first real measurement → second exact-comparable reviewed cycle, withheld until at least five real observations.
- **Design-partner conversion** — accepted design partners becoming verified paying accounts / accepted design partners.
- **Paid conversion** — activated accounts with verified billing/payment / activated accounts, only after real billing evidence exists.

A checkout button, price configuration, or application submission never counts as payment.

### Cohort retention

`lib/pmf-cohorts.ts` groups only KPI-eligible accounts by the month they complete all six activation boundaries. Next-month retention remains `null` until the full next calendar month closes; immature cohorts are never mislabeled as zero retention.

### Customer-proof research extension

`supabase/migrations/20260830000300_customer_proof_research_events.sql` extends the existing truth store rather than creating a parallel one.

It adds an optional unique `design_partner_application_id` link to `commercial_accounts` and expands `commercial_events` to cover:

- `customer_interview`
- `objection_recorded`
- `lost_deal_recorded`
- `feature_request_recorded`
- `use_case_validated`
- `referral_verified`
- existing verified payment, renewal, expansion, and churn event types remain preserved

The tables remain service-role-only/RLS-protected and the migration seeds no customer proof.

## Retention coverage

| Requirement | State |
| --- | --- |
| Next-cycle scheduling | Existing schedule + Inngest path preserved. |
| Meaningful-change alerts | Existing reviewed/exact-comparable path preserved. |
| What changed | Existing recommendation-presence, competitor-set, and citation-set changes preserved. |
| What worsened / improved | Reviewed direction can be shown when evidence supports it; no causal claim is added. |
| Competitor movement | Existing exact-comparable appearance/disappearance logic preserved. |
| Evidence changes | Existing citation-set change logic preserved. |
| Overdue reminders | Existing due-action Attention path preserved and included in retention health. |
| Weekly/monthly return triggers | Existing recurring schedules + weekly intelligence/email preferences preserved. |
| Longitudinal timeline | Existing run/comparison/Recommendation Record history preserved. |
| Retention health | Built and rendered on Attention. |
| Comparison eligibility | Existing human-review + exact-comparability gate preserved. |
| Alert-fatigue controls | Event-key dedupe, eligibility gate, opt-in preferences/unsubscribe, duplicate-delivery suppression preserved. |

## Customer-proof coverage

The internal model can represent, without fabricating values: design partners, activated KPI-eligible organizations, verified paying accounts, renewals, expansions, referrals, churn, interviews, objections, lost deals, feature requests, validated use cases, time to first value, time to second cycle, rolling retention, and activation-cohort retention.

If no real records exist, the correct output is no data / `insufficient_data`.

## Files changed

- `lib/retention-loop.ts`
- `lib/retention-health.ts`
- `lib/pmf-metrics.ts`
- `lib/pmf-cohorts.ts`
- `app/api/retention/attention/route.ts`
- `components/retention-surface-bridge.tsx`
- `supabase/migrations/20260830000300_customer_proof_research_events.sql`
- `tests/retention-loop-activation.test.mjs`
- `tests/retention-loop-contract.test.mjs`
- `tests/pmf-metrics.test.mjs`
- `tests/billion-dollar-pmf-retention.test.mjs`
- `docs/billion-dollar-build/01-pmf-retention.md`

## TDD + QA contract

Material behavioral tests were written/extended before the matching implementation for the missing action-assigned boundary, ownership/human-review non-skipping, retention-health states, customer-visible retention health, fail-closed PMF metrics, all six activation boundaries, verified-billing paid conversion, cohort maturity, and customer-proof extension.

Repository-native PR verification must cover:

- isolated Supabase migration replay + `scripts/verify-company-migrations.sql`;
- `pnpm test`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm build`;
- Cloudflare Worker dry run;
- Browser Acceptance;
- zoom/reflow checks;
- canonical-brand visual proof;
- accessibility checks;
- Lighthouse assertions;
- Security;
- CodeQL;
- exact candidate SHA verification against unchanged starting `main`.

Do not treat queued/in-progress workflows as passing.

## Remaining blockers / intentional boundaries

1. **No production customer counts are asserted.** The repository audit did not inspect a production customer database, so activated customers, paying customers, retention, churn, and conversion values remain unknown here.
2. **No customer-facing founder/operator commercial back office was added.** Commercial/customer-discovery records remain service-role-only because exposing them through normal customer browser auth would weaken the privacy boundary.
3. **Metric definitions and pure derivations are implemented, but a trusted production aggregation job/API is not fabricated.** A service-only mapping can later feed verified organization facts into the metric contract.
4. **Paid conversion remains unavailable until verified billing/payment evidence exists.**
5. **The wedge remains a hypothesis until first-party design-partner/customer proof validates it.**
6. **Observed before/after movement is observational, not causal proof.**

## Decisions next chats must preserve

- Do not restart architecture or re-open the five-object IA without new evidence.
- Do not create a second customer-proof or analytics truth store.
- Do not silently redefine historical analytics events.
- Keep activation account-level and privacy-safe.
- Keep the first workflow narrow: five approved questions, one real baseline, one reviewed Recommendation Record, one owned action, one exact-comparable remeasurement.
- Treat second-cycle completion and retained workflow as the early PMF retention test.
- Keep customer-discovery data first-party/service-only; do not send raw interview/contact/commercial text to PostHog.
- Keep `insufficient_data` as an honest state.
- Do not report paid conversion, ROI, retention, or traction without verified evidence.
