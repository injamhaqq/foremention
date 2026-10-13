# Chat08 — Customer operations playbook (CV-09, CV-10, CV-13, CV-14, CV-16, A22, A23)

**State:** internal proposal, 2026-10-13. Nothing here has been sent, scheduled, offered or charged. All counts in this document are **targets**, not results. Actual current state: 0 Paddle transactions/subscriptions/customers (read-only, 2026-10-13); no Chat08-verified interview, offer, pilot, renewal or consent exists.

**Reuse, do not duplicate.** This is a delta on the existing operator docs, which stay canonical:
`docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md` (ICP rubric §2, triggers §3, research template §4, discovery call §8, objections §13, pipeline contract §14, case-study measurement §15), `docs/company-evidence/RESEARCH-OPERATIONS.md` (screener, interview script, note template, objection/win-loss taxonomies), `docs/STAGE-0-CUSTOMER-PROOF-90-DAY.md` (exit gate, scoreboard, kill/pivot triggers). Records go into the **existing** service-only tables (`commercial_accounts`, `commercial_contacts`, `commercial_opportunities`, `commercial_events`, `market_research_interviews`, `market_evidence_items`, `pricing_research_records`, `support_tickets`). No new CRM, analytics, LMS or helpdesk.

## 0. Cohort decision required first (founder)

Two incompatible experiments exist. Run **one** cohort at a time with identical scope so results are comparable:

| | Cohort S (repo Stage-0, current constitution) | Cohort A (2026-10-11 report hypothesis) |
| --- | --- | --- |
| Buyer | English-language B2B SaaS, 50–500 employees, in-house SEO/content/growth owner | 2–20-person B2B SEO/GEO agency, one named client |
| Offer | 30-day assisted proof pilot, $3,000 / $6,000 hypotheses | $299 four-week single-client pilot |
| Separate from | Live catalog Core $99/mo, Signal $299/mo (not approved for sale) | Same |

Until decided, only research interviews (no offers, no prices quoted as facts) are permitted. Chat08 recommends Cohort S because it matches the approved category/IA and the existing scorecard; Cohort A would need a website/ICP change that Chat05/FM-00 own.

## 1. Narrow qualification (both cohorts)

An account is **qualified** only if all four hold, and it is recorded in `commercial_accounts` with `qualification_status='qualified'` and `icp_score`:

1. ICP score ≥ 65 using FOUNDER-CUSTOMER-PROOF-PLAYBOOK §2 (Cohort A: substitute "agency serves ≥1 B2B software client with competitive buyer questions" for headcount).
2. A **dated public trigger from 2026** with source URL (§3 triggers). No trigger, no contact.
3. A **lawful, permitted contact route** recorded (published business email, inbound form, warm introduction, or platform message the recipient opted into). No scraped personal emails, no purchased lists.
4. A named role (champion + economic-buyer path) — role, not personal data, in research notes.

Disqualify: wants ranking/traffic guarantees; no ability to ship a change in the pilot window; consumer-app coverage required; existing customer of a direct competitor under contract with no switching window; founder/friend/investor company (record as `internal`, never KPI-eligible).

The 2026-09-20 `STAGE0-TARGET-ACCOUNTS` / priority-7 lists and the 100 GitHub issue samples are **research labels**, not qualified prospects; re-qualify from scratch against today's triggers.

## 2. Verified prospect sourcing system

One ledger, one row per account (`templates/prospect-ledger.csv`, mirrored into `commercial_accounts` + `market_evidence_items` with `truth_classification='first_party_customer_evidence'` only after a conversation):

`account_id, company, domain, cohort, employee_band_source_url, trigger_summary, trigger_source_url, trigger_date, icp_score, score_rationale, contact_route_type, contact_route_source_url, champion_role, buyer_role, disqualifier, status (target|qualified|contacted|conversation|disqualified), next_action, next_action_due, researched_at, researched_by`

Rules: every scored field cites a source URL observed on `researched_at`; unknown stays blank (never guessed); max 25 active qualified accounts per cohort; re-verify triggers older than 60 days. Day-14 gate counts only rows with all of ICP ≥ 65 + trigger URL/date + contact route.

## 3. Behavioral interview (20–30 min)

Use RESEARCH-OPERATIONS.md script. Mandatory past-behavior probes (CV-09 requires the last two for "urgent job / current spend"):

1. "Walk me through the **last time** an AI answer about your category mattered to someone at the company. When, who noticed, what happened next?"
2. "What did you use to check it — tools, people, spreadsheets? How many person-hours that week?"
3. "Who owns this today, and who would sign off on budget to change it?"
4. "What have you **already spent** (tools, agency, staff time) on AI search/visibility in the last 90 days?" → `currentSpendDocumented=true` only with a stated amount or named paid tool/agency.
5. "If nothing changes in the next 60 days, what breaks or who is unhappy?" → `urgentJob=true` only with a dated consequence or owner.
6. "What would you need to see to approve one change based on evidence?"

Never ask "would you use/pay for…?" as evidence. Log in `market_research_interviews` (`interview_type='buyer_interview'`) with `participant_confirmed` (proposed field) and raw notes; extract statements into `market_evidence_items`. A survey, form fill or GitHub issue is not an interview.

## 4. Six message drafts

Unchanged from `commercial-proof-and-finance-contract.md` (research, agency, role-routing, follow-up, demo, offer decision). Each must be human-personalized with a real dated trigger, sent only by the founder after approval, and logged as `outreach_sent`. Chat08 has sent none. Do not claim customers, results, rankings, coverage of consumer apps, or "proven" uplift in any draft.

## 5. Real 15-minute demo (on the customer's own approved question where possible)

| Min | Segment | What is shown (real product only) |
| --- | --- | --- |
| 0–2 | Their question | One buyer question they confirmed in discovery. |
| 2–5 | Observation | A preserved Recommendation Record: provider/model, method (`api_hosted_model_with_independent_retrieval` per Chat01 — not consumer-app monitoring), raw answer, returned references, source-type limitations, any "evidence unavailable". |
| 5–8 | Human review | Evidence review states; what was rejected and why. |
| 8–11 | Change Specification | A customer-ownable change with owner/due date, or an explicit "no action" with rationale. |
| 11–13 | Later cycle | What makes a second cycle comparable (same question-set version, provider/model/sampling/method); what is not claimed (no causal uplift). |
| 13–15 | Next step | Their success criterion, verbatim; ask: written scoped pilot, or record no fit. |

If only fixture/demo data exists, say so on screen. A demo is logged as `demo_held` and never counts as a sale, activation or value (mapper returns `demo_is_not_sale_or_value`).

## 6. Scoped pilot proposal (template)

- **Parties/entity:** Foremention legal entity [founder to confirm — CV-15], customer legal entity.
- **Scope:** one organization/client, ≤5 approved buyer questions, one declared observation method and named model, ≤3 competitor profiles, baseline + one later comparable cycle when eligible, ≤3 reviewed findings, ≤1 Change Specification, named customer owner, two review sessions, written result including unavailable/insufficient evidence.
- **Out of scope:** ranking/traffic/revenue guarantees, consumer ChatGPT/Gemini app equivalence, integrations, more questions.
- **Term:** 30 days (Cohort S) or 4 weeks (Cohort A); ends with an explicit continuation decision (§10). **No auto-renewal.**
- **Price/payment:** cohort price as approved by founder; invoiced/collected only through Paddle (Chat03) after live activation approval; a signed pilot is recorded separately from cash.
- **Success criterion:** customer's verbatim criterion from discovery + "decision made from reviewed evidence."
- **Data/privacy:** terms, privacy, subprocessors, deletion/export per current /terms, /privacy, /subprocessors (Chat02/legal review required).
- **Responsibilities:** customer approves questions and the change; Foremention operates collection and review; response times per §8 (no SLA beyond that).

## 7. Onboarding checklist (per account, target ≤ 2 h founder time)

1. Classification row created: `company_organization_classifications.classification='design_partner'|'customer'`, `included_in_company_kpis=true` only for an external legal entity with signed scope. Founder/test/demo orgs = `internal`/`synthetic`, never KPI.
2. Workspace + project created by the customer's own account (Chat02 auth); owner invited.
3. Five questions approved by the customer (Chat04 approval flow); question-set version recorded.
4. Method/model declared; baseline collection scheduled (Chat06).
5. First Record reviewed together; review session booked.
6. Support channel confirmed: in-app support ticket or hello@foremention.com.
7. Service-time log row started (§9).

## 8. Support and escalation

| Severity | Examples | First response target (proposed, not a published SLA) | Owner/escalation |
| --- | --- | --- | --- |
| S1 | Cross-tenant data exposure, auth bypass, wrong-customer export | Same business day; stop collection | Chat02 (security/privacy) → founder; incident record |
| S2 | Charge/entitlement wrong, double charge, refund request | 1 business day | Chat03 (billing); Paddle handles buyer payment support as MoR |
| S2 | Collection failed/interrupted, schedule missed | 1 business day | Chat06 (jobs/recovery) |
| S3 | Evidence irrelevant/wrong source, comparability dispute | 2 business days | Chat01/Chat04 |
| S4 | How-to, copy, feature request | 3 business days | Founder; log `feature_request_recorded` |

Use the existing `support_tickets` table/status (`new → triaged → reply_pending → responded → closed`). Every support touch also gets a service-time entry (`category=support|incident`).

## 9. Delivery/onboarding/sales/support time & cost log

`templates/service-time-log.csv` → summarized by `summarizeServiceTime()`:

`entry_id, occurred_at (UTC ISO), organization_id, account_kind (external_customer|prospect|internal|test|research), category (acquisition|research_interview|onboarding_setup|evidence_review|support|comparison|incident|retention_review|reporting|admin_internal), minutes, cash_cost_usd, cash_cost_ref, note`

Rules: log the same day; minutes are real elapsed founder time; cash costs cite a receipt (provider invoice, tool bill). Acquisition and setup are tracked separately from recurring. CV-13 target: recurring ≤ 4 h per client per 28 days; accounts over target are listed automatically. Internal/test time never gets client attribution. Proposed table: see `schema-and-event-proposals.md`.

## 10. Weekly decision review (30 min, same day each week)

Inputs: `summarizeCommercialProof` + `summarizeServiceTime` + `evaluateProofGates` on verified facts only. Template `templates/weekly-decision-review.csv`:

`week_start, cohort, qualified_prospects, interviews, urgent_spend_interviews, offers, accepted, activated, comparable_second_cycles, paid_orgs, net_cash_usd (receipts only), founder_hours, accounts_over_4h, open_s1_s2, gate_status_14_30_60_90, bottleneck, decision, owner, next_week_action, kill_or_pivot_trigger_hit (Y/N + which)`

One bottleneck, one decision, one owner, one action. Reference STAGE-0 kill/pivot triggers (e.g. low urgency after 30 qualified interviews).

## 11. Continuation / cancellation

At the end of every pilot or paid period, record exactly one `continuation_decision_recorded` outcome: `continue | renew | expand | refer | cancel | lost` with reason (lost-deal taxonomy from PLAYBOOK §14 / existing `lost_reason` enum) and evidence reference. Never default to renewal. Cancellation is honored immediately in Paddle (Chat03 flow); data export/deletion offered per /privacy. A renewal counts as **elapsed renewal** only when its Paddle settlement occurs at/after the end of the previous paid service period (`elapsedRenewalOrgs`).

## 12. Voluntary honest review / case-study consent

Ask only after a completed cycle and the continuation decision (so consent is not tied to price/renewal). Consent record (`case_study_consent_granted`, signed_consent authority) must state: voluntary=true; scopes (any of: anonymized metrics, named quote, logo, full case study, public review site); approved text/redaction version; revocation contact; date. No incentive tied to a positive review; negative results may be published only with the same consent. Chat08's evaluator rejects consent without scopes or voluntariness. Until consent exists: no logos, quotes, testimonials or customer names anywhere (website, deck, outreach).

## 13. Channel and referral measurement (CV-16)

One outbound channel at a time; per channel record time-inclusive CAC = (founder acquisition minutes × loaded rate + cash cost) / paid orgs from that channel; referrals logged as `referral_verified` with the referring org. Acquisition is scaled only after retained, paid, profitable cohort evidence.
