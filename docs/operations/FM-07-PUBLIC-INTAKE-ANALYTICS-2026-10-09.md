# FM-07 — Browser intake analytics trust boundary

**Date:** 2026-10-09. **Base main:** `d4fea60a7bb8e047f2282cea9134121e9496c67e`.
**Role:** FM-07 containment candidate; **FM-00** is the sole integration authority.
**Tracked defect:** [#475](https://github.com/injamhaqq/foremention/issues/475).
**Sibling green candidate:** [FM-07 #463](https://github.com/injamhaqq/foremention/pull/463).

## Confirmed red case

`components/public-activation-analytics.tsx` observes the query string `/contact?submitted=1` and calls `captureProductEvent("design_partner_application_submitted")`. This is **not sufficient evidence of a newly saved form**: navigation to that URL is possible without an authenticated first-party application write. The server route also intentionally returns a success-looking response to honeypots and duplicates, which are not new first-party application rows. The ContactPage can display a success message from the query parameter alone. These public files are already in stacked [PR #440](https://github.com/injamhaqq/foremention/pull/440); FM-07 does not edit them in this candidate.

Additionally, two public interactions emit `sample_opened` and `evidence_inspected`, absent from `lib/product-analytics-contract.ts`, and are silently dropped. That shared analytics contract is concurrently touched by [PR #448](https://github.com/injamhaqq/foremention/pull/448); FM-07 does not edit it here.

## Implemented containment and explicit limitation

- New `lib/product-analytics-authority.ts` designates `design_partner_application_submitted` as a *server-verified-only* event. This policy is a product measurement authority distinction, not a new entitlement or authorization mechanism.
- `lib/product-analytics.ts` rejects the event before `posthog.init()` and again inside the `before_send` hook. A direct `posthog.capture` call from the browser therefore cannot silently bypass the ordinary Foremention client capture path.
- Other public CTA, page-view, application-start and workspace analytics events remain untouched, as does the privacy event/property sanitizer.
- The canonical event name remains declared in `PRODUCT_ANALYTICS_EVENTS`, ready for a separately approved authoritative *server-side* persistence receipt. **No such server capture exists in this candidate**, so PostHog application-submit conversion counts should remain absent/unknown rather than become fabricated.
- Node regression tests exercise the event restriction and inspect both capture boundaries and the actual database-write/receipt order. They do not make any live submission or change a customer record.

**Explicit non-claim:** This patch blocks the specific trusted SDK capture path; a public browser SDK token is not an anti-fraud credential and an attacker can still send arbitrary events directly to a public PostHog ingest endpoint. First-party database records—not PostHog events—must govern customer conversions and billing.

## Required next integration — FM-03/FM-07/FM-00

1. On the reconciled PR #440 public/UI route, replace `?submitted=1` as proof of a received application. Produce success UI only from verified server-issued persistence acknowledgement (or query the trusted first-party record with strict access checks). Preserve silent honeypot behavior without confirming saved records.
2. Emit a privacy-preserving server-side `design_partner_application_submitted` event **only after** receiving a new persisted `design_partner_applications.id`, using idempotent capture/attempt records. Failed, duplicate, rate-limited and honeypot paths must not produce new-conversion events. Delivery failures must not undo or hide a committed application. No email/company/question text, IP address or URL query string may enter telemetry properties.
3. Resolve public click events through one canonical, truthful event dictionary (for example `public_sample_cta_clicked` and `public_evidence_inspection_clicked`, clearly **clicks**, not completed evidence reviews). Align the public component and `lib/product-analytics-contract.ts` together after reconciliation with #448.
4. Add negative browser/API tests for direct forged `/contact?submitted=1`, nonexistent intake ID, refresh/duplicate/honeypot and persisted success. Compare first-party application rows to server telemetry using stable **non-PII** idempotency, clearly separating ingestion completeness from canonical business truth.
5. Obtain owner decision on PostHog project IP anonymization and relevant privacy obligations; current connected scope lacks `project:write` and `data_catalog:read`. Do not silently enable session replay/autocapture.
6. FM-00 reviews write-set and exact-head checks, integrates in dependency order, validates production build SHA and verifies a controlled isolated journey before founder-approved deploy. No PR in this lane should self-merge.

**No production code or PostHog settings have been deployed/changed by FM-07.**
