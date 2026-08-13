# Production password-security evidence — 2026-08-13

This record captures the production acceptance evidence for Foremention’s Free-plan compromised-password mitigation. It deliberately distinguishes the application-level control from Supabase’s native paid leaked-password feature.

## Release under test

- Production application commit: `6ea9872e44bdf25c99f7dd258ef0714e9f314c8b`.
- PR #73: `Harden demo isolation and account signup safety`.
- Exact-main CI run `31709794762` completed successfully, including tests, dependency audit, lint, typecheck, build, Cloudflare Worker dry run, exact Cloudflare production release verification, live Inngest sync, and live Inngest execution probe.

## Free-plan architecture

Foremention performs a server-side Pwned Passwords k-anonymous range check before accepting a new password. The plaintext password and complete SHA-1 hash are not sent to the external range service. If the range lookup is unavailable, the password mutation fails closed.

For email signup, a clean password causes Foremention to issue a short-lived one-time signup attestation. Only SHA-256 hashes of the attestation token and normalized email are stored in `private.signup_security_attestations`. The active Supabase `Before User Created` Postgres hook `public.hook_require_signup_security_attestation(jsonb)` atomically consumes a matching unexpired attestation and rejects direct email signup attempts that bypass Foremention.

The hook is `SECURITY INVOKER`. Production verification confirmed that `supabase_auth_admin` can execute it while `anon` and `authenticated` cannot. The private attestation store was observed empty immediately before acceptance testing.

## Live production acceptance

GitHub Actions run `31726944930`, job `94537572377`, executed synthetic production requests from an external network runner and completed successfully.

### A. Known compromised strong password is rejected by Foremention

- Request: `POST https://foremention.com/api/auth/signup`.
- Password used for the synthetic test: `Password123!`.
- Observed HTTP status: `400`.
- Observed application message: `This password appears in known breach data. Choose a unique password you have not used elsewhere.`
- Result: PASS. The request stopped at password-safety enforcement rather than entering account creation.

### B. A unique strong password reaches the normal signup path

- Request: `POST https://foremention.com/api/auth/signup` with a synthetic address and a unique strong test-only password.
- Observed HTTP status: `200`.
- Observed response: `ok: true`, `session: false`, with the normal confirmation-flow message.
- Result: PASS. The clean-password path issued and consumed the expected signup attestation and reached normal Supabase confirmation behavior.

The unique test-only password is intentionally omitted from this evidence document.

### C. Direct public Supabase signup without Foremention attestation is rejected

- Request: direct `POST` to the production Supabase `/auth/v1/signup` endpoint using the public project publishable key.
- The request used a unique strong test-only password but did not include `signup_security_attestation` metadata.
- Observed HTTP status: `403`.
- Observed hook message: `Complete signup through Foremention before creating this account.`
- Result: PASS. Public direct signup cannot bypass Foremention’s compromised-password check.

## Auth-hook control-plane state

The `Before User Created` hook was enabled in the production Supabase Auth Hooks dashboard using schema `public` and function `hook_require_signup_security_attestation`.

After activation, the Supabase Security Advisor was rerun. It reported no new warning for the private attestation table or hook. The advisor continues to report `auth_leaked_password_protection` as disabled because Supabase’s native leaked-password feature is not enabled on the current Free plan.

That native warning is a known plan-limited residual. It must not be represented as cleared, hidden, or enabled by the application-level mitigation.

## Remaining acceptance before issue #57 can be closed

- Prove through a confirmed disposable account that the password-recovery/update path rejects a known compromised strong password before mutation.
- Record the recovery result and verify that the previously valid password still authenticates afterward.

Signup-side compromised-password enforcement and direct-signup bypass protection are live-proven. The recovery criterion remains open until the emailed recovery journey is completed.