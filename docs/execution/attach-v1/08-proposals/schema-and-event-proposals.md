# Chat08 → FM-00 / Chat03 / Chat04: commercial event and schema proposals

**State:** proposal only. Nothing here is applied to `supabase/migrations/` or any database. FM-00 owns the final migration; the SQL sketch is in `migrations/20261013120000_chat08_commercial_proof_fields.proposal.sql` (not a migration file; not on the replay path).

## 1. Existing schema reused (verified in repo at base 6b93c88c)

- `company_organization_classifications` (`classification` ∈ unknown/internal/synthetic/benchmark/design_partner/customer; `included_in_company_kpis` only for design_partner/customer). Chat08 treats this as the **only** cohort-eligibility switch; founder/test/demo orgs stay out of every count.
- `commercial_accounts/contacts/opportunities/events`, `commercial_stage_events`, `pricing_research_records` (evidence_state current_fact/experiment/hypothesis/future_target), `commercial_metric_periods` (nullable = unknown), `market_research_interviews`, `market_evidence_items`, `support_tickets`, views `company_ceo_scorecard`, `company_customer_value_scorecard`, `customer_value_validation_evidence`, `qualified_paid_pilot_evidence`.
- Read-only adapter: `mapExistingCommercialEvent()` maps all 29 current `commercial_event_type_check` values (contract test pins the map to the latest constraint in `20260901000100_icp_category_evidence.sql`). Output candidates are always `confirmation: "unverified"`.

## 2. Finding for FM-00 / Chat03: manual payments counted as paid-pilot evidence

`qualified_paid_pilot_evidence` (migration `20260915172000_customer_value_pilot_evidence_gates.sql`) accepts `commercial_opportunities.revenue_source IN ('manual_verified','billing_provider')` plus any `payment_verified` event. A manually typed payment therefore qualifies as paid-pilot proof with no billing-ledger receipt. Proposal: either restrict the view to `billing_provider` with a `billing_reference` that matches a reconciled Chat03 billing-ledger row, or expose `revenue_source` prominently and have every investor/scorecard consumer exclude `manual_verified` until reconciled. Chat08's evaluator already rejects manual payments (`manual_payment_not_billing_ledger`). Not changed here (shared view, FM-00 owner).

## 3. Proposed additions (only where current schema lacks the field)

| Need | Proposal | Owner |
| --- | --- | --- |
| Founder service-time log (CV-13) | New service-only table `commercial_service_time_entries` (account_id, organization_id nullable, category enum matching `SERVICE_TIME_CATEGORIES`, minutes 1–1440, cash_cost_cents, cash_cost_ref, occurred_at, recorded_by). No browser grants. | FM-00 migration; Chat08 consumer |
| Interview confirmation | `market_research_interviews.participant_confirmed boolean not null default false`, `urgent_job boolean`, `current_spend_documented boolean`, `current_spend_detail text` | FM-00 |
| Offer/consent/continuation event types | Extend `commercial_event_type_check` with `scoped_offer_delivered`, `pilot_agreement_signed`, `continuation_decided`, `case_study_consent_granted`, `case_study_consent_revoked` (union with all 29 existing values — the constraint was accidentally narrowed once before, see 20260901000100 header). | FM-00 |
| Continuation outcome | `commercial_events.continuation_outcome text check in (continue, renew, expand, refer, cancel, lost)` required when `event_type='continuation_decided'` | FM-00 |
| Consent detail | `commercial_case_study_consents` (account_id, voluntary bool not null, scopes text[] non-empty, approved_text_version, revocation_contact, granted_at, revoked_at, evidence_ref) | FM-00; legal review Chat02 |
| Payment amount/currency/period | Chat03 billing ledger should persist `amount_cents`, `currency`, `billing_period_starts_at/ends_at`, `paddle_transaction_id` for each settled transaction (Chat03 item 9 already raises persisting amount/currency for Chat08) | Chat03 + FM-00 |
| Payout proof | Subscribe/persist `payout.paid` (Chat03 item 9) so the first successful payout can be evidenced (CV-15) | Chat03 + founder |

## 4. Authoritative event contracts Chat08 consumes

| Chat08 proof kind | Must come from | Required fields |
| --- | --- | --- |
| payment_settled / renewal_payment_settled / refund_settled | Chat03 billing ledger (Paddle `transaction.completed` / adjustments, reconciled) | organization_id, transaction id (settlementRef), amount_cents, currency, occurred_at, service_period_end, pilotScopeRef if a pilot |
| first_record_reviewed, change_specification_approved | Chat04 (`decision_kind`, `decided_at`, approval) | organization_id, record/decision id, timestamps |
| comparable_second_cycle_reviewed | Chat04 `assessLaterCycle` + `closesCustomerProof === true` (origin `customer_cycle`) | baseline/later run ids, comparable=true |
| interview_completed | founder research ledger (`market_research_interviews`) | participant_confirmed, urgent_job, current_spend_documented |
| collection/recovery incidents | Chat06 job events | run id, terminal state, recovery time (for support log) |
| org eligibility | Chat02-reviewed `company_organization_classifications` | classification, included_in_company_kpis |

Integration status: **unverified**. Peer code exists on their branches (Chat03 #566, Chat04 #563) but is not composed; Chat08 helpers operate on normalized facts and have been tested only with synthetic fixtures.
