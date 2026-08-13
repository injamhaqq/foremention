# Production auth smoke

This runner converts the core production HTTP/auth boundary into a repeatable, credential-safe check without storing customer or disposable-account secrets in the repository.

## Default public-only smoke

```bash
node scripts/production-auth-smoke.mjs
```

The default invocation checks:

- `/api/health` returns success and preserves the full health body in the JSON evidence output;
- direct `/reset-password` access is rejected back to `/forgot-password`;
- unauthenticated `/app` is not accessible;
- no signup, email, provider, billing, integration, or destructive action is triggered.

## Exact release verification

Cloudflare Workers Builds is the production deploy system for Foremention. GitHub Actions verifies the repository and archives the built artifact, but the artifact upload is not itself a deployment.

For an exact-release check, provide the full Git commit expected from the live health contract:

```powershell
$env:FOREMENTION_EXPECTED_BUILD_COMMIT="<40-character-git-sha>"
node scripts/production-auth-smoke.mjs
Remove-Item Env:FOREMENTION_EXPECTED_BUILD_COMMIT
```

When an expected commit is supplied, the runner performs bounded polling of the custom-domain `/api/health` endpoint until both conditions are true:

- the health endpoint is successful; and
- `buildCommit` exactly equals the expected 40-character Git SHA.

The polling window is capped at 300 seconds. `FOREMENTION_RELEASE_WAIT_SECONDS` may reduce that window when a shorter operator check is appropriate.

Main-branch GitHub CI supplies `${{ github.sha }}` automatically after its tests/build/dry-run steps. This turns the custom-domain release provenance and the public auth boundary into a release check rather than a chat-only/manual claim.

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

A green public main-branch run proves that the custom domain reported the exact merged Git commit and that the public auth boundaries exercised by the script behaved correctly at that release. A green authenticated run proves the additional HTTP/session boundary exercised by that disposable account.

Neither run, by itself, proves:

- signup and confirmation-email delivery;
- mailbox receipt or recovery-link round trip;
- onboarding/mobile visual quality;
- provider/Inngest collection;
- cross-organization behavior in two simultaneous authenticated browser sessions;
- Sentry receipt, backup/restore, or all-device revocation.

Keep those gates open until they have their own production evidence. Do not turn code-level or HTTP-only smoke results into broader claims.
