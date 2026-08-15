# Foremention GREEN production release evidence — 2026-08-15

This record captures the exact-release evidence for the production commit that closed the authenticated release-proof checklist. It is intentionally narrower than a claim that every go-live, legal, operational, or customer-data gate is complete.

## Release identity

- Canonical application commit: `c615028ee2149504b7bceb9c510555650c960c72`.
- Merge source: PR #116, `Fix direct authenticated wordmark contrast`.
- The production patch in that merge is one scoped CSS rule on the actual inverse workspace wordmark text plus its regression-test update.
- Production health reported HTTP 200 with `buildCommit` exactly equal to `c615028ee2149504b7bceb9c510555650c960c72` before the authenticated acceptance jobs proceeded.

## Main CI and runtime proof

Main CI run `31895101941` completed successfully on the exact release SHA.

Required release steps that completed successfully include:

- production dependency advisory check;
- patch-hygiene check;
- tests;
- lint;
- typecheck;
- production build;
- Cloudflare Worker dry run;
- release SBOM generation;
- verified-build archive;
- exact Cloudflare production-release verification;
- live Inngest function synchronization;
- independent live Inngest execution probe;
- deterministic release-bundle creation;
- build-provenance attestation;
- SBOM attestation.

The dependency-review job that is PR-specific was skipped on the push and is not counted as a pass.

## Authenticated Browser Acceptance

Trusted production Browser Acceptance run `31895101952` completed successfully against the exact release SHA.

The archived artifact is:

- artifact ID `9249626010`;
- artifact name `foremention-browser-acceptance-c615028ee2149504b7bceb9c510555650c960c72`;
- digest `sha256:249c0a94cabaa7eaf8b540c331bc945af17dd0a6590dfcc4cf8d9a91996bb579`.

The artifact records:

- public Chromium desktop acceptance at 1440px on `/`, `/product`, `/pricing`, `/score`, `/prompt-check`, `/login`, and `/signup`;
- public Chromium mobile acceptance at 390px on the same seven routes;
- public Firefox desktop acceptance on the same seven routes;
- no recorded console errors or page errors on those public route observations;
- unauthenticated `/app` redirected to `https://foremention.com/login?next=%2Fapp`;
- authenticated Chromium desktop acceptance at 1440px on `/app`, `/app/prompts`, `/app/runs`, `/app/source-map`, and `/app/settings`;
- authenticated Chromium mobile acceptance at 390px on the same five workspace routes;
- no recorded console errors or page errors on those authenticated route observations;
- zero axe violations in all ten authenticated desktop/mobile workspace axe artifacts;
- no Browser Acceptance failures.

The production Lighthouse assertion result set was empty, meaning no configured Lighthouse assertion failed. Recorded category scores were:

- `/`, `/product`, `/pricing`, `/score`, `/prompt-check`: Performance `0.85`, Accessibility `1.00`, Best Practices `1.00`, SEO `1.00`;
- `/login`: Performance `0.86`, Accessibility `1.00`, Best Practices `0.96`, SEO `0.66`;
- `/signup`: Performance `0.86`, Accessibility `1.00`, Best Practices `1.00`, SEO `0.66`.

These are measurements for this release artifact, not guarantees for future releases.

## Authenticated first-evidence production canary

Authenticated First-Evidence Canary run `31895102028` completed successfully on the exact release SHA.

The archived artifact is:

- artifact ID `9249600220`;
- artifact name `foremention-first-evidence-canary-c615028ee2149504b7bceb9c510555650c960c72`;
- digest `sha256:3a16b485f94bde7f367270d2172d824296de0295dfa12ef51e2f7fc4806a0d60`.

The privacy-minimized canary record states:

- `provider = groq`;
- `maxCostUsd = 0.1`;
- canary enabled, spend approved, and exact-release requirement enabled;
- authenticated session established;
- exact production SHA verified;
- exactly five approved baseline questions verified;
- exactly one question queued through the idempotent acceptance path;
- one persisted provider answer verified;
- duplicate request/idempotency confirmed;
- zero provider-returned citations recorded;
- human-review publication gate exercised and published;
- Source X-Ray correctly not required because no provider citations existed;
- no opportunity mutation attempted;
- authenticated session cleared through sign-out;
- post-logout workspace protection verified;
- no canary failure recorded.

The artifact records a maximum approved cost ceiling of `$0.10`; it does **not** record an actual dollar charge and therefore must not be used to claim that `$0.10` was spent. It also does not expose the exact persisted model identifier. Those metadata fields remain separate evidence requirements if a later claim depends on exact model or actual spend.

## Security and supply-chain checks

The same release SHA had successful Security, AI Safety and Code Health, OpenSSF Scorecard, CodeQL, secret scanning, Actions audit, Trivy, OSV, provenance-attestation, and SBOM-attestation checks. A skipped event-inapplicable dependency-review job is not counted as successful evidence.

## Gates this release closes

This exact release closes the previously open claim that Foremention had never proven a dedicated authenticated production acceptance journey. It proves normal synthetic-account authentication, protected workspace access on desktop/mobile, a bounded one-question provider collection, persisted provider answer, exact-release idempotency, the human-review/publication boundary, truthful zero-citation behavior, logout, and post-logout workspace protection.

It also closes the narrower claim that no real deliberately gated provider execution had been observed on the current production release: the canary proves a Groq provider answer was persisted under the explicit `$0.10` maximum acceptance ceiling.

## Gates that remain open

This GREEN release does **not** by itself close the broader public-customer-data go-live checklist. The following remain open unless a separate dated evidence record closes them:

- end-to-end emailed password-recovery-link drill;
- destructive all-device session-revocation drill on a disposable production account;
- completed backup-restore drill with restore artifact;
- controlled production-error → operator-alert delivery proof;
- application-level cross-organization search/export proof and representative opportunity/action isolation fixtures or real rows;
- Supabase leaked-password protection until the production Security Advisor warning disappears;
- exact provider-model and actual-spend metadata when those fields are required for a claim;
- legal/commercial approvals including privacy, terms, MSA, DPA, retention, subprocessors, incident response, checkout entitlement activation, customer permissions, and counsel review where required;
- any customer proof claim that lacks signed permission and its own evidence chain.

## Status

For the exact authenticated release-proof scope exercised above, release `c615028ee2149504b7bceb9c510555650c960c72` is **GREEN**.

That status is release-specific. Any later application commit must independently pass the exact production-release, Inngest, authenticated Browser Acceptance, first-evidence canary, security, and release-attestation gates before inheriting the same status.
