# Production readiness evidence — 2026-08-14

This record continues Foremention’s evidence-before-theatre production-readiness work. It records only observations actually made against the deployed system or exact verified build. It does not convert unavailable operator controls into completed gates.

## Exact current production release

- PR #77, `Fix workspace export composite-key ordering`, merged successfully.
- Current merge/main commit: `d4a3ff255259caad9459f2e604097e349b959160`.
- Main CI run: `31735144089`.
- The main run completed successfully after the export fix and passed:
  - production dependency audit;
  - automated tests;
  - lint;
  - TypeScript typecheck;
  - production build;
  - Cloudflare Worker dry run;
  - verified build archive;
  - exact Cloudflare production release verification;
  - live Inngest function sync;
  - exact-build live Inngest execution.

The preceding documentation-only release `d46ca11c8914bac7954f731ab942751dc4c38648` initially observed the previous build during its first Inngest execution probe. Re-running the failed job after deployment convergence passed all release gates. That event is treated as deployment convergence evidence, not as proof of a persistent Inngest defect.

## Compromised-password and session controls

Issue #57 is closed as completed for the application-level Supabase Free mitigation. The native Supabase leaked-password warning remains a known plan-limited residual and is not represented as enabled.

Production acceptance proved:

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

This proves the production path can complete onboarding -> active buyer question -> queued background run -> real provider/model -> answer -> citations/source observations -> human review -> completed run and persisted Source Map under the configured spending controls.

## Workspace export defect discovered and fixed during acceptance

The first application-level tenant acceptance exposed a real production defect: `/api/export/workspace` returned HTTP 500.

The root cause was deterministic rather than tenant-related. `lib/workspace-export.ts` ordered every exported dataset by `id.asc`, while two persisted relationship/snapshot tables intentionally do not have an `id` column:

- `run_prompt_selections`, keyed by `run_id` + `prompt_id`;
- `verified_claim_evidence`, keyed by `claim_id` + `evidence_item_id`.

PR #77 changed only deterministic pagination ordering for those exceptional datasets:

- `run_prompt_selections`: `run_id.asc,prompt_id.asc`;
- `verified_claim_evidence`: `claim_id.asc,evidence_item_id.asc`;
- all other datasets retain `id.asc`.

Regression coverage was added. The PR passed dependency audit, tests, lint, typecheck, build, and Worker dry run before merge. The repaired endpoint was then re-tested only after exact production deployment of `d4a3ff255259caad9459f2e604097e349b959160`.

## Reciprocal application-level tenant isolation — completed

Live acceptance run `31735530309` used two fresh synthetic, confirmed Foremention accounts and two newly created synthetic organizations. Each tenant received a unique marker.

### Search boundary

Tenant A:

- own-marker `/app/search` returned HTTP 200 with an own-workspace result;
- searching Tenant B’s marker returned HTTP 200 with the product no-match state.

Tenant B:

- own-marker `/app/search` returned HTTP 200 with an own-workspace result;
- searching Tenant A’s marker returned HTTP 200 with the product no-match state.

### Complete workspace export boundary

Tenant A export:

- HTTP 200;
- `Content-Type: application/zip`;
- archive size observed: 34,881 bytes;
- 64 archive entries;
- own tenant marker present;
- Tenant B marker absent.

Tenant B export:

- HTTP 200;
- `Content-Type: application/zip`;
- archive size observed: 34,881 bytes;
- 64 archive entries;
- own tenant marker present;
- Tenant A marker absent.

The run concluded `RECIPROCAL_TENANT_ISOLATION PASS`. This closes the application-level reciprocal search/export gate and is separate from the earlier database-level RLS probes.

## Authenticated mobile / cross-browser acceptance — completed

The same live run `31735530309` exercised the deployed application at a 390x844 mobile viewport with device scale factor 2 in both Chromium and Firefox.

The following authenticated routes returned HTTP 200, rendered meaningful page content, stayed out of the login redirect, and had no horizontal viewport overflow in both browsers:

- `/app`;
- `/app/prompts`;
- `/app/runs`;
- `/app/source-map`;
- `/app/settings`;
- `/app/search` with the tenant’s own marker.

For each route, observed `innerWidth` and document `scrollWidth` were both 390 pixels.

The synthetic workspace used for this browser run did not contain a reviewed source link, so Source X-Ray itself was not exercised in this specific mobile pass. Source Map was exercised. Do not expand this evidence into a claim that every Source X-Ray state was mobile-tested.

The run concluded `AUTHENTICATED_MOBILE_CROSS_BROWSER PASS`.

## Synthetic credential cleanup

The fresh synthetic acceptance identities were temporary test principals only.

After acceptance:

- each test password was replaced with a cryptographically random unknown value;
- Supabase global logout returned HTTP 204 for each account;
- the previous temporary test password was verified rejected for each account.

No temporary acceptance password should be treated as a continuing credential.

## Supabase security-advisor review

The current Security Advisor still reports the native `auth_leaked_password_protection` warning. This remains expected on the current plan and is a truthful residual.

The advisor also flags several authenticated-callable `SECURITY DEFINER` RPCs. Their live definitions were inspected before taking action. They are not anonymous mutation functions:

- `anon` does not have execute permission on the reviewed functions;
- `complete_onboarding` requires `auth.uid()` and creates/returns only the authenticated actor’s workspace;
- `has_org_role` and `is_org_member` derive membership from `auth.uid()`;
- `reserve_run_quota`, `reserve_run_budget`, and `release_queued_run` require an authenticated actor and verify owner/analyst membership for the supplied organization before privileged writes.

Those authenticated execute grants are part of the intended application contract. They were not revoked merely to silence a generic advisor warning, because doing so would break legitimate onboarding/collection behavior without improving the tenant boundary.

## Monitoring / Sentry gate — still open

The exact archived production build was inspected.

Findings:

- Sentry client/server SDK code is present in the application;
- the compiled client reads `NEXT_PUBLIC_SENTRY_DSN` conditionally;
- the exact production client build did not contain an inlined public Sentry DSN, so browser Sentry is not proven active;
- the Worker bundle supports runtime `SENTRY_DSN` / `SENTRY_ENVIRONMENT`, but the public build artifact cannot prove whether the encrypted runtime value is configured;
- no harmless controlled event has been observed in an operator Sentry alert channel.

The monitoring gate therefore remains open. Do not create a public crash endpoint merely to satisfy the checklist. Close this gate only after production Sentry is intentionally configured and a harmless controlled event is observed by the operator.

## Backup -> restore gate — still open

The production Supabase project remains active and healthy at project reference `vuujwdxivjsdikdstwib` in `ap-northeast-2`.

A disposable Supabase development branch was cost-checked at `$0.01344/hour` and, with operator authorization, branch creation was attempted specifically for a safe restore drill. Supabase rejected the request because development branching is available only on the Pro plan. No branch was created and production was not modified.

There is no second Supabase project on the connected account that can safely serve as a restore destination. A true backup -> restore drill therefore remains unproven on the current Free setup.

Close this gate only after an off-site logical dump is restored into a separate disposable Postgres/Supabase target, or after an operator-approved plan/control change provides a separate restore target. Never restore the drill over production.

## Legal / commercial / operator approval — still open

Foremention already publishes substantive Privacy and Terms pages. They cover product data, providers, analytics, security, retention/deletion, customer authority, evidence limits, acceptable use, third-party services, billing boundaries, suspension, ownership, and service availability.

Those pages are implementation evidence, not a substitute for founder/operator or counsel approval. Entity/jurisdiction details, paid activation/order forms, DPA/subprocessor commitments, exact retention obligations, support expectations, incident-response ownership, and related commercial decisions remain human business approvals.

## Current gate status

### Closed with production evidence

- exact production release provenance for `d4a3ff255259caad9459f2e604097e349b959160`;
- dependency/test/lint/type/build/dry-run gates;
- exact Cloudflare release verification;
- live Inngest synchronization and exact-build execution;
- Free-plan compromised-password application mitigation;
- direct-signup bypass protection through the Before User Created hook;
- confirmed-account login;
- compromised-password update rejection without mutation;
- all-device refresh-session revocation;
- fresh cost-capped real Groq collection;
- persisted answer/citation/source-observation/human-review/Source Map path;
- full workspace export HTTP 500 root cause fixed and regression-tested;
- reciprocal application-level cross-tenant search isolation;
- reciprocal complete workspace ZIP isolation;
- representative authenticated Chromium + Firefox mobile acceptance.

### Still open

- true backup -> restore into an isolated target;
- configured Sentry production event/alert delivery observed by the operator;
- founder/operator legal, billing, retention, subprocessor, support and incident-response approvals.

Source X-Ray was not exercised by the final fresh synthetic mobile workspace because it had no reviewed source link. Keep that narrower nuance separate from the completed general authenticated mobile/cross-browser gate.

No open gate above should be marked complete based only on code presence, configuration intention, plan assumptions, or a substitute test.
