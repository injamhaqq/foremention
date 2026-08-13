# Production password-security and acceptance evidence — 2026-08-13/14

This record captures production acceptance evidence for Foremention’s Free-plan compromised-password mitigation and the disposable production journey used to prove authentication, session revocation, onboarding, and one real cost-capped provider collection. It deliberately distinguishes Foremention’s application-level control from Supabase’s native paid leaked-password feature.

## Release under test

- Production application commit: `6ea9872e44bdf25c99f7dd258ef0714e9f314c8b`.
- PR #73: `Harden demo isolation and account signup safety`.
- Exact-main CI run `31709794762` completed successfully, including tests, dependency audit, lint, typecheck, build, Cloudflare Worker dry run, exact Cloudflare production release verification, live Inngest sync, and live Inngest execution probe.

## Free-plan password architecture

Foremention performs a server-side Pwned Passwords k-anonymous range check before accepting a new password. The plaintext password and complete SHA-1 hash are not sent to the external range service. If the range lookup is unavailable, the password mutation fails closed.

For email signup, a clean password causes Foremention to issue a short-lived one-time signup attestation. Only SHA-256 hashes of the attestation token and normalized email are stored in `private.signup_security_attestations`. The active Supabase `Before User Created` Postgres hook `public.hook_require_signup_security_attestation(jsonb)` atomically consumes a matching unexpired attestation and rejects direct email signup attempts that bypass Foremention.

The hook is `SECURITY INVOKER`. Production verification confirmed that `supabase_auth_admin` can execute it while `anon` and `authenticated` cannot. The private attestation store was observed empty immediately before acceptance testing.

## Live signup acceptance

GitHub Actions run `31726944930`, job `94537572377`, executed synthetic production requests from an external network runner and completed successfully.

### Known compromised strong password is rejected by Foremention

- Request: `POST https://foremention.com/api/auth/signup`.
- Password used for the synthetic test: `Password123!`.
- Observed HTTP status: `400`.
- Observed application message: `This password appears in known breach data. Choose a unique password you have not used elsewhere.`
- Result: PASS. The request stopped at password-safety enforcement rather than entering account creation.

### Unique strong password reaches normal confirmation flow

- Request: `POST https://foremention.com/api/auth/signup` with a synthetic address and a unique strong test-only password.
- Observed HTTP status: `200`.
- Observed response: `ok: true`, `session: false`, with the normal confirmation-flow message.
- Result: PASS. The clean-password path issued and consumed the expected signup attestation and reached normal Supabase confirmation behavior.

### Direct public Supabase signup without Foremention attestation is rejected

- Request: direct `POST` to production Supabase `/auth/v1/signup` using the public publishable key.
- No `signup_security_attestation` metadata was supplied.
- Observed HTTP status: `403`.
- Observed hook message: `Complete signup through Foremention before creating this account.`
- Result: PASS. Direct public signup cannot bypass Foremention’s password-safety boundary.

## Confirmed disposable account and session-security acceptance

The disposable account confirmation email was delivered to a Gmail plus-alias and its one-time Supabase verification link was consumed successfully, redirecting to `foremention.com`.

GitHub Actions production acceptance run `31730321164`, job `94548884886`, completed successfully with the confirmed disposable account.

Observed results:

- Two independent production logins returned HTTP `200`, `ok: true`, `session: true`.
- Authenticated `/app` returned HTTP `307` to `/app/onboarding`, proving the session was accepted and the account was correctly routed to setup rather than login.
- Production `POST /api/auth/password` rejected `Password123!` with HTTP `400` and the breach-data message.
- A fresh login with the original disposable password immediately succeeded afterward, proving the rejected password was not applied.
- `POST /api/auth/logout-all` returned HTTP `303` to `/login?reason=all_sessions_revoked`.
- A refresh token captured from the second independent session was then submitted directly to Supabase Auth and rejected with HTTP `400`, `refresh_token_not_found`.
- Result: PASS. The global refresh-session revocation behavior is live-proven while preserving the documented boundary that already-issued access JWTs may remain valid until expiry.

## Real provider collection acceptance

A synthetic production workspace named `Foremention Acceptance Test Co` was created only for acceptance testing. No real customer workspace was used.

GitHub Actions provider acceptance run `31730532324` completed successfully. Production Supabase independently recorded:

- Run ID: `d9c16871-72dc-4fcd-a208-d395a0e9e3b7`.
- Provider: `groq`.
- Exact model: `groq/compound-mini`.
- Methodology version: `3.0`.
- Run status: `complete`.
- Created: `2026-08-13 18:24:18.153909+00`.
- Started: `2026-08-13 18:24:29.737+00`.
- Completed: `2026-08-13 18:24:47.811+00`.
- Pre-run estimated maximum cost: `$0.006250`.
- Recorded actual run cost: `$0.008653`.
- Cost source on the provider attempt and answer: `estimated`.
- Input tokens: `5,428`.
- Output tokens: `570`.
- Total tokens: `5,998`.
- Provider latency: `3,461 ms`.
- Failed/rate-limited/excluded attempts: `0`.
- Persisted answers: `1`.
- Answer review status: `verified`.
- Persisted citations: `19`.
- Persisted source observations: `19`.
- Verified source observations: `19`.
- Source Map ID: `454d46f9-c89a-4b37-b89c-0904462c18af`.

The run stayed well below Foremention’s hard Groq per-run ceiling of `$0.10`. The answer and citation evidence were persisted and reviewed before terminal completion; no customer-outcome or causation claim is inferred from this synthetic acceptance run.

## Auth-hook control-plane state

The `Before User Created` hook is enabled in the production Supabase Auth Hooks dashboard using schema `public` and function `hook_require_signup_security_attestation`.

After activation, the Supabase Security Advisor reported no new warning for the private attestation table or hook. It continues to report `auth_leaked_password_protection` as disabled because Supabase’s native leaked-password feature is not enabled on the current Free plan.

That native warning is a known plan-limited residual. It must not be represented as cleared, hidden, or enabled by the application-level mitigation.

## Gate conclusion

The Foremention Free-plan compromised-password control is live-proven for signup, direct-signup bypass prevention, and the production password-update endpoint. Confirmed-account login and global refresh-session revocation are also live-proven. One real, reviewed, citation-bearing, cost-capped production Groq collection has been completed and independently verified in Supabase.

This evidence closes the application-level leaked-password mitigation gate. It does **not** claim that Supabase’s native Pro-only leaked-password toggle is enabled, and it does not remove the native advisor warning.