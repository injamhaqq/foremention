# Experiment — getsentry/sentry (register disposition: COMPLETE)

**Result: PARTIAL — Sentry is configured on the Worker; delivery to the operator is not yet proved. A bounded probe now exists to prove it after the next deploy.** 2026-10-12.

## Acceptance (from the repository register)

> Bounded non-sensitive failure reaches operator; no duplicate monitor; email fallback if paid quota unavailable.

## What exists (checked 2026-10-12, names only — no values read)

- Worker `foremention-mvp` secrets include **`SENTRY_DSN`** and `NEXT_PUBLIC_SENTRY_DSN`; plain var `NEXT_PUBLIC_SENTRY_ENVIRONMENT`. No `SENTRY_ENVIRONMENT` (Worker defaults to `production`). Cloudflare Workers Logs `observability` is not enabled in script settings; no tail consumers.
- `worker/index.ts` wraps the Worker in `Sentry.withSentry(...)` (`@sentry/cloudflare` ^10.68) only when `SENTRY_DSN` is set: `tracesSampleRate 0.05`, `sendDefaultPii false`, no breadcrumbs/cookies/headers/bodies, `beforeSend: scrubSentryEvent` (`lib/sentry-privacy.ts` deletes user/request/extra/breadcrumbs/message and replaces exception values with "Application error").
- Browser side: `@sentry/react` used from `app/layout.tsx` / error boundaries.
- Email operator path: `lib/operator-alerts.ts` + `POST /api/ops/operator-alert-probe` — fixed recipient from `operator_alert_config` (service-role only), idempotent per deployed build commit, ≤3 attempts, no caller input. Ledger evidence: one delivery `sent` on 2026-08-14 (build `3940a7a`); `operator_alert_config.enabled = true` with a recipient set. **The email fallback is proved; Sentry delivery is not.**
- Not verifiable from here: Sentry project quota/plan and whether events arrive (no Sentry account access).

## Change in this PR (no new monitor)

The existing operator alert probe now also exercises Sentry, so there is still exactly **one** operator-triggered monitor:

- `lib/sentry-operator-probe.ts` — `captureSentryOperatorProbe(buildCommit)` sends one `captureException` with error name `ForementionOperatorAlertProbe`, fixed fingerprint `foremention-operator-alert-probe`, level `warning`, tags `foremention_probe=operator_alert` and `build_commit=<12 chars>`. No customer, request, recipient or message data; returns `sentry_not_configured` when no Sentry client is active; never throws.
- `lib/operator-alerts.ts` — `sendOperatorAlertProbe(buildCommit, { onDeliveryAttempt })` calls the hook only when a delivery is actually attempted (first request for a build or a bounded retry), after the idempotency short-circuit, so repeated POSTs do not multiply Sentry events. Hook failures never block the email.
- `app/api/ops/operator-alert-probe/route.ts` — response gains `telemetry: "sentry_captured" | "sentry_not_configured" | "sentry_failed" | "not_attempted"`.
- Test added in `tests/operator-alert-monitoring.test.mjs`.

## How the operator verifies (after the main agent deploys)

1. `curl -X POST https://<site>/api/ops/operator-alert-probe` once.
   - Expect `status: "sent"` (email) and `telemetry: "sentry_captured"`.
   - `telemetry: "sentry_not_configured"` means the route handler did not see an initialised Sentry client — record Sentry as **not active**; the email path remains the operator alert.
2. Confirm the probe email arrived at the configured operator inbox (subject `Foremention production alert probe — <sha7>`).
3. In Sentry → Issues, search `foremention_probe:operator_alert` (or error type `ForementionOperatorAlertProbe`); confirm one event tagged with the deployed build. Then resolve/ignore it — the fixed fingerprint keeps all future probes in this one issue.
4. If the Sentry plan has no quota, the event will not appear: the email path is the fallback by design; no further action.

Only when step 3 succeeds is "bounded non-sensitive failure reaches operator" proved for Sentry.

## Side note for the owner

`BRAVE_SEARCH_API_KEY` is bound on the Worker as a **plain_text** var (visible in dashboard/settings API), unlike other keys which are `secret_text`. Recommend re-adding it as a secret (`wrangler secret put BRAVE_SEARCH_API_KEY`) and removing the plain var. Value was not read.
