# Production auth smoke

This runner converts the core authenticated production acceptance boundary into a repeatable, credential-safe check without storing customer or disposable-account secrets in the repository.

## Default public-only smoke

```bash
node scripts/production-auth-smoke.mjs
```

The default invocation checks:

- `/api/health` returns success and preserves the full health body in the JSON evidence output;
- direct `/reset-password` access is rejected back to `/forgot-password`;
- unauthenticated `/app` behavior is recorded;
- no signup, email, provider, billing, integration, or destructive action is triggered.

## Authenticated disposable-account smoke

Use a dedicated, already-confirmed production acceptance account. Never use a real customer's credentials.

PowerShell:

```powershell
$env:FOREMENTION_ACCEPTANCE_EMAIL="acceptance-account@example.com"
$env:FOREMENTION_ACCEPTANCE_PASSWORD="<one-time-or-disposable-password>"
node scripts/production-auth-smoke.mjs
Remove-Item Env:FOREMENTION_ACCEPTANCE_EMAIL
Remove-Item Env:FOREMENTION_ACCEPTANCE_PASSWORD
```

The authenticated run additionally verifies:

- `/api/auth/login` establishes a session;
- the protected `/app` route loads with that session;
- `/api/auth/logout` returns the expected local-signout redirect;
- the same cookie jar can no longer load `/app` after logout.

The runner reports cookie **names only**. It never prints passwords or cookie values.

## Recovery-email request

Only after deciding that sending one production recovery email is appropriate:

```powershell
node scripts/production-auth-smoke.mjs --request-recovery
```

This adds a request to `/api/auth/forgot-password` for the same disposable acceptance account and records the API result. The flag does **not** follow the email link or change the password; those remain separate acceptance steps because they require possession of the mailbox and the real recovery callback.

## Optional base URL

The default target is `https://foremention.com`. Override only when intentionally testing another environment:

```powershell
$env:FOREMENTION_BASE_URL="https://staging.example.com"
```

## Evidence interpretation

A green run proves the HTTP/session boundary exercised by that invocation. It does not, by itself, prove:

- signup and confirmation-email delivery;
- mailbox receipt or recovery-link round trip;
- onboarding/mobile visual quality;
- provider/Inngest collection;
- cross-organization behavior in two simultaneous authenticated browser sessions;
- Sentry receipt, backup/restore, or all-device revocation.

Keep those gates open until they have their own production evidence. Do not turn code-level or HTTP-only smoke results into broader claims.
