# Foremention production-readiness record

This is the current readiness index for Foremention. Dated evidence files preserve the historical details; this document must not leave already-proven gates listed as open merely because an older snapshot was not updated.

## Current status

**GREEN for the controlled/private beta.**

Exact application release under the current evidence record:

- Git commit: `c615028ee2149504b7bceb9c510555650c960c72`;
- merge: PR #116, `Fix direct authenticated wordmark contrast`;
- main CI: `31895101941` — success;
- trusted Browser Acceptance: `31895101952` — success;
- Authenticated First-Evidence Canary: `31895102028` — success;
- Security: `31895101976` — success;
- CodeQL: `31895101960` — success;
- OpenSSF Scorecard: `31895101996` — success;
- AI Safety and Code Health: `31895102053` — success.

The controlled/private-beta operational sign-off predates this release and remains recorded in `docs/PRODUCTION-READINESS-EVIDENCE-2026-08-14.md` and closed issue #76. The newer exact-release delta is recorded in `docs/PRODUCTION-RELEASE-EVIDENCE-2026-08-15.md`.

A later documentation-only commit necessarily has a different Git SHA and may run the normal release automation. That does not rewrite the historical application-behavior evidence above or require this record to chase its own documentation commit indefinitely.

This status is **not** a paid/general-availability launch declaration. Production remains the controlled `free_beta` posture described in `docs/PRIVATE-BETA-OPERATING-POLICY.md`.

## Product and truth boundaries

Foremention currently includes the public product surfaces, authentication and isolated fictional demo, protected multi-tenant customer workspace, Supabase/Postgres RLS model, Cloudflare Worker production runtime, Inngest background orchestration, provider adapters, evidence review/publication workflow, Source Map / Source X-Ray surfaces, cost/quota controls, exports, operator alerting, and release verification described in the repository and dated evidence records.

The following truth controls remain mandatory:

- provider-returned citation evidence is distinct from crawler/search observation;
- movement is withheld unless persisted buyer-question text, provider, exact model, methodology, chronology, and terminal human-review state are comparable;
- semantic similarity is not longitudinal comparability;
- temporal sequence is not causation;
- public Score diagnostics are not verified workspace evidence;
- fictional demo data must never be represented as customer proof;
- Foremention does not guarantee rankings, citations, traffic, leads, revenue, publisher acceptance, or causation;
- Source X-Ray is published only for genuine mapped provider-returned citations; zero citations is a valid truthful outcome.

## Closed controlled-private-beta proof gates

The following have production evidence and are **closed for the controlled/private-beta scope**:

- exact custom-domain release identity tied to Git SHA;
- dependency audit, automated tests, lint, typecheck, production build, and Worker dry run;
- release SBOM and build/SBOM provenance attestation;
- exact Cloudflare production release verification;
- live Inngest function synchronization plus independent exact-build execution probe;
- public auth/workspace redirect boundaries;
- normal authenticated production login/workspace acceptance with dedicated synthetic credentials;
- ordinary sign-out and post-logout `/app` protection;
- compromised-password application mitigation on Supabase Free and direct-signup bypass protection;
- two-session all-device refresh-session revocation drill;
- reciprocal database RLS read/mutation isolation for populated core paths;
- reciprocal application-level tenant search/export isolation;
- deterministic full workspace ZIP export after the composite-key ordering defect was fixed;
- a real deliberately cost-bounded provider collection with exact provider/model/methodology accounting;
- exact-release one-question/one-provider first-evidence canary with release-scoped idempotency;
- human-review publication boundary;
- truthful zero-citation handling on the `c615028e…` exact-release canary;
- representative authenticated Chromium/Firefox mobile acceptance;
- trusted production browser/accessibility acceptance on Chromium desktop/mobile and Firefox desktop;
- production Lighthouse assertion suite on the required public/auth entry routes;
- representative application-data backup -> isolated restore with exact data/schema fingerprints;
- first-party production operator-alert delivery with durable ledger evidence and observed operator inbox receipt;
- controlled-private-beta billing, retention, provider-transparency, and incident operating-policy sign-off.

## Exact provider evidence for `c615028e…`

Production run `05dcaeec-4da4-4740-b533-c03f11352bec` completed with:

- provider `groq`;
- exact model `groq/compound-mini`;
- methodology `3.0`;
- one selected buyer question;
- one persisted verified answer;
- zero provider citations;
- estimated maximum run cost `$0.006250`;
- `actual_cost_usd` accounting value `$0.005529` with `cost_source=estimated`;
- no run error summary.

The `$0.005529` value is an estimated accounting value, **not** an independently verified provider invoice charge. The configured `$0.10` canary value was an authorization ceiling, not the amount spent.

## Supabase leaked-password residual

Issue #57 is closed for the application-level mitigation. Foremention remains truthful about the native Supabase Free-plan residual:

- the native paid `auth_leaked_password_protection` control is not represented as enabled;
- Foremention uses its separately proven server-side HIBP k-anonymous check plus signup-attestation hook;
- the native advisor warning should be cleared only if a future plan/control change actually enables the native feature and re-verification confirms it.

## Residual boundaries — not blockers for controlled private beta

These are intentionally **not** represented as completed engineering proof:

- paid checkout/payment lifecycle and signed billing-webhook entitlement activation;
- contracting entity and tax treatment;
- customer-specific MSA/DPA/order-form terms and jurisdiction-specific legal approval;
- Sentry as an independently verified production alert destination (Foremention's first-party operator-alert path is proven separately);
- Supabase Auth identity restoration as part of disaster recovery;
- native Supabase paid leaked-password protection;
- Source X-Ray exercise on the `c615028e…` exact-release canary, because that provider response truthfully returned zero citations.

If the operating scope changes from controlled private beta to paid/general availability or to a customer context requiring additional legal/data commitments, those boundaries become a separate activation project and must receive named owners and evidence before activation.

## Before paid/general-availability activation

Do not represent paid/GA as live until the applicable scope has evidence for:

1. the real payment lifecycle, including provider configuration and signed billing-webhook entitlement activation;
2. contracting entity, tax, billing, refund/cancellation, and commercial facts;
3. customer-specific legal/privacy requirements, including any required MSA, DPA, transfer mechanism, retention commitment, subprocessor disclosure, and qualified counsel review;
4. any new analytics, CRM, or third-party integration scopes with minimum privileges and required authorization;
5. any plan-dependent security control that marketing/contracts intend to promise;
6. fresh exact-release production acceptance after the activation changes, without reusing prior-SHA evidence.

## Evidence rules for customer/public proof claims

Any external proof claim still requires evidence appropriate to that claim, including where applicable:

- customer permission;
- exact question/prompt set, provider, exact model, date, locale, repetitions, and methodology;
- human-reviewed cited URLs and observations;
- independent publisher/indexing decisions;
- referral/CRM events classified as verified, self-reported, assisted, inferred, or unknown;
- documented failures as well as successes;
- no placement-to-citation or citation-to-business-outcome causation claim unless the evidence design actually supports it.

## Historical evidence index

- `docs/PRODUCTION-ACCEPTANCE-EVIDENCE-2026-08-13.md`
- `docs/PRODUCTION-RUNTIME-HARDENING-EVIDENCE-2026-08-13.md`
- `docs/PRODUCTION-INNGEST-AND-COMPARISON-EVIDENCE-2026-08-13.md`
- `docs/PRODUCTION-READINESS-EVIDENCE-2026-08-14.md`
- `docs/PRODUCTION-RELEASE-EVIDENCE-2026-08-15.md`
- issue #57 — application-level leaked-password mitigation and revocation acceptance
- issue #76 — controlled/private-beta remaining proof gates closed

Every later deployable application release must independently satisfy the exact-release gates. Historical evidence is not release evidence for a new application SHA.
