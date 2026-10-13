# Chat02 proposal — Supabase Auth configuration, sessions and credential hygiene (CV-08 / A06 / A12)

**Status:** proposal for FM-00 + founder. Nothing here was changed. Values below
were read on 2026-10-13 via the Supabase Management API (`GET /v1/projects/{ref}/config/auth`),
printing **only non-secret fields** (no keys, SMTP passwords or provider secrets were output).

## Current production Auth settings (non-secret)

| Setting | Value | Assessment |
|---|---|---|
| `site_url` | `https://foremention.com` | correct |
| redirect allow-list | 2 entries: `foremention.com`, `www.foremention.com`; no wildcard | good; keeps GoTrue redirects on-site (app-side `next` handling fixed separately on this branch) |
| `mailer_autoconfirm` | `false` | email must be confirmed before password login — good; invitation acceptance now also checks `email_confirmed_at` as defense in depth |
| `mailer_secure_email_change_enabled` | `true` | good |
| `disable_signup` | `false` | expected for self-serve |
| `external_google_enabled` | `false` | matches `FOREMENTION_GOOGLE_AUTH_ENABLED` gating |
| `jwt_exp` | 3600 s | standard |
| refresh rotation / reuse interval | on / 10 s | good |
| `sessions_timebox` / `sessions_inactivity_timeout` | 0 / 0 (unlimited) | **gap**: a stolen refresh token stays usable indefinitely while rotated; the app refresh cookie lives 30 days |
| `password_min_length` | 12 + all four character classes | strong |
| `password_hibp_enabled` | `false` | **gap** (matches the Security Advisor warning); Supabase documents leaked-password protection as a paid-plan feature — cost decision |
| `security_update_password_require_reauthentication` | `false` | acceptable given the app-side recovery-AMR gate; see below |
| `security_captcha_enabled` | `false` | signup/recovery abuse relies on rate limits only (`rate_limit_email_sent` = 30/h) |
| `mfa_totp_enroll_enabled` | `true` | TOTP enrollment available; app does not require AAL2 anywhere |
| custom SMTP | configured | delivery/auth (SPF/DKIM/DMARC) not verified here |

## Proposals (founder/FM-00 approval required; each is a live config change)

1. **Session lifetime:** set `sessions_inactivity_timeout` (e.g. 7 days) and `sessions_timebox` (e.g. 30 days, matching the refresh cookie). Rollback: set back to 0. Test: old refresh token rejected after the window; `/api/auth/refresh` redirects to `/login?reason=session_expired`.
2. **Leaked-password protection:** enable `password_hibp_enabled` **only if** the plan includes it (spend decision). Rollback: disable.
3. **CAPTCHA** on signup/recovery (Turnstile fits the Cloudflare stack) — needs a site key secret and Chat05 UI work; propose only after abuse is observed or before paid launch.
4. **Step-up for destructive actions** — implemented in code on this branch (amr-based); optional future: require AAL2 for owners once MFA is offered in UI.

## A06 — historical synthetic credential

- GitHub issue #323 is **closed** (2026-10-12 19:46 IST) and owner-maintenance PR #546 is closed; owner comments report rotation, session revocation, stale-user ban and artifact deletion with workflow runs 38229264836 / 38230159562. Chat02 did not access, rotate or print any credential; these are **owner records**, not independent verification.
- Branch scan on 2026-10-13: a pattern search of the working tree (Supabase `sb_secret_`, JWT-shaped strings, Paddle `pdl_`, GitHub `ghp_`, Resend `re_` prefixes) found no committed secret values; only `.env.example`, `lib/secret-rotation.ts` and its test match by filename. Repository CI already runs gitleaks/Security workflows (see prior green runs in `02-status.md`).
- Remaining owner-only step: confirm retention/redaction of any historical Actions logs/artifacts that contained the old credential (GitHub retains logs per repository retention policy); record a closure note on #323. No action by an agent.
