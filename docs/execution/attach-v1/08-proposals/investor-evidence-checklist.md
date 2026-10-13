# Chat08 — Truthful investor evidence checklist and claim ledger (A24)

**State:** proposal, 2026-10-13. Not an investor deck, not sent to anyone. Use `classifyInvestorClaim()` (`lib/commercial-operations.mjs`) for each line before any deck/data-room use: traction metrics need a first-party receipt/record, source reference and as-of date; forecasts, research and hypotheses may appear only labelled as such; MRR/ARR need a recurring billing ledger; logos/quotes/case studies need specific consent.

## Current claim ledger (as of 2026-10-13)

| Claim | Current verified value | Evidence type | Source | Usable as |
| --- | --- | --- | --- | --- |
| Paying customers | **0** | receipt (absence) | Paddle live `GET /customers`, `/subscriptions`, `/transactions` all empty, read 2026-10-13 | fact with citation ("pre-revenue") |
| Collected cash / revenue | **$0** | receipt (absence) | Same | fact with citation |
| MRR / ARR | **unavailable** (no recurring billing ledger entries) | — | — | must not be stated as a number |
| Retention / renewals / churn | **unavailable** | — | — | must not be stated |
| Customer interviews (Foremention, verified) | **not verified by Chat08**; the repo baseline `docs/company-evidence/STAGE0-BASELINE-2026-09-20.md` is historical | first_party_record needed | Operator tables not accessed | not usable until each interview cites a `market_research_interviews` row |
| Activated design partners / comparable second cycles | **not verified** | first_party_record needed (Chat04 `closesCustomerProof`) | — | not usable |
| Prices | Core $99/mo, Signal $299/mo exist in Paddle catalog but "Proposed · not yet purchasable" | hypothesis | Paddle `GET /prices`; foremention.com/pricing | hypothesis labelled only |
| $299 agency pilot; $3k/$6k assisted pilot | untested | hypothesis | 2026-10-11 report (not available this session); STAGE-0 doc | hypothesis labelled only |
| Unit economics / margins | scenarios only | scenario | `economics-stress-tests.md` | forecast labelled only |
| Market size (TAM/SAM) | none prepared | — | — | do not state; if added, cite third-party sources as market context |
| Customer evidence 100 issue samples | other startups' GitHub issues | research | prior Chat08 checkpoint | market context only, never Foremention customers |
| Competitor facts | competitor pack 2026-10-11 (not available this session) | research | — | market context only, dated |
| Company / IP ownership | **not verified** | legal_record needed | — | founder to supply |
| Runway | **not verified** | bank statement needed | — | founder to supply |
| Logos / testimonials / case studies | **none** | consent needed | — | must not appear |

## Evidence checklist for a data room (each item must link to its source)

1. Legal: incorporation record, cap table, founder IP assignment, repository ownership (GitHub org/repo admin), trademark status if any, licenses of dependencies (Chat07 register).
2. Merchant: Paddle seller verification, approved domain, first successful payout statement (CV-15), refund/cancellation policy as published.
3. Product: current production commit SHA and health receipt; methodology page; exact observation method (Chat01) — no consumer-app equivalence claims.
4. Customers: dated prospect ledger (sources), interview log (confirmed participants), offer-decision log (every offer and decision, including no's), Paddle transaction IDs per paid org, signed pilot scopes, Chat04 reviewed Record + Change Specification + comparable later cycle per org, continuation/cancellation records.
5. Economics: founder time log, provider invoices, infrastructure bills, Paddle fees from statements — replacing every scenario assumption.
6. Consent: per-organization scoped consent for any name, quote, logo or metric.
7. Gate status: `evaluateProofGates()` output for days 14/30/60/90 on verified facts, with unavailable criteria shown as unavailable.

## Prohibited

Fabricated or "pipeline-weighted" revenue; pilots presented as MRR/ARR; founder/test/internal/synthetic org activity counted as traction; research prospects or competitor complaint samples presented as customers; before/after change presented as causal uplift; any logo/testimonial without consent; Supplier Quote Review model figures (other business) presented as Foremention's.
