# Production readiness evidence — 2026-08-14

This record continues Foremention’s evidence-before-theatre production-readiness work. It records only observations that were actually made against the deployed system or exact verified build. It does not convert unavailable operator controls into completed gates.

## Exact current production release

- PR #74, `Record production password-security acceptance evidence`, merged successfully.
- Merge/main commit: `26d6446155582d44d0be07e299124a10ab288f38`.
- Main CI run `31732656591` completed successfully.
- Required steps passed: dependency advisories, tests, lint, typecheck, production build, Cloudflare Worker dry run, verified build archive, exact Cloudflare production release verification, live Inngest function sync, and live Inngest execution probe.

## Compromised-password and session controls

Issue #57 is closed as completed for the application-level Supabase Free mitigation. The native Supabase leaked-password warning remains a known plan-limited residual and is not represented as enabled.

Production acceptance already proved:

- known compromised strong password `Password123!` rejected by Foremention signup with HTTP 400;
- unique strong password reached the normal confirmation flow with HTTP 200;
- direct public Supabase signup without the Foremention one-time attestation rejected with HTTP 403;
- two independent confirmed-account logins succeeded;
- authenticated `/app` access succeeded;
- password update rejected the compromised password with HTTP 400 and a subsequent login proved the existing password was unchanged;
- `POST /api/auth/logout-all` completed the all-device revocation flow;
- a second independent session refresh token was rejected afterward with `refresh_token_not_found`.

The Supabase `Before User Created` hook remains enabled with the private one-time signup attestation design. The private attestation storage is not a substitute for Supabase’s native paid leaked-password toggle, and the native advisor warning remains intentionally visible.

## Real provider collection

A fresh synthetic production workspace completed one real controlled collection:

- organization name: `Foremention Acceptance Test Co`;
- run: `d9c16871-72dc-4fcd-a208-d395a0e9e3b7`;
- provider: `groq`;
- exact model: `groq/compound-mini`;
- methodology: `3.0`;
- terminal status: `complete`;
- recorded actual cost: `$0.008653`;
- cost source: `estimated`;
- input tokens: `5,428`;
- output tokens: `570`;
- total tokens: `5,998`;
- failed/rate-limited/excluded attempts: `0`;
- persisted verified answers: `1`;
- persisted citations: `19`;
- persisted source observations: `19`;
- verified source observations: `19`;
- Source Map: `454d46f9-c89a-4b37-b89c-0904462c18af`;
- Source Map methodology: `3.0`.

This proves the current production path can complete onboarding -> active buyer question -> queued background run -> real provider/model -> answer -> citations/source observations -> human review -> completed run and persisted Source Map under the configured spending controls.

## Supabase security-advisor review

The current Security Advisor was rerun after the hook rollout.

The advisor still reports the native `auth_leaked_password_protection` warning. This is expected and remains a truthful residual on the current plan.

The advisor also flags several authenticated-callable `SECURITY DEFINER` RPCs. Their live definitions were inspected before taking action. They are not anonymous/public mutation functions:

- `anon` does not have execute permission on the reviewed functions;
- `complete_onboarding` requires `auth.uid()` and creates/returns only the authenticated actor’s workspace;
- `has_org_role` and `is_org_member` derive membership from `auth.uid()`;
- `reserve_run_quota`, `reserve_run_budget`, and `release_queued_run` require an authenticated actor and verify owner/analyst membership for the supplied organization before privileged writes.

Those authenticated execute grants are part of the intended application contract. They were not revoked merely to silence a generic advisor warning, because doing so would break legitimate onboarding/collection behavior without improving the tenant boundary.

## Application-level cross-tenant search/export gate

A reciprocal production search/export acceptance workflow was attempted using the two previously created disposable acceptance identities.

The first run (`31732765060`) failed before any Foremention request because the temporary Node runner mixed CommonJS `require()` with top-level `await`. Therefore that run is **not** tenant-isolation evidence.

The temporary workflow was removed from the active branch. A corrected rerun that would have embedded disposable credentials in another public workflow was intentionally not forced through after the platform safety layer blocked it. The narrower application endpoint gate therefore remains open. Existing reciprocal database-level RLS read/mutation evidence remains valid but is not relabelled as application search/export proof.

Next acceptable completion path: run the reciprocal test using private ephemeral credentials/session storage (browser profile/vault or repository secrets), never hardcoded credentials in source or public workflow logs.

## Monitoring / Sentry gate

The exact archived build artifact from main CI run `31732656591` was inspected.

Findings:

- Sentry client/server SDK code is present in the compiled artifact;
- the client Sentry bundle exists;
- the compiled client reads `NEXT_PUBLIC_SENTRY_DSN` conditionally;
- in the exact verified artifact, that public DSN was not inlined, so browser-side Sentry is not proven active for this release;
- the Worker bundle supports runtime `SENTRY_DSN` / `SENTRY_ENVIRONMENT`, but the public build artifact cannot prove whether the encrypted Worker runtime value is configured;
- a controlled operator alert has not been observed.

The monitoring gate therefore remains open. Do not create a public crash endpoint merely to satisfy the checklist. Close this gate only after the production Sentry environment is intentionally configured and a harmless controlled event is observed in the operator’s alert channel.

## Backup -> restore gate

The production Supabase project is active and healthy. The connected project reference is `vuujwdxivjsdikdstwib` in `ap-northeast-2`.

A true backup -> restore drill was **not** performed against production. The current connected control plane does not expose a safe downloadable Free-plan backup/restore-to-new-target flow, and restoring over the live production project would be destructive and would create unnecessary downtime.

The gate stays open until an off-site logical dump is produced and restored into a separate disposable Postgres/Supabase target, or the project is moved to a plan/control path that supports an operator-approved restore target. A schema-only development branch is not sufficient because it does not prove production data restoration.

## Current gate status

### Closed with production evidence

- exact current production release provenance;
- dependency/test/lint/type/build/dry-run gates;
- exact Cloudflare release verification;
- live Inngest synchronization and execution;
- Free-plan compromised-password application mitigation;
- direct-signup bypass protection through the Before User Created hook;
- confirmed-account login;
- compromised-password update rejection without mutation;
- all-device refresh-session revocation;
- fresh cost-capped real Groq collection;
- persisted answer/citation/source-observation/human-review/Source Map path.

### Still open

- reciprocal application-level cross-tenant search/export acceptance using private ephemeral credentials;
- true backup -> restore into an isolated target;
- configured Sentry production alert delivery observed by the operator;
- representative deployed mobile/cross-browser authenticated acceptance;
- legal/commercial/billing/retention/subprocessor/incident-response approvals that require operator or counsel ownership.

No open gate above should be marked complete based only on code presence, configuration intention, or a substitute test.
