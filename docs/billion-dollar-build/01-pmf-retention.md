# Foremention — Billion-Dollar Build 01: PMF + Wedge + Activation + Retention

Status: implementation candidate on `build/billion-dollar-01-pmf-retention` / PR #171. This document distinguishes code/repository facts from market hypotheses. It does not claim customer traction that is not present in first-party evidence.

## 1. Exact starting state

- Repository: `injamhaqq/foremention`
- Exact starting `main` SHA: `df92e0eb78edda5c8c621bb1388c5b519b8da1e8`
- Scoped branch: `build/billion-dollar-01-pmf-retention`
- Pull request: #171, **Build PMF activation + customer proof contract**
- Recent merged work inspected before implementation included PR #166 (Retention Loop v1), PR #169 (product compression/commercial readiness), and PR #170 (responsive canonical-brand acceptance proof).
- Open PRs were inspected before this branch was created; this work intentionally does not absorb or rewrite unrelated open dependency/release/hardening PRs.

## 2. Locked constitution preserved

This branch does not change the company category, brand, homepage, canonical logo, primary signed-in information architecture, Recommendation Record model, evidence lifecycle, or core platform boundaries.

The next chats must preserve:

- Category: **Recommendation Intelligence**.
- Primary signed-in IA: **Attention, Questions, Records, Comparisons, Settings**.
- Recommendation Record remains the canonical inspectable object.
- Evidence inspection belongs to Recommendation Records; do not resurrect standalone Source X-Ray.
- Evidence semantics remain **Returned → Retrieved → Observed → Reviewed → Safe Conclusion**.
- Human review remains a real boundary before a safe decision or movement claim.
- Exact comparability remains strict across the buyer question fingerprint, provider, exact model, methodology, locale, and market.
- Authentication, authorization, Supabase RLS, tenant isolation, provider boundaries, Inngest orchestration, spend/cost controls, and analytics privacy remain intact.
- Canonical black/graphite + registered-green Foremention identity remains intact.
- No customer, usage, benchmark, price, ROI, certification, revenue, or traction data is fabricated.

## 3. What already existed at the starting SHA

The live repository was already materially ahead of a blank PMF build. The correct move was to extend the existing architecture rather than create parallel systems.

### Product and journey

- The workspace had already been compressed to the five canonical signed-in objects.
- Recommendation Records already carried inspectable evidence and the human-review boundary.
- Questions, measurement runs, comparisons, actions/placements, settings, schedules, sharing, and team mechanics already existed.
- Design-partner application intake already existed and was server/service-role controlled.

### Retention engine

- `lib/retention-loop.ts` already derived Attention items, comparable changes, due-action reminders, and a next-step activation state.
- Measurement scheduling already supported recurring cycles through the existing schedule/Inngest architecture.
- Safe comparison logic already withheld movement when exact-comparability or terminal human-review requirements were not met.
- Reviewed-change notifications already used event-level idempotency/deduplication and avoided causal claims.
- Workspace email alerts already respected opt-in preference/unsubscribe behavior and delivery deduplication.
- Safe weekly intelligence already surfaced reviewed longitudinal movement when an eligible comparison existed.

### Analytics and privacy

- Product analytics already had a privacy-safe event contract and milestone events.
- Raw commercial/contact PII was already kept out of customer analytics surfaces.
- This branch does **not** change the meaning of the historical `activation_completed` analytics event. Changing historical semantics in-place would make existing event series incomparable. The canonical PMF activation definition introduced here is a separate account-level metric contract and requires all stages through action ownership.

### Customer proof

`20260818000100_company_customer_proof.sql` already provided a strong founder/operator proof foundation:

- explicit organization classifications separate `internal`, `synthetic`, `benchmark`, `design_partner`, and `customer` organizations;
- only explicitly eligible real external organizations may enter company KPIs;
- commercial accounts, protected contacts, opportunities, verified payment/renewal/expansion/churn events, lost-reason taxonomy, and real-zero scorecards already existed;
- RLS is enabled and browser roles have no direct access; the system is service-role only;
- no customer/revenue rows are seeded;
- aggregate time-to-value was already withheld below a minimum real sample threshold.

The separate design-partner application table already existed, with no public table policy and trusted-server insertion only.

## 4. Gap analysis found before implementation

The main product gap was precise and measurable:

1. The visible activation journey had seven states, not the required eight.
2. `first_action` jumped directly to the second comparable cycle. It did not prove an accountable owner existed.
3. Attention queried whether an action existed, but did not derive ownership from persisted action state.
4. There was no single canonical account-level definition module for the required PMF metrics.
5. Cohort retention rules were not encoded in a reusable, fail-closed derivation.
6. Retention health existed implicitly in many product signals but not as one transparent, explainable customer state.
7. The customer-proof ledger already handled commercial lifecycle evidence, but did not yet classify customer interviews, objections, feature requests, validated use cases, referrals, and explicit lost-deal research events.
8. Design-partner applications had no optional first-party link into the existing commercial account ledger.

## 5. Exact wedge — Hypothesis vs validated fact

### Validated product/repository facts

- Foremention can preserve an exact buyer-question/provider/model/methodology context for measurement.
- Recommendation Records can keep inspectable returned/retrieved/observed/reviewed evidence together with safe conclusions.
- Human review and exact-comparability gates exist in code.
- Actions can have owners and remeasurement timing.
- Recurring measurement, Attention, comparison, notifications, and longitudinal product primitives exist.
- First-party commercial/customer-proof tables exist with service-role-only access and real-zero behavior.

### No customer evidence yet

**No customer evidence was found in the repository that is sufficient to validate the ICP, economic buyer, willingness-to-pay, retention, conversion, ROI, or category-demand hypotheses below.** The schemas and product capabilities above are implementation facts. The market claims below remain hypotheses until first-party interviews, opportunities, payments, renewals, expansions, referrals, churn, and cohort behavior are recorded.

### Wedge hypotheses to test with real design partners

| Element | Current hypothesis | Validation required |
| --- | --- | --- |
| Primary ICP | English-language growth-stage B2B software companies where AI-mediated buyer recommendations can materially affect category discovery or shortlisting, and where a marketing team can act on evidence. | Interview and pipeline evidence by company size/stage/use case; activation and second-cycle cohorts. |
| Economic buyer | VP/Head of Marketing or CMO, varying with company size. | Opportunity contact role plus verified buying authority and won/lost reason. |
| Champion | Product Marketing, Growth, SEO/Organic, or another marketing operator responsible for category/buyer visibility and competitive response. | Interview usage, role, activation behavior, and continued ownership of the workflow. |
| Urgent problem | Teams cannot reliably know what AI-mediated buyers are being shown for priority buying questions, what inspected evidence supports it, what changed, and what owned action should be remeasured. | Repeated pain in interviews, fast activation, action creation/ownership, repeat cycles. |
| Trigger event | Category/repositioning launch, competitor movement, executive request for AI recommendation evidence, new-market launch, or a need to prioritize visibility work. | Interview timestamps/reasons and source attribution in first-party commercial events. |
| First use case | Configure → approve five priority buyer questions → real measurement → review one Recommendation Record → create and assign one action. | Time to first value, activation rate, stage-level drop-off. |
| Recurring use case | Exact-comparable remeasurement after owned actions; inspect what improved, worsened, changed in competitors/evidence, then make the next decision. | Second-cycle rate, time to second cycle, WAU/MAU accounts, retained-account and cohort retention. |
| Why now | AI-mediated buyer discovery is hypothesized to be important enough that growth teams need a repeatable evidence workflow rather than occasional manual checks. | Direct customer urgency, budget, alternatives considered, and sales-cycle evidence. |
| Why Foremention | The differentiating workflow hypothesis is the combination of inspectable Recommendation Records, human review, exact comparability, ownership, scheduling, and longitudinal remeasurement. | Win/loss reasons against alternatives and continued use after cycle two. |
| Why pay | Buyers may pay to reduce uncertainty and turn recommendation evidence into an accountable operating workflow. | Verified payment and accepted contract/pilot evidence only. |
| Why continue paying | Ongoing change detection, owned action follow-through, remeasurement, longitudinal history, and team decision support may create recurring value. | Renewals, expansions, retained cohorts, referrals, and churn reasons. |
| Primary competitive alternative | Manual ChatGPT/other assistant checks plus spreadsheets/docs; secondarily generic AI-visibility dashboards or ad-hoc PMM/SEO research. | Interviewed alternative-used fields and opportunity lost reasons. |
| Why ChatGPT + spreadsheets may be insufficient | Manual workflows do not inherently guarantee stable question/provider/model/methodology snapshots, inspected evidence provenance, a human-review boundary, exact-comparability gating, accountable action owners, schedule orchestration, deduped alerting, tenant isolation, or an audit-ready longitudinal record. | Confirm which shortcomings real customers actually care enough about to pay to solve. |

## 6. Canonical customer journey

The product loop is now explicitly modeled as:

**Configure → 5 approved buyer questions → live run → Recommendation Record → evidence review → action → owner → comparable remeasurement → decision**

The activation/retention state machine is:

1. `workspace_configured`
2. `five_questions`
3. `first_record` — first real measurement/Recommendation Record
4. `first_review` — human-review boundary
5. `first_action`
6. `action_assigned` — persisted owner required
7. `second_comparable_cycle`
8. `retained_loop`

Stages 1–6 define activation for the canonical PMF metric. Stages 7–8 are retention outcomes.

## 7. What this branch built

### A. Explicit action-ownership boundary

`lib/retention-loop.ts` now contains the eight-stage journey. A created action cannot advance to the second comparable cycle until an owner exists.

`app/api/retention/attention/route.ts` now reads persisted `placements.owner_id`, derives `firstActionAssigned`, and returns the correct customer-facing next activation step. Existing organization scoping and viewer access-token boundaries are retained.

### B. Transparent retention health

`lib/retention-health.ts` introduces a rule-based state machine rather than an opaque score:

- `not_activated`
- `waiting_for_second_cycle`
- `needs_schedule`
- `at_risk` when owned work is overdue
- `healthy` when activation, second comparable cycle, schedule, and due-action conditions are satisfied

Attention now returns this explainable `retentionHealth` state together with the next activation step.

### C. Canonical PMF metric contract

`lib/pmf-metrics.ts` defines and derives the required account-level metrics from caller-supplied first-party facts only. It has no synthetic fallback.

- **Activation rate** — KPI-eligible accounts completing all six activation boundaries / all KPI-eligible accounts in the measured cohort.
- **First-record-review rate** — accounts with first reviewed Recommendation Record / accounts with first real measurement.
- **Action creation rate** — accounts creating an action after first review / accounts with first review.
- **Second-cycle rate** — activated accounts with second exact-comparable reviewed cycle / activated accounts.
- **WAU accounts** — distinct KPI-eligible accounts with meaningful product activity in the trailing seven days.
- **MAU accounts** — distinct KPI-eligible accounts with meaningful product activity in the trailing 30 days.
- **Retained account rate** — prior-30-day active accounts also active in the current trailing 30-day window / prior-30-day active accounts.
- **Time to first value** — median account-created → first human-reviewed Recommendation Record; withheld until at least five real observations.
- **Time to second cycle** — median first real measurement → second exact-comparable reviewed cycle; withheld until at least five real observations.
- **Design-partner conversion** — accepted design partners becoming verified paying accounts / accepted design partners.
- **Paid conversion** — activated accounts with verified real billing/payment evidence / activated accounts, but only once real billing evidence exists.

Any missing denominator or evidence boundary returns `insufficient_data`. A checkout button, pricing configuration, or application submission never counts as payment.

### D. Cohort retention

`lib/pmf-cohorts.ts` groups only explicitly KPI-eligible accounts by the calendar month in which they complete all six activation boundaries. Next-month retention remains `null` until the full next calendar month has closed. Immature cohorts are never misreported as zero retention.

### E. Customer-proof research extension

`20260830000300_customer_proof_research_events.sql` extends the existing commercial truth store instead of creating another one.

It adds an optional unique `design_partner_application_id` link from a commercial account to a real design-partner application, with no automatic conversion.

The existing `commercial_events` taxonomy is extended to include:

- customer interview;
- objection recorded;
- lost deal recorded;
- feature request recorded;
- validated use case;
- verified referral;
- existing verified payment, renewal, expansion, and churn states remain preserved.

The commercial tables remain RLS-enabled/service-role-only. No customer-proof rows are inserted by the migration.

## 8. Retention engine coverage after this branch

| Requirement | State |
| --- | --- |
| Next-cycle scheduling | Existing schedule + Inngest architecture preserved. |
| Meaningful-change alerts | Existing reviewed/exact-comparable notification path preserved. |
| What changed | Existing presence/citation/competitor comparison primitives preserved. |
| What worsened / improved | Presence delta can express reviewed direction; Foremention still does not claim causality. Broader semantic “better/worse” labels must remain evidence-backed. |
| Competitor movement | Existing exact-comparable competitor appearance/disappearance logic preserved. |
| Evidence changes | Existing returned-citation set change logic preserved. |
| Overdue action reminders | Existing due-action Attention path preserved and now contributes to retention health. |
| Weekly/monthly return triggers | Existing schedule and weekly intelligence/email preference paths preserved. |
| Longitudinal timeline | Existing comparison/run/Recommendation Record history preserved. |
| Retention health | **Built here** as transparent rule-based state. |
| Comparison eligibility | Existing exact-comparability + human-review gate preserved. |
| Alert-fatigue controls | Existing event-key dedupe, exact-comparability eligibility, opt-in preferences/unsubscribe, and duplicate delivery suppression preserved. |

## 9. Customer-proof coverage after this branch

The internal data model can now represent, without inventing values:

- design-partner applications and accepted partners;
- activated KPI-eligible organizations;
- verified paying accounts;
- verified renewals;
- verified expansions;
- verified referrals;
- verified churn;
- customer interviews;
- objections;
- lost deals and loss reasons;
- feature requests;
- validated use cases;
- time to first value;
- time to second comparable cycle;
- rolling and activation-cohort retention.

If there are no real records, the correct output is no data / `insufficient_data`, not a benchmark or synthetic number.

## 10. Files changed

- `lib/retention-loop.ts`
- `lib/retention-health.ts`
- `lib/pmf-metrics.ts`
- `lib/pmf-cohorts.ts`
- `app/api/retention/attention/route.ts`
- `supabase/migrations/20260830000300_customer_proof_research_events.sql`
- `tests/retention-loop-activation.test.mjs`
- `tests/pmf-metrics.test.mjs`
- `tests/billion-dollar-pmf-retention.test.mjs`
- `docs/billion-dollar-build/01-pmf-retention.md`

## 11. TDD and QA contract

Material behavioral changes were driven by tests before implementation, including:

- the missing `action_assigned` activation stage;
- prevention of human-review and ownership boundary skipping;
- transparent retention-health states;
- fail-closed metric behavior;
- all six activation boundaries in PMF metrics;
- real-billing requirement for paid conversion;
- mature-vs-immature activation cohort retention;
- extension of the existing customer-proof ledger without a parallel truth store or seeded proof.

Repository-native PR verification is expected to execute:

- isolated Supabase migration replay and `scripts/verify-company-migrations.sql`;
- `pnpm test`;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm build`;
- Cloudflare Worker dry-run;
- Browser Acceptance across local PR build;
- browser zoom/reflow acceptance;
- canonical-brand visual proof;
- accessibility checks through the browser acceptance stack;
- Lighthouse assertions;
- security and CodeQL workflows.

### Verification result

Final workflow results and exact candidate head SHA must be recorded only from current GitHub Actions evidence. Do not treat a queued run as a passing run.

## 12. Remaining blockers / intentional boundaries

1. **No production customer counts are asserted here.** This repository audit did not query or expose a production customer database, so it cannot legitimately claim activated customers, paying customers, retention, churn, or conversion values.
2. **No founder/operator back-office UI was added.** Commercial/customer-discovery records contain protected first-party data and remain service-role-only. Exposing them through a normal customer browser surface would weaken the existing privacy boundary.
3. **Metric definitions and pure derivations are implemented, but a trusted production aggregation job/API is intentionally not fabricated.** A later implementation may map verified first-party organization facts into the metric contract from a service-only context.
4. **Paid conversion stays unavailable until real payment/billing evidence exists.**
5. **Market positioning remains a hypothesis until first-party design-partner/customer proof validates it.**
6. **Observed change remains observational.** A before/after movement after an action is not proof that the action caused the movement.

## 13. Decisions the next chats must preserve

- Do not restart the product architecture or re-open the five-object IA unless new evidence justifies it.
- Do not create a second customer-proof database or analytics truth source.
- Do not silently redefine historical analytics events; add explicit new contracts when semantics materially change.
- Keep activation account-level and privacy-safe.
- Keep the first customer workflow deliberately narrow: five approved buyer questions, one real baseline, one reviewed Recommendation Record, one owned action, one exact-comparable remeasurement.
- Treat second-cycle completion and retained workflow as the early PMF retention test.
- Keep customer-discovery evidence first-party and service-only; do not send raw interview/contact/commercial text to PostHog.
- Keep `insufficient_data` as a valid, honest state.
- Do not report paid conversion, ROI, retention, or traction without verified evidence.
