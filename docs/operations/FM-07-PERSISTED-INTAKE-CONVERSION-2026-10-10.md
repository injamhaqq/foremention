# FM-07 — First-party design-partner submission proof

**Checkpoint:** 2026-10-10. **Source base:** [FM-07 draft #483](https://github.com/injamhaqq/foremention/pull/483) exact commit `0643c5e1d63a33335a98c8f4c96465bebf654beb`.
**Integration owner:** FM-00; FM-03 co-owns public component/presentation files.
**Issue:** [#475](https://github.com/injamhaqq/foremention/issues/475).
**No merge, live customer test, PostHog settings change or production deployment.**

## Confirmed defect

The browser previously considered `/contact?submitted=1` a successful application, without any persisted first-party row. Honeypot and duplicate requests return plausible form success without a new receipt. Browser `design_partner_application_submitted` could thus overcount conversion, while an arbitrary visitor could display a misleading success state. Green draft #483 blocks that browser event, but does not replace it with a trustworthy server projection or fix the success UI.

## Bounded implementation

- New `lib/design-partner-intake-id.ts`: strict opaque UUID validation, with no PII in identifiers.
- New `lib/design-partner-receipt.ts`: read-only **server service-role** `design_partner_applications?select=id&id=eq.<UUID>&limit=1` existence lookup; invalid IDs, unavailable database or lookup errors fail closed. No application fields besides `id` are returned to the browser, and no public direct table policy is enabled.
- `app/contact/page.tsx`: only displays **Application received** after BOTH the query flag and a verified persisted intake receipt. An arbitrary query flag, syntactically valid but nonexistent UUID, duplicate-without-reference or honeypot success cannot show saved proof.
- `components/public-activation-analytics.tsx`: removes client-side query-string based submission capture completely. Ordinary page view, start, CTA and sample analytics still run.
- New `lib/design-partner-server-analytics.ts`: a narrow PostHog HTTP POST from the trusted server, **only after a new row is successfully persisted and returned** by the first-party database. Sends one event name, a deterministic SHA-256-derived random-UUID pseudonymous identity and event UUID for provider best-effort deduplication, `$process_person_profile: false`, `$geoip_disable: true`; never exports original intake UUID, company, work email, buyer questions, answer content, location or URL. Requires the server runtime `FOREMENTION_POSTHOG_PUBLIC_PROJECT_TOKEN` to contain the owner-verified token for the existing US PostHog project (no fallback key in source); it fails closed without that configuration. This is a release gate to verify separately with FM-00 before enabling telemetry. Uses the existing US endpoint and a 1.5s timeout; failure is logged without PII, does **not** roll back or hide a saved application.
- `app/api/design-partner/route.ts`: triggers event after original database persistence/receipt and notification pathway. Duplicate, honeypot, invalid, limited and failure branches return earlier and cannot emit a new conversion. No commercial account, paid pilot or subscription is created.
- Updates existing public-funnel tests to **require server-owned** conversion instead of weakening their coverage; adds new pure transport/route/receipt tests with an injected in-memory fetch stub and no real vendor requests.

## Critical trust and operations boundaries

- **Only first-party database receipt counts as an application**. The server-side PostHog event is a lossy projection, not guaranteed once-only delivery. The public PostHog ingest token can be used to forge any event; never treat PostHog alone as financial/commercial proof or base real customer counts on it. SHA-derived event UUID supports best-effort dedupe, not durable outbox/event exactly-once semantics.
- Read-only existence by an unguessable opaque UUID makes success dependent on a real stored row but does not authenticate which browser originally submitted it; the UI reveals no company/email or other persisted fields. An attacker holding another valid receipt UUID can display that record's receipt. Future sensitive applicant details must require separate authentication; do not extend this public lookup to them.
- Existing privacy policy says limited PostHog analytics to the US endpoint and no form fields. FM-00/privacy owner must approve server capture and settings (IP anonymization remained OFF at the last connected account check) before deploy, and monitor ingestion quotas.
- Changing public contact UI and form route **overlaps** stacked #440 and FM-03 #492. FM-00/03 must reconcile source changes and visually review accurate states on 320/375/768/1024/1440 viewports, with no unapproved copy/brand changes.
- No Supabase migration, public SELECT grant, RLS weakening, new package, provider execution, billing logic or production record manipulation.
- The route's existing privacy-safe honeypot and duplicate behaviour is preserved at the API response boundary; no new application count or receipt is fabricated.

## Completion gate

1. Full fresh exact-SHA CI, tests, lint, typecheck, build, CodeQL, browser acceptance and isolated authenticated journey; verify source tests also protect erroneous URL flag and duplicates.
2. FM-00 reconcile stacked dependency #483, overlapping #440/#492 and #448 click analytics, review privacy, approve merge only after founder approval and exact-SHA checks.
3. After controlled deploy, verify PostHog anonymized event ingestion against **authoritative new** design_partner_applications rows using synthetic isolated application fixtures clearly excluded from real customer analytics. Verify no false conversion on error/duplicate/honeypot/refresh, no PII, and a lookup failure leaves the form accessible.
4. Do not call Stage 0 completed without 3–5 external active design partners, a verified paid pilot/signed commitment, and 2 reviewed repeat cycles.
