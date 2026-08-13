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

- **Exact production release:** production health reported build commit `53a94639d6c0a64bdbd27d185dc63f52bc55573b`, matching `main` after PR #51.
- **Release CI:** main CI run `31670678621` completed successfully for that commit, covering dependency audit, tests, lint, typecheck, production build, Cloudflare Worker dry-run, and production-build artifact upload.
- **Core dependency reachability:** the production health contract independently reported the Worker, D1, and Supabase as reachable. Inngest and configured AI providers remained `configured_not_probed`, so this record does not claim their live runtime paths were exercised.
- **Production schema hardening:** the foreign-key performance migration from PR #51 was applied to the production Supabase project. Re-running the production performance advisor cleared all 15 `unindexed_foreign_keys` findings that motivated the migration. Remaining `unused_index` notices are intentionally not treated as removal instructions without representative traffic evidence.
- **Database function privilege boundary:** production privilege checks confirmed `anon` cannot execute `complete_onboarding`, `release_queued_run`, `reserve_run_budget`, `reserve_run_quota`, `has_org_role`, or `is_org_member`; the intended authenticated/service roles retain access.
- **Session-revocation implementation:** PR #50 added explicit current-session and all-device Supabase revocation paths, same-origin mutation protection, truthful upstream-failure handling, and the documented JWT-expiry boundary.
- **Truthful comparison/alert boundary:** customer-facing trend movement is gated on exact persisted buyer-question text, provider, exact model, methodology, and human-review state; legacy ungated movement notifications and the legacy competitor-comparison email path are suppressed.

### Still requires live or operator-owned proof

- **Live all-device revocation drill:** implementation is shipped, but an actual production account has not been destructively revoked solely for acceptance testing. Do not mark this complete until a disposable/test account proves access loss and refresh-session revocation end to end.
- **Backup restore drill:** no completed restore artifact is recorded here. A backup existing is not equivalent to proving restoration.
- **Production alert delivery to the operator:** monitoring code/configuration is not enough. Record one controlled production error and the resulting operator alert before closing this gate.
- **Inngest runtime probe:** health currently says configured, not independently reachable. Record a bounded production job execution before closing this gate.
- **Real AI-provider collection:** health currently says configured, not probed. Complete one deliberately cost-capped collection and preserve provider, exact model, date, spend, failures, answers, citations, Source X-Ray inspection, and human review.
- **Full manual customer journey:** record deployed-domain acceptance evidence for signup, login, password reset, onboarding, demo isolation, mobile layout, representative empty/error states, and the customer workflow from question to reviewed evidence.
- **Legal and commercial approvals:** privacy policy, terms, MSA, DPA, retention, subprocessors, incident response, checkout entitlement activation, customer permissions, and any required counsel review remain founder/operator-owned gates unless separately documented.

## Required before accepting live customer data

1. Create and configure the production Supabase project. **Production project exists; keep environment ownership and recovery details documented outside source control.**
2. Apply every migration in timestamp order and run the RLS verification queries. **Migration history has been actively reconciled and production hardening has been applied; keep this gate open until the full migration/RLS acceptance record is attached.**
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
