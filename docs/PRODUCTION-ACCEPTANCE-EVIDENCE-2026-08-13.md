# Foremention production acceptance evidence — 2026-08-13

This is a point-in-time acceptance artifact for the production release line. It records only observations actually made against production or exact-main CI. It does not convert configured-but-unprobed dependencies into passing gates.

## Release provenance

- Canonical repository: `injamhaqq/foremention`.
- Main release observed during acceptance: `2c21ac1624f4067dbd04621b3905a2a6be5d750d`.
- Change: PR #53, `Harden password recovery session boundary`.
- PR-head CI: run `31677417994`, success.
- Exact-main CI: run `31677581726`, success.
- Exact-main CI completed the production dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry-run, and production artifact upload.
- Production `/api/health` subsequently reported `buildCommit` equal to `2c21ac1624f4067dbd04621b3905a2a6be5d750d`.
- The same health observation reported Worker, D1, and Supabase `reachable`; Inngest plus Gemini, Groq, and OpenRouter remained `configured_not_probed`.

## Password recovery boundary

### Defect observed before PR #53

Direct unauthenticated navigation to `/reset-password` rendered the new-password form and the sentence that the recovery link had verified the browser. The password-update API still required a valid Supabase session, so this observation was a truth/purpose-boundary defect rather than evidence of a password-reset bypass.

### Fix

PR #53 introduced a short-lived HTTP-only recovery-purpose cookie. Recovery verification marks that purpose; ordinary auth handoffs clear it. Both the reset page and the password-update API require the recovery purpose, and a successful password update clears it.

### Production re-test

After production reported the PR #53 release SHA, direct unauthenticated navigation to `/reset-password` resolved to `/forgot-password`. The recovery request page rendered instead of falsely claiming that a recovery link had already been verified.

This closes the direct-route recovery-purpose defect. The full emailed recovery-link round trip remains an open customer-journey acceptance item.

## Public auth and workspace protection

Observed on the deployed domain:

- `/login`: rendered successfully and exposed the password-recovery and account-creation paths.
- `/signup`: rendered successfully and linked back to sign-in.
- `/forgot-password`: rendered the recovery-request form.
- `/app`: unauthenticated access was rejected as login-required.
- `/app/onboarding`: unauthenticated access was rejected as login-required.
- The fictional demo entry is the login-page POST to `/api/auth/demo`; `/demo` is not defined as a public GET route. The demo entry text states that no account, provider call, or customer data is required.

These observations establish the public entry/protection boundary only. Authenticated onboarding, demo entry/exit, logout, mobile, empty/error states, and session persistence still require deployed-browser acceptance with an approved disposable account.

## Reciprocal production tenant-isolation probe

Two existing production organizations were selected because each had a distinct owner and populated rows in the core evidence path. Identifiers are intentionally omitted from this committed artifact.

The probe executed under `SET LOCAL ROLE authenticated`, `row_security = on`, and a simulated JWT `sub` for the selected owner. It did not use the service role to evaluate visibility.

### Organization A owner

| Dataset | Own rows visible | Organization B rows visible |
| --- | ---: | ---: |
| Prompts | 5 | 0 |
| Runs | 7 | 0 |
| Run answers | 17 | 0 |
| Citations | 65 | 0 |
| Sources | 65 | 0 |
| Notifications | 6 | 0 |
| Organization memberships | 1 | 0 |

### Organization B owner

| Dataset | Own rows visible | Organization A rows visible |
| --- | ---: | ---: |
| Prompts | 5 | 0 |
| Runs | 2 | 0 |
| Run answers | 5 | 0 |
| Citations | 80 | 0 |
| Sources | 75 | 0 |
| Notifications | 2 | 0 |
| Organization memberships | 1 | 0 |

The reciprocal direction matters: this was not a single user's inability to see one other organization. Both owners retained their own data and received zero rows for the other organization's populated datasets.

## Rollback-only mutation isolation probe

A no-op update probe was executed inside an explicit transaction under Organization A's authenticated owner context with RLS enabled:

| Mutation target | Own rows affected | Organization B rows affected |
| --- | ---: | ---: |
| Prompts (`active = active`) | 5 | 0 |
| Membership (`role = role`) | 1 | 0 |

The transaction was rolled back. No production row changes from this probe were persisted.

This is live mutation-isolation evidence for populated prompt and membership tables. It does not claim endpoint-level search/export isolation, and it does not claim opportunity/action isolation where representative populated rows were unavailable during this acceptance pass.

## Gates deliberately left open

- Full signup → email confirmation → login acceptance with a disposable account.
- Full emailed password-recovery round trip.
- Authenticated onboarding and workspace acceptance, including mobile and representative empty/error states.
- Demo POST entry and exit isolation in an interactive browser session.
- Application-level cross-organization search/export acceptance and representative opportunity/action isolation.
- One deliberately cost-capped real provider collection preserving provider, exact model, date, spend, failures, answer, citations, Source X-Ray inspection, and human review.
- Bounded Inngest production execution proof.
- Controlled production monitoring error with confirmed operator alert receipt.
- Backup-to-restore drill.
- All-device session-revocation drill using a disposable account.
- Legal and commercial approvals identified in `PRODUCTION-READINESS.md`.

## Acceptance rule

Do not replace any open item above with implementation evidence alone. A configured provider is not a probed provider; a backup is not a restore drill; monitoring code is not alert receipt; and an auth implementation is not an end-to-end disposable-account acceptance run.
