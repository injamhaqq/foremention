# Foremention production-readiness record

This document is the handoff checklist for the Meridian OS / Source Eclipse build. It distinguishes what is implemented in the repository from what still requires founder-owned credentials, legal approval, customer permission, or live evidence.

## Product system included

- Public marketing site with Product, Source Map, Sample Report, Pricing, Methodology, Honesty, comparison, privacy, terms, contact, and Source Gap routes.
- Interactive Missing Answer, Source X-Ray, twelve-page source stack, seven-layer explanation, offer ladder, evidence standard, FAQ, and conversion paths.
- Account creation, sign-in, recovery, callback, sign-out, and isolated credential-free demo mode.
- Protected customer workspace for overview, onboarding, Source Map, prompts, runs, source details, opportunities, actions, evidence, analytics, and settings.
- URL-level source evidence, exact dates, disclosure labels, CSV export, empty/loading/error states, and reduced-motion behavior.
- Public D1 lead intake with field validation, consent capture, rate limiting, and non-persistent local fallback.
- Supabase multi-tenant product model with RLS, owner/analyst/viewer roles, invitations, projects, domains, competitors, prompt versions, attempts, source observations, routes, scoring, evidence, approvals, outreach, placement events, indexing, citations, referral metrics, CRM attribution, integrations, jobs, webhooks, and immutable audit records.
- Provider adapters for OpenAI, Gemini, Anthropic, Perplexity, and deterministic mock runs. Live adapters require explicit credentials and project-approved model IDs.
- Inngest background orchestration with partial provider failures retained for review rather than hidden.
- Metadata, FAQ and software structured data, sitemap, robots rules, Open Graph image, app icon, Source Eclipse brand assets, and responsive layouts.

## Security and truth controls

- RLS is enabled on organization-owned product tables.
- Public lead intake has insert-only behavior; no public read policy is exposed.
- Service-role credentials stay server-side.
- Integrations store secret references rather than raw credentials in application rows.
- Owners control invitations, integrations, and webhooks.
- Live claims, customer proof, citations, and attribution require recorded evidence.
- The app never promises rankings, editorial acceptance, citations, traffic, revenue, or causation.
- The demo is fictional and labelled. It must never be relabelled as a case study.

## Live production evidence — 2026-08-13

The items below are evidence records, not assumptions. A gate stays open unless a production observation or an equivalent acceptance artifact exists.

### Confirmed

- **Exact production release:** production health reported build commit `2c21ac1624f4067dbd04621b3905a2a6be5d750d`, matching `main` after PR #53.
- **Release CI:** exact-main CI run `31677581726` completed successfully for that commit. Dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry-run, and production-build artifact upload all passed.
- **Core dependency reachability:** the production health contract independently reported the Worker, D1, and Supabase as reachable. Inngest and configured Gemini, Groq, and OpenRouter providers remained `configured_not_probed`, so this record does not claim those live runtime paths were exercised.
- **Password-recovery purpose boundary:** PR #53 added a short-lived HTTP-only recovery-purpose cookie and requires it through recovery verification, the reset page, and the password-update API. After deployment, direct unauthenticated access to `/reset-password` redirected to `/forgot-password` instead of claiming that a recovery link had already verified the browser. This proves the direct-route truth boundary; it does not replace an end-to-end emailed recovery-link drill.
- **Public auth/workspace boundary:** deployed `/login`, `/signup`, and `/forgot-password` entry routes rendered successfully. Unauthenticated `/app` and `/app/onboarding` were rejected as login-required. The fictional demo is entered by the login-page POST to `/api/auth/demo`; `/demo` is not a public GET route.
- **Reciprocal production tenant read isolation:** two existing production organizations with distinct owners and real rows were tested under the Postgres `authenticated` role with RLS enabled and each owner's JWT subject simulated. In both directions, each owner could read the organization's own prompts, runs, run answers, citations, sources, notifications, and membership row while the same queries against the other organization returned zero rows.
- **Production tenant mutation isolation:** inside a transaction that was rolled back, one organization owner could no-op update 5 own prompt rows and 1 own membership row while identical updates scoped to the other organization affected zero rows. The rollback preserved production data. This is live RLS mutation evidence for those tables, not a substitute for application-level export/search acceptance or fixtures for currently empty opportunity/action tables.
- **Production schema hardening:** the foreign-key performance migration from PR #51 was applied to the production Supabase project. Re-running the production performance advisor cleared all 15 `unindexed_foreign_keys` findings that motivated the migration. Remaining `unused_index` notices are intentionally not treated as removal instructions without representative traffic evidence.
- **Database function privilege boundary:** production privilege checks confirmed `anon` cannot execute `complete_onboarding`, `release_queued_run`, `reserve_run_budget`, `reserve_run_quota`, `has_org_role`, or `is_org_member`; the intended authenticated/service roles retain access.
- **Session-revocation implementation:** PR #50 added explicit current-session and all-device Supabase revocation paths, same-origin mutation protection, truthful upstream-failure handling, and the documented JWT-expiry boundary.
- **Truthful comparison/alert boundary:** customer-facing trend movement is gated on exact persisted buyer-question text, provider, exact model, methodology, and human-review state; legacy ungated movement notifications and the legacy competitor-comparison email path are suppressed.

A detailed acceptance snapshot for the release is recorded in `docs/PRODUCTION-ACCEPTANCE-EVIDENCE-2026-08-13.md`.

### Still requires live or operator-owned proof

- **Live all-device revocation drill:** implementation is shipped, but an actual production account has not been destructively revoked solely for acceptance testing. Do not mark this complete until a disposable/test account proves access loss and refresh-session revocation end to end.
- **Backup restore drill:** no completed restore artifact is recorded here. A backup existing is not equivalent to proving restoration.
- **Production alert delivery to the operator:** monitoring code/configuration is not enough. Record one controlled production error and the resulting operator alert before closing this gate.
- **Inngest runtime probe:** health currently says configured, not independently reachable. Record a bounded production job execution before closing this gate.
- **Real AI-provider collection:** health currently says configured, not probed. Complete one deliberately cost-capped collection and preserve provider, exact model, date, spend, failures, answers, citations, Source X-Ray inspection, and human review.
- **Full manual customer journey:** public auth entry points and workspace protection have production evidence, but the gate remains open until a disposable/approved account proves email confirmation, login, emailed password recovery, onboarding, demo entry/exit isolation, mobile layout, representative empty/error states, logout/session persistence, and the customer workflow from buyer question to reviewed evidence.
- **Application-level cross-organization export/search proof:** underlying production RLS read/mutation isolation is now evidenced for populated core tables. Keep this narrower gate open until authenticated application endpoints for any search/export paths are exercised cross-organization, and until opportunity/action isolation has representative fixtures or real rows.
- **Legal and commercial approvals:** privacy policy, terms, MSA, DPA, retention, subprocessors, incident response, checkout entitlement activation, customer permissions, and any required counsel review remain founder/operator-owned gates unless separately documented.

## Required before accepting live customer data

1. Create and configure the production Supabase project. **Production project exists; keep environment ownership and recovery details documented outside source control.**
2. Apply every migration in timestamp order and run the RLS verification queries. **Production cross-organization RLS read and rollback-only mutation isolation is now evidenced for populated core tables; keep the broader migration/application acceptance gate open until the complete migration history and endpoint-level export/search checks are attached.**
3. Configure a production domain, HTTPS, allowed auth redirects, and secret manager. **Production domain and HTTPS are live; retain explicit operator evidence for auth redirect and secret-manager configuration.**
4. Add refresh-token rotation and session-revocation testing for long-lived accounts. **Implementation shipped in PR #50; live destructive revocation drill remains open.**
5. Approve the privacy policy, terms, MSA, DPA, data retention, subprocessor list, and incident-response plan with qualified counsel.
6. Complete a threat model, dependency audit, backup restore test, and access-revocation drill. **Automated dependency audit is green; backup restore and live access-revocation drills remain open.**
7. Add production monitoring, error alerting, audit-log retention, and on-call ownership. **Do not close until a controlled production alert is observed by the responsible operator.**
8. Connect analytics and CRM with read-only/minimum scopes and written customer authorization.
9. Connect checkout and verify that only a signed billing webhook can activate paid entitlements.
10. Configure explicit provider models, spend limits, retry budgets, and evaluation fixtures. **Code-level controls exist; live provider execution remains intentionally unproven in this record.**
11. Run accessibility, performance, cross-browser, mobile-device, and form-delivery acceptance tests on the deployed domain. **Automated/mobile contracts do not replace deployed-device acceptance evidence.**

## Evidence gates before public proof claims

- Signed customer permission.
- Exact prompt set, provider, model, date, locale, repetitions, and screenshots.
- Human-reviewed cited URLs and brand positions.
- Publisher and indexing decisions recorded independently.
- Referral or CRM events classified as verified, self-reported, assisted, inferred, or unknown.
- At least one documented failure as well as successful evidence.
- No claim of placement-to-citation causation unless the evidence design supports that conclusion.

## Go-live rule

The repository may be deployed as a private preview immediately. Public launch with live accounts or customer data should happen only after the required security, legal, credential, and operational gates above have named owners and recorded completion evidence.
