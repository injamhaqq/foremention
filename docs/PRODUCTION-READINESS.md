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

## Required before accepting live customer data

1. Create and configure the production Supabase project.
2. Apply every migration in timestamp order and run the RLS verification queries.
3. Configure a production domain, HTTPS, allowed auth redirects, and secret manager.
4. Add refresh-token rotation and session-revocation testing for long-lived accounts.
5. Approve the privacy policy, terms, MSA, DPA, data retention, subprocessor list, and incident-response plan with qualified counsel.
6. Complete a threat model, dependency audit, backup restore test, and access-revocation drill.
7. Add production monitoring, error alerting, audit-log retention, and on-call ownership.
8. Connect analytics and CRM with read-only/minimum scopes and written customer authorization.
9. Connect checkout and verify that only a signed billing webhook can activate paid entitlements.
10. Configure explicit provider models, spend limits, retry budgets, and evaluation fixtures.
11. Run accessibility, performance, cross-browser, mobile-device, and form-delivery acceptance tests on the deployed domain.

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
