# Foremention Autonomous Execution State — ICP + Category Validation

Last updated: 2026-09-01

This is durable operating memory. Recover live reality before trusting any value in this file.

## Recovery snapshot

- **VERIFIED FACT — GitHub base `main`:** `2c306677e7e7b318c955d4ec81e99679129bf6c7` (`Fix checkbox width inheritance in settings reflow (#190)`) at the start of this mission.
- **PRODUCTION FACT — application release:** GitHub Browser Acceptance for that exact SHA completed the “Verify exact production release before trusted live acceptance” step successfully and then passed trusted production browser/accessibility acceptance.
- **PRODUCTION FACT — Supabase project:** production project `vuujwdxivjsdikdstwib` (`Foremention`) was ACTIVE_HEALTHY when inspected.
- **PRODUCTION FACT — initial migration drift:** the production migration ledger stopped at `service_only_run_rpc_actor_context` while current `main` contained later August 29–30 migrations. Direct schema inspection confirmed commercial/customer-proof/design-partner tables were absent.
- **PRODUCTION FACT — drift impact:** Postgres logs showed current application queries failing on missing `placements.due_at` and `organization_entitlements.package_key`.
- **VERIFIED FACT — repo defect found:** `20260830000300_customer_proof_research_events.sql` adds founder research event kinds, but `20260830000400_commercial_engine.sql` later replaces the same `commercial_event_type_check` constraint without those kinds. PR #191 repairs the union in a later additive migration rather than rewriting migration history.
- **VERIFIED FACT — open issues:** no open GitHub issues were found at recovery time.
- **VERIFIED FACT — open PRs:** multiple older specialist billion-dollar-build PRs remain open; PR #188 already integrated the major slices. Treat those older branches as historical until diffed against current `main`.

## Production repair already performed in this mission

These changes were taken from already-merged `main` migration SQL and applied to the live production database after confirming their effects were absent:

1. `security_performance_advisor_hardening_main_2c306677`
   - **PRODUCTION FACT:** privileged onboarding/membership implementations now live in `private` as SECURITY DEFINER functions;
   - **PRODUCTION FACT:** public authenticated wrappers are SECURITY INVOKER;
   - **PRODUCTION FACT:** specified foreign-key performance indexes were created.
2. `company_customer_proof_main_2c306677`
   - customer/company classification boundary and canonical commercial account/contact/opportunity/event ledger created;
   - no proof rows seeded.
3. `retention_loop_v1_main_2c306677`
   - retention-loop schema including `organization_entitlements.package_key`, `placements.due_at`, measurement schedules, shares and billing-account state created/extended.
4. `design_partner_applications_main_2c306677`
   - protected design-partner application table created;
   - no application rows seeded.

**TODO:** continue the canonical late-August production migration chain after reading each current-main migration and preserving dependency order. Do not claim schema parity until all relevant main migrations are applied and verified.

## Current implementation work

Scoped branch: `build/icp-category-validation`

PR: **#191 — Build ICP and category evidence ledger**

TDD evidence:

- Test-only head: `65cc8013c0e56277af20f2192f00c4e1c481bee5`.
- Isolated Supabase migration replay: passed.
- Contract test run: failed as intended because the evidence migration/docs did not yet exist.
- Security: passed on RED head.
- CodeQL: passed on RED head.
- AI Safety and Code Health: passed on RED head.
- Browser Acceptance: failed on RED head during PR browser acceptance; investigate again on the final head rather than assuming the failure is caused by the evidence contract.

Implementation added after RED:

- `supabase/migrations/20260901000100_icp_category_evidence.sql`
- `docs/company-evidence/ICP-EVIDENCE.md`
- `docs/company-evidence/CATEGORY-EVIDENCE.md`
- `docs/company-evidence/RESEARCH-OPERATIONS.md`
- this state file

The migration:

- repairs the research/commercial event-type union;
- extends the existing commercial truth store instead of creating a parallel CRM;
- adds service-only structured research interviews;
- adds atomic evidence items with explicit source linkage/truth classification/direction;
- adds versioned confidence history with the allowed states `NO EVIDENCE / WEAK / EMERGING / MODERATE / STRONG / CONTRADICTED`;
- requires an actual primary evidence item for every non-`NO EVIDENCE` confidence assessment;
- adds structured category/message experiments and observations;
- creates aggregate service-only views that count real rows without inferring PMF/category validation;
- seeds no accounts, contacts, interviews, evidence, confidence, experiments, payment, retention or customer claims.

## First-party evidence state

At recovery, the production customer-proof/research tables did not exist, so historical evidence counts from that system were **BLOCKED/UNKNOWN**, not zero.

Until the new ledger is merged, deployed and queried in production, all confidence states remain conservatively:

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

This does not assert that no humans have ever interacted with Foremention. It states that the required qualified, source-linked first-party evidence has not yet been verified in the canonical market-evidence ledger.

## Working hypotheses

### ICP

**HYPOTHESIS:** English-language growth-stage B2B software companies where AI-mediated buyer recommendations may affect discovery/shortlisting and a marketing team can act on evidence.

Buyer roles to test independently: CMO, VP Marketing, VP Growth, Head/Director of SEO, Head/Director Organic Growth, Product Marketing leadership, plus newly discovered roles only when evidence appears.

### Problem

**HYPOTHESIS:** teams need to understand what AI-mediated buyers are being recommended for important buying questions, what evidence supports those recommendations, what changed, and what action should be owned next.

### Category

**HYPOTHESIS:** `Recommendation Intelligence` is understandable and useful enough as a category frame for the recurring job. Do not rename it from internal preference.

## Experiments

Current state: **PLANNED**, not completed.

Priority sequence:

1. Unaided Recommendation Intelligence comprehension.
2. Problem → natural category language.
3. Category → product comprehension.
4. Category-first vs problem-first vs outcome-first vs competitive-intelligence vs recommendation-evidence messaging.
5. Demo opening test.
6. Outreach wording test only after target/message/scope approval.
7. Buyer-language synthesis after a meaningful sample.
8. Public alternative-language mapping as non-customer research.

No winner exists yet.

## Outreach boundary

**EXTERNAL BLOCKER / founder authorization required before sending:**

1. approved target list;
2. approved message;
3. approved sending scope.

Research, segmentation, recommended recipients and drafts may be prepared autonomously. Do not send unsolicited campaigns before all three are explicitly authorized.

## External inputs required later

- Outreach authorization as above.
- Any paid ad/research spend authorization before money is spent.
- Paddle/payment-provider credentials and merchant/account facts only when a real transaction is justified.
- Legally binding company facts only from the founder/authorized records.

## Next highest-leverage actions

1. Finish production migration-chain repair from current `main`; verify runtime missing-column errors disappear.
2. Run PR #191 GREEN checks: isolated migration replay, tests, lint, typecheck, build, worker dry run, Security, CodeQL, AI Safety/Code Health, Browser Acceptance.
3. Review the exact PR head; merge only after exact-head green verification.
4. Verify production application SHA separately after merge.
5. Apply `20260901000100_icp_category_evidence.sql` to production only from the merged exact head.
6. Query production `market_validation_scorecard` and `market_confidence_latest`; record real counts, including true zero where the operational ledger exists and is empty.
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
