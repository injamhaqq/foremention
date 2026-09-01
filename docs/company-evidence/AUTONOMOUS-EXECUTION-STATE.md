# Foremention Autonomous Execution State — ICP + Category Validation

Last updated: 2026-09-01

This is durable operating memory. Recover live reality before trusting any value in this file.

## Truth labels

Use these labels literally when recording company evidence:

- **VERIFIED FACT**
- **PRODUCTION FACT**
- **FIRST-PARTY CUSTOMER EVIDENCE**
- **HYPOTHESIS**
- **TARGET**
- **EXPERIMENT**
- **UNKNOWN**
- **BLOCKED**

## Recovery snapshot

- **VERIFIED FACT — GitHub base `main`:** `2c306677e7e7b318c955d4ec81e99679129bf6c7` (`Fix checkbox width inheritance in settings reflow (#190)`) at the start of this mission.
- **PRODUCTION FACT — application release at recovery:** GitHub Browser Acceptance for that exact SHA completed the “Verify exact production release before trusted live acceptance” step successfully and then passed trusted production browser/accessibility acceptance.
- **PRODUCTION FACT — Supabase project:** production project `vuujwdxivjsdikdstwib` (`Foremention`) was ACTIVE_HEALTHY when inspected.
- **PRODUCTION FACT — initial migration drift:** the production migration ledger stopped at `service_only_run_rpc_actor_context` while current `main` contained later August 29–30 migrations. Direct schema inspection confirmed commercial/customer-proof/design-partner tables were absent.
- **PRODUCTION FACT — initial drift impact:** Postgres logs showed application queries failing on missing `placements.due_at` and `organization_entitlements.package_key`.
- **VERIFIED FACT — repo defect found:** `20260830000300_customer_proof_research_events.sql` adds founder research event kinds, but `20260830000400_commercial_engine.sql` later replaces the same `commercial_event_type_check` constraint without those kinds. PR #191 repairs the union in a later additive migration rather than rewriting migration history.
- **VERIFIED FACT — open issues at recovery:** none found.
- **VERIFIED FACT — open PRs at recovery:** multiple older specialist billion-dollar-build PRs remained open even though PR #188 integrated the major slices. Treat those older branches as historical until diffed against current `main`.

## Production repair performed in this mission

The following changes were taken from already-merged `main` migration SQL and applied to the live production database after their effects were verified absent. They were applied in dependency order and no customer/commercial proof rows were seeded.

1. `security_performance_advisor_hardening_main_2c306677`
   - **PRODUCTION FACT:** privileged onboarding/membership implementations now live in `private` as SECURITY DEFINER functions;
   - **PRODUCTION FACT:** public authenticated wrappers are SECURITY INVOKER;
   - **PRODUCTION FACT:** the specified foreign-key performance indexes exist.
2. `company_customer_proof_main_2c306677`
   - canonical service-only company classification + commercial account/contact/opportunity/event stores created.
3. `retention_loop_v1_main_2c306677`
   - retention-loop schema created/extended, including `organization_entitlements.package_key`, `placements.due_at`, measurement schedules, record shares and billing account state.
4. `design_partner_applications_main_2c306677`
   - protected design-partner application table created.
5. `billing_webhook_events_main_2c306677`
   - service-only billing webhook receipt store created.
6. `design_partner_submission_limits_main_2c306677`
   - privacy-minimized public-form submission claims and service-only claim RPC created.
7. `apply_billing_event_atomic_main_2c306677`
   - service-only atomic billing-event application RPC created.
8. `customer_proof_research_events_main_2c306677`
   - accepted-application linkage + founder research event kinds applied.
9. `commercial_engine_main_2c306677`
   - canonical commercial/pricing/stage-history extensions applied.
   - **PRODUCTION FACT / KNOWN DEFECT:** this migration overwrote the event constraint and temporarily removed the research event kinds. Production currently reflects that narrower constraint until the additive PR #191 repair is merged and deployed.
10. `billing_commercial_hardening_main_2c306677`
   - billing grace/state-history hardening applied.

### Production verification after the repair

- **PRODUCTION FACT:** `placements.due_at` exists.
- **PRODUCTION FACT:** `organization_entitlements.package_key` exists.
- **PRODUCTION FACT:** `commercial_accounts`, `design_partner_applications`, and `pricing_research_records` now exist.
- **PRODUCTION FACT:** the current `commercial_event_type_check` is the commercial-engine-only set; the six founder research event kinds are not present yet.
- **PRODUCTION FACT:** the latest Postgres log sample after the repair did not contain new missing-`due_at` or missing-`package_key` errors. The historical errors remain visible at earlier timestamps; absence in a log sample is not a guarantee that every application path has been exercised.

### Canonical first-party/commercial counts after the repair

Live aggregate query returned true zero for all of the following service-only stores:

- company organization classifications: **0**
- commercial accounts: **0**
- commercial contacts: **0**
- commercial opportunities: **0**
- commercial events: **0**
- design-partner applications: **0**
- pricing research records: **0**
- billing webhook events: **0**
- billing state history: **0**

These are **PRODUCTION FACTS** about the current canonical stores. They do not prove that no human has ever interacted with Foremention; they prove that no first-party customer/commercial proof has been recorded in these newly operational canonical stores.

### Remaining repository → production migration drift

**TODO / BLOCKED FROM BLIND APPLICATION:** current `main` also contains later, larger migrations beginning with `20260830000600_outcomes_value_customer_success.sql` and subsequent outcome/enterprise/scale/evaluation migrations. They have not been applied in this mission because their full current source must be inspected before a production write. Do not infer full schema parity yet.

For the ICP/category mission, the actively breaking commercial/retention columns and the canonical commercial truth stores are now present. Continue the remaining migration-chain audit safely; never paste truncated migration content into production.

## Current implementation work

Scoped branch: `build/icp-category-validation`

PR: **#191 — Build ICP and category evidence ledger**

### TDD evidence

RED head: `65cc8013c0e56277af20f2192f00c4e1c481bee5`

- isolated Supabase migration replay passed;
- contract tests failed as intended because the evidence migration/docs did not exist;
- Security passed;
- CodeQL passed;
- AI Safety and Code Health passed.

Implementation head inspected before the latest state fix: `28241b8fdd224167d9cd990d31eeb5f67a61556a`.

On that head:

- isolated Supabase migration replay: **passed**;
- new evidence migration contract tests: **3/4 passed**;
- total tests: **594/595 passed**;
- sole failing assertion: this durable-state file did not contain the exact truth-label phrase `FIRST-PARTY CUSTOMER EVIDENCE`;
- Browser Acceptance: **passed**;
- Security: **passed**;
- CodeQL: **passed**;
- AI Safety and Code Health: **passed**;
- lint/typecheck/build/worker dry run were skipped because the test step failed.

This update adds the missing literal truth label and refreshes production facts. Re-run the entire exact-head gate before any merge claim.

## Validation implementation added in PR #191

- `tests/icp-category-evidence-contract.test.mjs`
- `supabase/migrations/20260901000100_icp_category_evidence.sql`
- `docs/company-evidence/ICP-EVIDENCE.md`
- `docs/company-evidence/CATEGORY-EVIDENCE.md`
- `docs/company-evidence/RESEARCH-OPERATIONS.md`
- this state file

The new migration:

- repairs the research/commercial event-type union;
- extends the existing commercial truth store instead of creating a parallel CRM;
- adds service-only structured research interviews;
- adds atomic evidence items with explicit source linkage, truth classification and direction;
- adds versioned confidence history using only `NO EVIDENCE / WEAK / EMERGING / MODERATE / STRONG / CONTRADICTED`;
- requires an actual primary evidence item for every non-`NO EVIDENCE` confidence assessment;
- adds structured category/message experiments and observations;
- creates aggregate service-only views that count real rows without inferring PMF/category validation;
- seeds no accounts, contacts, interviews, evidence, confidence, experiments, payment, retention or customer claims.

## First-party market-evidence state

Because the new `market_*` ledger is not merged/deployed yet, confidence stays conservative:

- ICP confidence — **NO EVIDENCE**
- Problem confidence — **NO EVIDENCE**
- Buyer confidence — **NO EVIDENCE**
- Category comprehension — **NO EVIDENCE**
- Urgency — **NO EVIDENCE**
- Willingness to trial — **NO EVIDENCE**
- Willingness to pay — **NO EVIDENCE**
- Activation — **NO EVIDENCE** for customer-validation purposes
- Repeat usage — **NO EVIDENCE**
- Retention — **NO EVIDENCE**
- Expansion potential — **NO EVIDENCE**

No confidence is upgraded because software or documentation exists.

## Working hypotheses

### ICP

**HYPOTHESIS:** English-language growth-stage B2B software companies where AI-mediated buyer recommendations may affect discovery/shortlisting and a marketing team can act on evidence.

Buyer roles to test independently: CMO, VP Marketing, VP Growth, Head/Director of SEO, Head/Director Organic Growth, Product Marketing leadership, plus newly discovered roles only when first-party evidence appears.

### Problem

**HYPOTHESIS:** teams need to understand what AI-mediated buyers are being recommended for important buying questions, what evidence supports those recommendations, what changed, and what action should be owned next.

### Category

**HYPOTHESIS:** `Recommendation Intelligence` is understandable and useful enough as a category frame for the recurring job. Do not rename it from internal preference.

## Experiments

Current state: **PLANNED**, not completed.

Priority sequence:

1. unaided Recommendation Intelligence comprehension;
2. problem → natural category language;
3. category → product comprehension;
4. category-first vs problem-first vs outcome-first vs competitive-intelligence vs recommendation-evidence messaging;
5. demo opening test;
6. outreach wording test only after target/message/scope approval;
7. buyer-language synthesis after a meaningful sample;
8. public alternative-language mapping as non-customer research.

No winner exists yet.

## Outreach boundary

**EXTERNAL BLOCKER / founder authorization required before sending:**

1. approved target list;
2. approved message;
3. approved sending scope.

Research, segmentation, recommended recipients and drafts may be prepared autonomously. Do not send unsolicited campaigns before all three are explicitly authorized.

## External inputs required later

- outreach authorization as above;
- any paid ad/research spend authorization before money is spent;
- Paddle/payment-provider credentials and merchant/account facts only when a real transaction is justified;
- legally binding company facts only from the founder/authorized records.

## Next highest-leverage actions

1. Re-run PR #191 on the new exact head and require: isolated migration replay, all tests, lint, typecheck, build, worker dry run, Security, CodeQL, AI Safety/Code Health, Browser Acceptance.
2. Review the exact PR head; merge only after exact-head green verification.
3. Verify the production application SHA separately after merge.
4. Apply `20260901000100_icp_category_evidence.sql` to production only from the merged exact head.
5. Query production `market_validation_scorecard` and `market_confidence_latest`; record true zero/real counts without inference.
6. Continue the remaining late-August migration-chain audit from full current source.
7. Prepare a qualified public target-account research list; label it recruitment research, not first-party evidence.
8. Prepare recommended contacts and personalized messages; do not send.
9. After founder approval, execute interviews beginning with unaided category capture.
10. Convert each interview into source-linked atomic evidence and update confidence only from those rows.
11. Prioritize activation and exact-comparable second-cycle evidence for any qualified design partner.
12. Re-run KEEP / REFINE / PIVOT / KILL checkpoints without protecting the original hypothesis.

## Fundraising boundary

`FUNDRAISING EVIDENCE THRESHOLD IMPROVING` is **NOT YET FLAGGED**. The evidence system is becoming operational, but first-party market evidence is not yet sufficient. Investor materials must continue to state hypotheses/unknowns accurately.

## Exact continuation instructions

Recover Foremention reality from GitHub and production. Do not trust this handoff until verified. Read `docs/company-evidence/AUTONOMOUS-EXECUTION-STATE.md`, inspect live `main`, production, open PRs, checks and Supabase state, then continue from the first incomplete operation.

Then:

1. compare live `main` with the SHA recorded here;
2. inspect PR #191 and its exact head/checks;
3. inspect production migration history/schema and Postgres errors;
4. finish only missing canonical migrations, never re-run equivalent ones blindly;
5. keep all market/customer statements truth-labeled;
6. merge/deploy the evidence ledger only after exact-head green verification;
7. verify production separately;
8. query the empty/real evidence ledger before stating counts;
9. continue target-account research and outreach preparation without sending until explicit authorization.
