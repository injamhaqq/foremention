# Production readiness evidence — 2026-08-14

This record is Foremention’s evidence-before-theatre production-readiness sign-off for the **controlled private beta**. It records observed production behavior, exact verified releases, bounded synthetic acceptance data, and explicit residual limitations. It does not turn unavailable paid controls, outside legal review, or unverified third-party configuration into completed evidence.

## Final controlled-private-beta status

**GREEN for controlled/private beta.**

This is not a paid/general-availability launch declaration. Current self-serve production remains the enforced `free_beta` entitlement. Paid Core, Signal, and Intelligence packaging is planned commercial packaging and is not a working checkout until its payment integration is verified. A future paid/GA activation remains a separate project requiring the actual payment lifecycle, contracting entity and tax facts, customer-specific legal/DPA decisions, and jurisdiction-specific approvals.

Issue #76, `Close remaining production proof gates`, is closed as completed for this controlled-private-beta scope.

## Exact verified private-beta release before this evidence-only update

- PR #84, `Lock controlled private-beta launch policy`, merged successfully.
- Verified production commit: `86bfc09836d77087f6c74b0e48132c618aef2e3a`.
- Main CI run: `31768699780`.
- The first attempt passed dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry run, verified build archive, exact Cloudflare production release verification, and live Inngest function sync, but the final live Inngest execution probe failed without usable logs.
- No code change was made for that isolated failure because the exact release and function sync were already proven.
- A failed-job-only rerun after deployment convergence passed:
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

The final probe success after convergence is treated as release-convergence evidence, not as proof of a persistent Inngest defect.

## Compromised-password and session controls

Issue #57 is closed as completed for the application-level Supabase Free mitigation. The native Supabase leaked-password warning remains a truthful plan-limited residual and is not represented as enabled.

Production acceptance proved:

- known compromised strong password `Password123!` rejected by Foremention signup with HTTP 400;
- a unique strong password reached the normal confirmation flow with HTTP 200;
- direct public Supabase email signup without the Foremention one-time attestation rejected with HTTP 403;
- two independent confirmed-account logins succeeded;
- authenticated `/app` access succeeded;
- password update rejected the compromised password with HTTP 400 and a subsequent login proved the existing password was unchanged;
- `POST /api/auth/logout-all` completed all-device revocation;
- a second independent refresh session was rejected afterward with `refresh_token_not_found`.

The Supabase `Before User Created` hook remains enabled with the private one-time signup-attestation design. The mitigation is not described as Supabase’s native paid leaked-password feature.

## Real provider collection

A fresh synthetic production workspace completed one real controlled collection:

- organization: `Foremention Acceptance Test Co`;
- run: `d9c16871-72dc-4fcd-a208-d395a0e9e3b7`;
- provider: `groq`;
- exact model: `groq/compound-mini`;
- methodology: `3.0`;
- status: `complete`;
- recorded cost: `$0.008653`;
- cost source: `estimated`;
- input tokens: `5,428`;
- output tokens: `570`;
- total tokens: `5,998`;
- failed/rate-limited/excluded attempts: `0`;
- verified answers: `1`;
- citations: `19`;
- source observations: `19`;
- verified source observations: `19`;
- Source Map: `454d46f9-c89a-4b37-b89c-0904462c18af`;
- Source Map methodology: `3.0`.

This proves the production path can complete workspace/onboarding -> active buyer question -> queued background run -> real provider/model -> answer -> citations/source observations -> human review -> completed run -> persisted Source Map under the configured spending controls.

## Workspace export defect discovered and fixed

Application acceptance exposed a real `/api/export/workspace` HTTP 500. The exporter ordered every dataset by `id.asc`, while `run_prompt_selections` and `verified_claim_evidence` intentionally use composite keys without `id` columns.

PR #77 fixed deterministic ordering:

- `run_prompt_selections`: `run_id.asc,prompt_id.asc`;
- `verified_claim_evidence`: `claim_id.asc,evidence_item_id.asc`;
- other datasets retain `id.asc`.

Regression coverage was added, the fix passed CI, was exactly deployed, and the full export acceptance was rerun only after deployment.

## Reciprocal application-level tenant isolation

Live run `31735530309` used two fresh synthetic confirmed accounts and organizations, each with a unique marker.

Search proof:

- Tenant A found its own marker and received the product no-match state for Tenant B’s marker.
- Tenant B found its own marker and received the product no-match state for Tenant A’s marker.

Complete workspace ZIP proof:

- both export requests returned HTTP 200 `application/zip`;
- each archive contained 64 entries;
- each archive contained its own tenant marker;
- neither archive contained the other tenant’s marker.

This closes the application search/export tenant boundary separately from the earlier database RLS probes.

## Authenticated mobile and cross-browser acceptance

Run `31735530309` also exercised the deployed authenticated application at a 390x844 viewport in Chromium and Firefox.

The following routes returned HTTP 200, rendered meaningful authenticated content, avoided login redirects, and showed no horizontal overflow:

- `/app`;
- `/app/prompts`;
- `/app/runs`;
- `/app/source-map`;
- `/app/settings`;
- `/app/search` with the tenant’s own marker.

Observed `innerWidth` and document `scrollWidth` were both 390 pixels for the tested routes.

The final fresh synthetic workspace did not contain a reviewed Source X-Ray link. Source X-Ray itself was therefore not exercised by this particular mobile pass and is not overclaimed.

## Synthetic credential cleanup

Acceptance identities were temporary test principals only. After acceptance:

- each test password was replaced with a cryptographically random unknown value;
- global logout returned HTTP 204 for each account;
- the previous temporary password was verified rejected.

No temporary acceptance password is a continuing credential.

## Application-data backup -> restore drill

A real isolated application-data restore drill was completed rather than substituting a schema-only check.

Restore target:

- disposable Supabase project: `nhbdnpbpidydzpvoipez`;
- region: `ap-northeast-2`;
- confirmed project cost: `$0/month`;
- production was never used as the restore target.

The representative synthetic `Foremention Acceptance Test Co` evidence path was restored without copying Supabase Auth user identities.

### Data parity

The restored set contained 92 representative application rows covering:

- organization;
- project;
- category;
- prompt cluster;
- six prompts;
- run;
- run attempt;
- run prompt selection;
- run answer;
- 19 sources;
- 19 citations;
- 19 source observations;
- Source Map;
- 19 Source Map entries;
- AI cost event.

After intentionally excluding Auth-user identifiers, production and the isolated restore target produced the same SHA-256 fingerprint:

`8629ab5fee3fec5067300018c45e86401325e84008c5bf672c4aafad67f55a22`

### Core schema parity

The restored core path was also compared across columns, constraints, indexes, RLS policies, and triggers. After restoring the missing production objects, both production and the isolated target contained 415 compared schema objects with identical SHA-256:

`e4ab98e571acded4d8017563887eac739d9adbe6615f74f17e6f10c15dad1064`

Restore-only helper objects were removed, the data fingerprint remained exact, and the disposable project was paused.

Scope boundary: this proves application-data recovery for the representative Foremention evidence path. It does **not** claim Supabase Auth identity restoration.

## Production operator alert delivery

Sentry SDK code exists in the application, but Sentry itself is not represented as independently configured/verified because the connected environment could not prove its production DSN and alert receipt.

Instead, PR #83 added a first-party production operator-alert control using Foremention’s already-proven application-email delivery path.

Security properties:

- recipient configuration and delivery ledger are service-role only;
- `anon` and `authenticated` cannot read them;
- the caller cannot provide a recipient, message, customer identifier, or build SHA;
- the deployed SHA comes from the Worker binding;
- one controlled alert is idempotent per build;
- the alert contains no customer prompt, answer, citation, evidence body, credential, or provider secret;
- provider delivery ID is stored only as a SHA-256 hash.

Controlled proof:

- proof run: `31767775639`;
- build under test: `3940a7a8d6bd71697c356b0a1241b723141956ee`;
- POST trigger passed;
- durable GET status passed;
- private delivery ledger recorded `sent` on attempt 1, with a non-null provider-delivery hash and no error;
- matching `Foremention production alert probe — 3940a7a` email was observed in the operator inbox from `hello@foremention.com`.

This closes the production operator-alert requirement without misreporting Sentry.

## Final public UI/UX and Lighthouse pass

A live screenshot audit captured public production surfaces at desktop and mobile widths. Audited pages included home, pricing, about, honesty, score, prompt-check, login, and signup. The audit found no broken layout, clipped form, or major hierarchy failure.

The first Lighthouse pass identified concrete defects rather than subjective redesign requests:

- Cloudflare analytics beacon blocked by CSP, producing console/best-practice errors;
- insufficient contrast on selected home/pricing microcopy;
- several labels/fine-print elements below the desired legibility floor;
- missing Google Fonts origin preconnects.

PR #82 fixed those measured issues without changing the established mint/cream/dark-green editorial system.

Final corrected Lighthouse run: `31767745984`.

Scores:

- home: performance 83, accessibility 100, best practices 100, SEO 100;
- pricing: performance 83, accessibility 100, best practices 100, SEO 100;
- score: performance 91, accessibility 100, best practices 100, SEO 100;
- prompt-check: performance 91, accessibility 100, best practices 100, SEO 100;
- login: performance 91, accessibility 100, best practices 100; SEO 66 because the page is intentionally `noindex`;
- signup: performance 91, accessibility 100, best practices 100; SEO 66 because the page is intentionally `noindex`.

The corrected audit treats auth-page `noindex` as intentional rather than making authentication surfaces crawlable merely to improve a benchmark. Remaining performance headroom is mainly font/framework-client delivery under Lighthouse throttling; production HTML response was already fast and CLS near zero. No benchmark-only redesign was introduced.

## Controlled private-beta commercial / legal / operating boundary

PR #84 made the live commercial state explicit and aligned public copy with product behavior.

Current boundary:

- production entitlement remains `free_beta`;
- self-serve signup does not charge a card or activate Core, Signal, or Intelligence;
- public paid prices are planned packaging;
- planned pricing is explicitly `not a working checkout until its payment integration is verified`;
- the pricing page retains Foremention’s `repeatable intelligence system` positioning;
- no Stripe/checkout activation is represented as live;
- no legal entity, jurisdiction, tax treatment, customer-specific DPA, transfer mechanism, certification, or data-location fact is invented.

PR #84 also added:

- `docs/PRIVATE-BETA-OPERATING-POLICY.md`;
- `docs/INCIDENT-RESPONSE-RUNBOOK.md`;
- public `/subprocessors` service-provider transparency;
- Privacy retention language distinguishing product history from automatic destruction;
- Terms aligned to the actual free-beta billing state;
- regression tests that lock the commercial truth boundary.

The current incident owner is defined operationally as Founder / Operator until formally delegated. This is an operator-approved controlled-beta posture, not a statement of outside-counsel approval.

Final live policy acceptance run `31768894308` verified production `/pricing`, `/privacy`, `/terms`, and `/subprocessors` with HTTP 200 rendering and required truth-boundary copy present at desktop/mobile capture sizes.

## Supabase security-advisor residuals

The native `auth_leaked_password_protection` warning remains intentionally visible because the current plan does not provide the native toggle. The deployed application-level HIBP + signup-hook mitigation remains separately proven.

The advisor also flags authenticated-callable `SECURITY DEFINER` functions. Their live definitions and grants were reviewed. The relevant functions derive identity from `auth.uid()` and/or verify organization membership/owner-analyst role before privileged writes; `anon` does not receive the reviewed privileged execution path. Those intentional application grants were not revoked merely to silence a generic advisor warning.

## Final gate interpretation

Closed with production evidence for controlled/private beta:

- exact production release provenance;
- dependency/test/lint/type/build/dry-run gates;
- exact Cloudflare release verification;
- live Inngest synchronization and exact-build execution;
- compromised-password application mitigation and direct-signup bypass protection;
- confirmed login, recovery/update password rejection, and all-device refresh revocation;
- real cost-capped provider collection and evidence persistence;
- reciprocal tenant search/export isolation;
- complete workspace ZIP export after regression fix;
- representative authenticated Chromium/Firefox mobile acceptance;
- representative application-data restore into an isolated target with exact data/schema fingerprints;
- first-party production operator-alert delivery with observed inbox receipt;
- public UI/accessibility/best-practice/SEO hardening and final Lighthouse verification;
- controlled-private-beta billing/retention/provider/incident operating policy and live policy acceptance.

Explicit residual boundaries that are **not blockers for controlled private beta but remain future activation work**:

- paid checkout/payment lifecycle is not active;
- contracting entity, tax treatment, customer-specific DPA/order-form and jurisdiction-specific legal approval are not established by this engineering record;
- Sentry itself is not independently verified as a production alert destination;
- Supabase Auth identity restore was not part of the application-data recovery drill;
- Source X-Ray was not exercised in the final fresh synthetic mobile workspace.

No claim above should be expanded beyond the evidence boundary that supports it.
