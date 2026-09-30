# CEO acquisition metric truth — nonproduction reporting containment

**Scope:** issue #371. Operator-only metric language correction. No live company records, database objects, production secrets, outbound contact, public customer testimonials, or revenue values changed.

The legacy `public.company_ceo_scorecard.qualified_accounts` view counts the internal `commercial_accounts.qualification_status = 'qualified'` flag only. That predicate contains **no first-party interview**, independently verified contact route, procurement authority, or independently confirmed purchase intent. It is not a sales-qualified account denominator.

The daily CEO action now **removes** the ambiguous field name from the downstream payload, surfaces the exact same count as `internally_qualification_flagged_accounts`, and attaches a structured caveat. A separate `recorded_conversation_events` count represents historical event rows, not unique fully qualified accounts. The research-triage-specific, verified-contact, conversation-evidence-qualified and sales-qualified metrics remain **null/unknown** until a proper independent account-level view is approved and deployed. Never convert a null into zero or call seven researched accounts seven sales-qualified buyers. Changing the daily brief version prevents a stale same-day report from disguising the corrected evidence meaning; duplicate historical v1 brief cards may still exist and must be treated as legacy.

## Proposed future denominator contract — NOT a production migration

1. **Public research candidates:** distinct canonical `commercial_accounts.id` with independently recorded public research origin and source provenance, regardless of internal qualification status. Before adopting `lead_source` as an identifier, verify its complete actual production vocabulary.
2. **Research-triage qualified:** above candidates with a specifically documented, validated internal research qualification rubric; never use it as buyer readiness.
3. **Contact-route verified candidates:** distinct candidate accounts with a linked `commercial_contacts` row where `contact_route_status='verified'`, `contact_source_url` and `contact_verified_at` independently exist, and the contact is not suppressed or blocked. This establishes contact-route evidence **only**, not consent, reply, lead qualification or an actual meeting.
4. **Conversation-evidence qualified accounts:** verified-contact candidate accounts with an actual matching `commercial_events` conversation/discovery event, defensible `recorded_by` and `occurred_at`, and an independently recorded first-party ICP/buyer assessment. Require the same account and properly matched contact; reject duplicates, synthetic rows and invalid or future event chronology. Establish the founder-approved assessment rubric before treating this as a commercial qualification KPI. Even this metric is **not** a verified opportunity, booking or paid revenue figure.

Do not add a view or backfill these fields against the existing production database until #332 semantic migration reconciliation, an independently verified production backup and restore drill, and explicit owner approval. Build representative isolated fixture tests with seven research records, seven cold/unverified contacts, zero conversations, then one actual verified matched buyer conversation, an invalid/suppressed contact, a duplicate event and a cross-account mismatched event. Measure verified sales qualification separately from the approved customer/design-partner outcome gates; retain the original source data and event chronology.

**Readiness:** This patch fixes *operator brief language* only. It does not establish the four new denominators, sales qualification, pipeline or paid customer proof. The production SQL view still uses the old column until a separately authorized forward-only migration and exact-release validation.


## Nonproduction v3 evidence denominators

The Stage 0 integration now also derives the four account-level denominators **at read time** from existing protected company evidence, without a production view migration or record rewrite:

- `public_research_candidates`: distinct accounts with a completed acquisition-research run and at least one valid HTTPS research-evidence record.
- `research_triage_qualified_candidates`: the above with the existing shadow qualification gate (score >=75, why-now evidence, no disqualifiers) and at least one research source retrieved within 30 days.
- `verified_contact_route_candidates`: triage-qualified accounts with a non-suppressed, non-blocked contact whose route is explicitly `verified`, has an HTTPS source, and a valid verification timestamp.
- `conversation_evidence_qualified_accounts`: verified-contact accounts with both a matched first-party conversation/discovery event and a matched `qualification_completed` event, recorded by a real actor for the same contact/account, plus a recorded buyer role.

Every supporting protected table is read with a 501-row sentinel around a 500-row evidence ceiling. If any read saturates, **all four metrics become unknown/null** rather than being calculated from a partial subset. Duplicate events cannot inflate account counts; cross-account contact/event joins, future timestamps, active suppressions, blocked contacts, stale research qualification and missing buyer-role evidence fail closed. The loader never selects contact names or email addresses.

`verified_sales_qualified_accounts` intentionally remains null. A conversation-evidence-qualified account is still not automatically a pipeline opportunity, customer, payment, consent record or causal outcome. Defining that next denominator requires a separate approved opportunity-level evidence contract.

This v3 path removes the need to wait for production DDL merely to make the daily CEO brief semantically honest. It **does not** authorize production deployment while the repository's independent release gates remain open.
