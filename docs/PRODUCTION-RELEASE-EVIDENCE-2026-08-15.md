# Production release evidence — 2026-08-15

This record captures the exact-release evidence for Foremention commit `c615028ee2149504b7bceb9c510555650c960c72`, merged by PR #116 (`Fix direct authenticated wordmark contrast`). It is a delta on top of `docs/PRODUCTION-READINESS-EVIDENCE-2026-08-14.md`, which remains the canonical operational proof for the controlled/private-beta gates completed on 2026-08-14.

## Release classification

**GREEN for the controlled/private-beta release represented by exact commit `c615028ee2149504b7bceb9c510555650c960c72`.**

This does not activate paid/general availability. Production remains subject to the commercial and legal boundaries recorded in the private-beta operating policy and the 2026-08-14 readiness evidence.

## Exact release and deployment proof

- Canonical main commit: `c615028ee2149504b7bceb9c510555650c960c72`.
- PR #116 changed only the authenticated sidebar wordmark contrast rule plus its regression test.
- Main CI run: `31895101941` — success.
- Main CI passed tests, lint, typecheck, production build, Cloudflare Worker dry run, release SBOM generation, verified-build archive, exact Cloudflare production-release verification, live Inngest function sync, independent live Inngest execution probe, build provenance attestation, and SBOM attestation.
- The exact-release Cloudflare deployment observed during the required release gate used Build ID `e9c4496f-abc9-484d-9f48-f0cfd98a6dab` and Worker Version ID `ffc31a29-716d-414c-aee0-1be174a9e4ea`.
- Production health during trusted acceptance returned HTTP 200 with `buildCommit` equal to the exact main SHA, with D1 and Supabase reachable.

A later same-SHA Cloudflare rebuild may produce a different Worker version without changing the application Git identity. Worker version IDs are therefore deployment-instance evidence; the exact Git SHA remains the release identity required by the application gates.

## Authenticated browser, accessibility, and performance acceptance

Trusted Browser Acceptance run `31895101952` completed successfully against the exact deployed release.

Observed acceptance included:

- authenticated Chromium desktop;
- authenticated Chromium mobile;
- authenticated Firefox desktop;
- 21 public browser/page observations;
- authenticated workspace acceptance;
- ordinary sign-out and post-logout protection;
- production accessibility checks, including the direct sidebar wordmark contrast target that motivated PR #116.

The same run completed its Lighthouse assertion suite across:

- `/`;
- `/product`;
- `/pricing`;
- `/score`;
- `/prompt-check`;
- `/login`;
- `/signup`.

Archived browser evidence:

- artifact ID: `9249626010`;
- SHA-256: `249c0a94cabaa7eaf8b540c331bc945af17dd0a6590dfcc4cf8d9a91996bb579`.

## Authenticated first-evidence canary

Authenticated First-Evidence Canary run `31895102028` completed successfully on the same exact release.

The sanitized workflow evidence proved:

- normal authenticated production session establishment;
- exact production SHA verification;
- exactly five approved synthetic baseline buyer questions;
- one selected buyer question and one live provider per collection;
- exact-release idempotency using `acceptance:<git-sha>`;
- persisted provider answer evidence;
- human-review publication gate;
- truthful zero-citation handling when the provider returned no citations;
- no Source X-Ray fabrication when no provider citation existed;
- ordinary UI sign-out;
- protected `/app` boundary after sign-out.

Archived canary evidence:

- artifact ID: `9249600220`;
- SHA-256: `3a16b485f94bde7f367270d2172d824296de0295dfa12ef51e2f7fc4806a0d60`.

## Exact provider/model/cost accounting

A privacy-minimized production database verification selected the run only by the release-scoped idempotency key and did not retrieve prompt text, answer text, raw provider JSON, citation URLs, credentials, or customer data.

Exact canary run evidence:

- run ID: `05dcaeec-4da4-4740-b533-c03f11352bec`;
- status: `complete`;
- provider: `groq`;
- exact model: `groq/compound-mini`;
- methodology: `3.0`;
- prompt count: `1`;
- persisted answer count: `1`;
- citation count: `0`;
- review status: `verified`;
- input tokens: `361`;
- output tokens: `400`;
- total tokens: `761`;
- estimated maximum run cost: `$0.006250`;
- run accounting value in `actual_cost_usd`: `$0.005529`;
- answer cost value: `$0.005529`;
- cost source: `estimated`;
- latency: `1205 ms`;
- finish reason: `stop`;
- collection timestamp: `2026-08-15 16:19:14.668+00`;
- error summary: `null`.

The `$0.005529` value is an **estimated accounting value**, because the persisted `cost_source` is `estimated`. It must not be represented as a provider invoice charge or independently verified billed amount. The configured canary ceiling of `$0.10` was an authorization ceiling, not the amount spent.

## Security and supply-chain evidence

The same release SHA completed successfully in:

- Security run `31895101976`;
- CodeQL run `31895101960`;
- OpenSSF Scorecard run `31895101996`;
- AI Safety and Code Health run `31895102053`.

The push-only dependency-review job was skipped by workflow design and is not represented as a pass.

## Relationship to prior readiness evidence

The following controlled/private-beta operational gates were already proven and closed before this release and were not destructively rerun merely to refresh a date:

- all-device refresh-session revocation;
- reciprocal application-level tenant search/export isolation;
- application-data backup -> isolated restore with matching data/schema fingerprints;
- first-party production operator-alert delivery with observed inbox receipt;
- compromised-password application mitigation on Supabase Free;
- controlled-private-beta operating-policy sign-off.

Those proofs are recorded in `docs/PRODUCTION-READINESS-EVIDENCE-2026-08-14.md` and closed issue #76. Issue #57 separately records the truthful Supabase Free leaked-password residual and the completed application-level mitigation.

## Residual boundary

No engineering evidence in this record establishes paid checkout, a contracting entity, tax treatment, customer-specific DPA/order-form terms, jurisdiction-specific legal approval, native Supabase paid leaked-password protection, Sentry as an independently verified alert destination, or Supabase Auth identity restoration.

Those are not blockers for the already-approved controlled/private beta unless the operating scope changes. They remain separate activation work for paid/general availability or any customer/legal context that requires them.
