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
- Cross-collection movement is withheld unless exact persisted buyer-question text, provider, exact model, methodology, terminal human-review state, and chronology are proven comparable.
- The app never promises rankings, editorial acceptance, citations, traffic, revenue, or causation.
- The demo is fictional and labelled. It must never be relabelled as a case study.

## Live production evidence — 2026-08-13

The items below are evidence records, not assumptions. A gate stays open unless a production observation or an equivalent acceptance artifact exists.

### Confirmed

- **Exact production release:** application runtime commit `c1521dfca2671375ed21a72d60e1e3c353e3cba8` was independently proven on the custom domain after PR #70. Main CI run `31696574684` waited for `https://foremention.com/api/health` to return HTTP 200 with `buildCommit` exactly equal to that Git SHA before continuing.
- **Deployment mechanism is explicit:** Cloudflare Workers Builds is the production deploy system for `foremention-mvp`. GitHub Actions verifies/builds the repository and archives `dist`; `actions/upload-artifact` is not deployment. Main CI refuses to finish green until the custom-domain health contract reports the exact `github.sha` after Cloudflare deployment converges.
- **Required release verification:** current main release CI passed dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry-run, verified-build archive, exact-live-release/auth smoke, live Inngest function sync, and exact-build Inngest execution heartbeat.
- **Core dependency reachability:** live health observations report the Worker, D1, and Supabase as reachable. Configured AI providers remain configuration-only until a real deliberately cost-capped provider collection is recorded.
- **Inngest production runtime is now proven and release-gated:** production uses a service-only `runtime_service_probes` ledger keyed by exact build SHA. On `c1521dfca2671375ed21a72d60e1e3c353e3cba8`, the probe was requested at `2026-08-13 11:41:59.076093+00` and executed at `2026-08-13 11:42:01.029+00` (`1.953` seconds). Both live function synchronization and execution are required main-CI steps, not `continue-on-error` checks.
- **Inngest failure modes were exercised rather than hidden:** earlier rollout releases captured a route failure with no durable row, an accepted event with no execution, and a required-gate failure caused by stale bundled release identity. The gate was strengthened instead of weakened. The final route resolves build identity from the live Cloudflare runtime binding.
- **Public health semantics remain conservative:** `/api/health` does not execute an Inngest job or read the privileged service-probe ledger. Its Inngest field is configuration-level information. Exact runtime execution proof comes from the required release gate plus the durable ledger row for that SHA.
- **Public auth boundary on exact releases:** direct unauthenticated `/reset-password` is redirected to `/forgot-password`; unauthenticated `/app` is redirected to login. These checks run automatically after exact release convergence.
- **Password-recovery purpose boundary:** PR #53 added a short-lived HTTP-only recovery-purpose cookie and requires it through recovery verification, the reset page, and the password-update API. Direct unauthenticated access no longer claims a recovery link verified the browser. This does not replace an end-to-end emailed recovery-link drill.
- **Public auth/workspace boundary:** deployed `/login`, `/signup`, and `/forgot-password` entry routes have rendered successfully. The fictional demo is entered by the login-page POST to `/api/auth/demo`; `/demo` is not a public GET route.
- **Reciprocal production tenant read isolation:** two existing production organizations with distinct owners and real rows were tested under the Postgres `authenticated` role with RLS enabled and each owner's JWT subject simulated. In both directions, each owner could read the organization's own prompts, runs, run answers, citations, sources, notifications, and membership row while equivalent queries against the other organization returned zero rows.
- **Production tenant mutation isolation:** inside a rolled-back transaction, one organization owner could no-op update own prompt and membership rows while identical updates scoped to the other organization affected zero rows. The rollback preserved production data. This is live RLS mutation evidence for those tables, not a substitute for application-level export/search acceptance or fixtures for currently sparse opportunity/action paths.
- **Production schema hardening:** the foreign-key performance migration from PR #51 was applied to production. Re-running the performance advisor cleared the 15 `unindexed_foreign_keys` findings that motivated it. Remaining `unused_index` notices are not treated as removal instructions without representative traffic evidence.
- **Database function privilege boundary:** production checks confirmed `anon` cannot execute `complete_onboarding`, `release_queued_run`, `reserve_run_budget`, `reserve_run_quota`, `has_org_role`, or `is_org_member`; intended authenticated/service roles retain access.
- **Provider cost-accounting boundary:** production rejects tokenless failed/rate-limited estimate rows from the spend-event ledger that feeds `actual_cost_usd`. Conservative failed-attempt estimates remain available for budget/circuit safety. Historical records were intentionally not rewritten.
- **Session-revocation implementation:** PR #50 added explicit current-session and all-device Supabase revocation paths, same-origin mutation protection, truthful upstream-failure handling, and the documented JWT-expiry boundary.
- **Truthful comparison/alert boundary:** customer-facing trend movement is gated on exact persisted buyer-question text, provider, exact model, methodology, and human-review state; legacy ungated movement notifications and the legacy competitor-comparison email path are suppressed.
- **Resolution/outcome comparability:** Resolution follow-up becomes `incomparable` rather than producing movement when methodology or the exact verified `(prompt_key, prompt_text, provider, model)` matrix differs. Historical resolution evidence snapshots are canonicalized from persisted reviewed database rows rather than mutable current question text.
- **Reviewed evidence → resolution bridge:** complete missing-brand human review can persist one tenant/project-bound opportunity for Resolution Center; a partial unique index prevents duplicate route-less source opportunities under concurrent review. Incomplete human review is not promoted as an actionable opportunity.
- **Exact run-comparison hardening:** PR #70 replaced arbitrary complete-run movement with a fail-closed comparison gate. Customers may inspect any two reviewed complete/partial runs, but movement renders only for a chronological, same-methodology, exact verified persisted question/provider/model matrix. Brand movement uses explicit persisted `brand_present` transitions only; citation URLs are canonicalized; unknown states are not converted; mutable current competitor-text scanning and synthetic confidence percentages were removed.
- **Existing exact production pair:** production contains two complete methodology `3.0` runs (`ab06e958-f37b-4b99-b226-7c9bd1d1d618` → `79e492c9-699e-4559-b767-c03c3c7208ce`) with the same persisted buyer question, prompt key, provider `groq`, exact model `groq/compound-mini`, one verified answer each, and `brand_present=false` in both. It is therefore eligible for source/citation observation comparison but must not show a brand-presence gain or loss.
- **Repeatable production auth smoke:** `scripts/production-auth-smoke.mjs` supports public exact-release checks by default and optional disposable authenticated login → `/app` → local logout → post-logout protection checks using environment-only credentials. Recovery-email sending is explicit opt-in and no credentials are stored in source.

Detailed dated evidence is recorded in:

- `docs/PRODUCTION-ACCEPTANCE-EVIDENCE-2026-08-13.md`;
- `docs/PRODUCTION-RUNTIME-HARDENING-EVIDENCE-2026-08-13.md`;
- `docs/PRODUCTION-INNGEST-AND-COMPARISON-EVIDENCE-2026-08-13.md`.

A later documentation-only merge necessarily has a different Git SHA. It does not rewrite the historical runtime SHA above; every later `main` release must independently pass the exact custom-domain and required Inngest gates.

### Still requires live or operator-owned proof

- **Disposable authenticated customer journey:** public boundaries are automated, but authenticated CI checks remain open until dedicated confirmed disposable credentials are supplied safely. Email confirmation, login, emailed password recovery, onboarding, demo entry/exit isolation, representative mobile/empty/error states, and buyer-question → reviewed-evidence acceptance remain open.
- **Live all-device revocation drill:** implementation is shipped, but an actual production acceptance account has not been destructively revoked solely for the drill. Do not mark this complete until a disposable/test account proves refresh-session revocation end to end.
- **Backup restore drill:** no completed restore artifact is recorded here. A backup existing is not equivalent to proving restoration.
- **Production alert delivery to the operator:** monitoring code/configuration is not enough. Record one controlled production error and the resulting operator alert before closing this gate.
- **Real AI-provider collection on the current release:** configured providers have not been proven through a fresh deliberately cost-capped collection on the current release. Preserve provider, exact model, date, cost source/spend, failures, answers, citations, Source X-Ray inspection, and human review.
- **Application-level cross-organization export/search proof:** underlying production RLS read/mutation isolation is evidenced for populated core tables. Keep this narrower gate open until authenticated application endpoints for search/export are exercised cross-organization and opportunity/action isolation has representative fixtures or real rows.
- **Supabase leaked-password protection:** the production Security Advisor reported this Auth control disabled. GitHub issue #57 tracks the manual Supabase Auth-setting change and re-verification. Do not close it until the advisor warning disappears.
- **Legal and commercial approvals:** privacy policy, terms, MSA, DPA, retention, subprocessors, incident response, checkout entitlement activation, customer permissions, and any required counsel review remain founder/operator-owned gates unless separately documented.

## Required before accepting live customer data

1. Create and configure the production Supabase project. **Production project exists; keep environment ownership and recovery details documented outside source control.**
2. Apply every migration in timestamp order and run the RLS verification queries. **Production cross-organization RLS read and rollback-only mutation isolation is evidenced for populated core tables; keep the broader application acceptance gate open until endpoint-level export/search checks are attached.**
3. Configure a production domain, HTTPS, allowed auth redirects, and secret manager. **Production domain and HTTPS are live; exact custom-domain Git provenance is automated on main. Retain explicit operator evidence for auth redirect and secret-manager configuration.**
4. Add refresh-token rotation and session-revocation testing for long-lived accounts. **Implementation shipped; live destructive all-device revocation remains open.**
5. Approve the privacy policy, terms, MSA, DPA, data retention, subprocessor list, and incident-response plan with qualified counsel.
6. Complete a threat model, dependency audit, backup restore test, and access-revocation drill. **Automated dependency audit is green; backup restore and live access-revocation drills remain open.**
7. Add production monitoring, error alerting, audit-log retention, and on-call ownership. **Do not close until a controlled production alert is observed by the responsible operator.**
8. Connect analytics and CRM with read-only/minimum scopes and written customer authorization.
9. Connect checkout and verify that only a signed billing webhook can activate paid entitlements.
10. Configure explicit provider models, spend limits, retry budgets, and evaluation fixtures. **Code-level controls exist; live provider execution on the exact current release remains intentionally unproven.**
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
