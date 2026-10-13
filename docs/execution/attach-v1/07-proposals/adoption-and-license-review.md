# Chat07 — repository adoption and license decision proposals

**Scope:** `fm-attach-v1/07-repository-choices` only. Research/coordination documents, not installs or approved production integrations.

**Baseline verified:** `injamhaqq/foremention@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (main as fetched 2026-10-12; unchanged on 2026-10-13). Historical registers observed 2026-10-11 are historical evidence, not fresh dependency, security or performance certification.

## Complete source crosswalk

- `canonical-repository-crosswalk.csv`: 154 normalized canonical GitHub identities, each with one adjudicated disposition, aliases, original R67/R124 row numbers, competitor source row numbers, root-license evidence/limits, existing Foremention evidence, reopening/rollback gate and provenance.
- `source-occurrences.csv`: all **245** input observations, preserving **67** `Repository_Register_67.csv` rows, **124** `Foremention_Repository_Register_124.csv` rows and **54** file-path/empty-repository observations from `Foremention_Competitor_Source_Register_2026-10-11.csv`. Source hashes, snapshot SHAs and path refs are carried through. Eight competitor repositories are unique to the two main repository lists.
- Arithmetic: 67 + 124 − 45 overlapping identities + 8 competitor identities = **154**. There are **21** divergent historical R67/R124 dispositions, preserved side by side.
- Adjudicated outcomes (refreshed 2026-10-13, see section below): **16 KEEP**, **78 DEFER**, **38 REFERENCE ONLY**, **18 REJECT**, **4 UNRESOLVED** (2026-10-12 checkpoint was 15/88/39/9/3). These are *adoption* decisions, NOT verified working installations or installed dependencies to delete.
- Assigned original source backlog item **CV-18** (Commercial_Backlog_18.csv row 18): P2 optional expansion, explicitly defer new integrations until at least **three retained customers** repeat the same blocker, plus concrete economic and acceptance evidence. The missing `Foremention_Master_Backlog_28_v2.csv` is not reconstructed.

## Actual Foremention architecture versus proposed additions

Current root `package.json` declares `inngest ^4.13.0`, `@sentry/cloudflare` and `@sentry/react ^10.68.0`, `posthog-js ^1.409.5`, `vinext 0.0.50`, `wrangler 4.114.0`, Next 16.3.8 and React 19.2.8. `pnpm-lock.yaml` includes OpenTelemetry transitive packages. `scripts/browser-demo-baseline.mjs` and `scripts/browser-decision-draft.mjs` at the exact base import Playwright and axe from `.ci-tools`; this is not evidence of direct root dependencies or a currently passing run. README documents Supabase but actual hosted service/RLS status was not retested. Existing code therefore defaults to KEEP: **no new database, orchestrator, agent framework, editor, crawler or model gateway**.

A `KEEP` designation for code-quality projects (Gitleaks, Trivy, OSV Scanner, OpenSSF Scorecard, Lighthouse, axe, Playwright, Promptfoo, Knip) means preserve/use existing QA arrangements where verified; current workflow wiring, command results and dependency notices need FM-00/Chat09 confirmation. Do not install one merely because it was included in a historical `KEEP` row.

## Proposed owner contracts and decisions

| Decision / target | Verified gap, selected owner, and scope | Security, cost, acceptance, rollback |
|---|---|---|
| **P0: evidence relevance / CV-01, CV-11** — **no adopted external repo** | Historical competitor pack records an earlier test returning irrelevant dictionary sources and abstention; this needs an **exact-head reproduction**, not another crawler. Chat01 owns retrieval/provider relevance, Chat04 owns review wording; FM-00 owns contract changes. | Preserve raw answer, provider/model, request settings, source retrievability and distinctions between native citations / fetched content / inference. Accept unrelated, homonym and controlled-positive fixtures; fail closed when evidence insufficient. Rollback minimal own-path changes via the owner's branch. No additional paid calls. |
| **P0: usage and spend control / CV-07** — **use existing policy** | Earlier register flags Groq onboarding outside common spend guard. Chat01 tests the path; Chat02 checks auth scope; FM-00 adjudicates any shared interface. | One server-side policy per provider path; at zero allowance *no* paid route fires. Distinguish unverified historic finding from reproduced defect. Roll back only after preserving fail-closed policy. |
| **P0: reviewed decision and second cycle / CV-05** — **no AI agent framework** | Chat04 creates/verifies saved human Change Specification, owner, decision, compare-later linkage. Chat09 independent acceptance; Chat02 tests RLS boundary. | Test two-tenant negative access plus positive reviewed baseline→same-contract second-cycle. No invented uplift, no unreviewed publication. Roll back feature diff if isolation, evidence, or scope regress. |
| **KEEP: existing Inngest, Supabase, Sentry/PostHog, Cloudflare** | Chat06 controls job/recovery, Chat02 auth/RLS, Chat08 event definitions; FM-00 exact-head integration. Don't replace with Temporal/Trigger.dev/n8n/another DB or event bus based on stars. | Restore and retry fixture; region/data residency, retention, hosted pricing, usage caps and secret boundaries verified by the respective owner. Before any replacement show concrete defect, migration+data preservation, dual-read cutover, canary/rollback and exit cost. |
| **REFERENCE ONLY: Profound TS/Python/Rust vendor SDKs** | Chat01 may adapt a *generic* typed observation/error/rate-limit test pattern, not SDK code or competitor data. No vendor Enterprise key/account or consumer-product equivalence. | Root Apache-2.0 sampled for TS; retain source license/NOTICE and changed-file notices *if copying*; no copied branding or vendor account access. Preferred outcome is an original fixture not code copying. |
| **REFERENCE ONLY: Peec companion, third-party Peec skills, Voyage GTM skills** | Chat04 may translate reviewable opportunity/metric contracts; Chat05 may use research patterns with claims independently verified. No official Peec credential or customer data supplied. | rebelytics companion CC BY 4.0 requires attribution/change identification if expression is adapted; AntonioBlago and Voyage licenses historically MIT but assets/links must be rechecked. No unverified GEO uplift multipliers or silent publishing. |
| **UNRESOLVED: official Peec skills, Bristotle tracker, freesubstats** | Official `peec-ai/peec-mcp-skills` metadata exists but repository size 0 and LICENSE returns empty-repository 404 on 2026-10-12. Two other entries lack sufficient original rights/utility evidence. | Never import or label as installed; require identifiable upstream content, signed/approved license review and a demonstrated use case. |
| **DEFER: Voyage GEO agent, Docling, Readability, OmniRoute** (Semgrep moved to KEEP on 2026-10-13) | After P0 recovery, Chat01/09 may evaluate an offline, nonproduction, method-equivalent *fixture* for Voyage/Docling if the customer gap demands it. Current main commit explicitly records negative Readability benchmark, non-required Semgrep boundary policy (now KEEP as an existing CI job), and OmniRoute not adopted. Do not install now. | Prior sandbox experiment is not a pass. Require licensed pinned artifact, representative benchmark, CPU/inference/storage budgets, scopes, no unbounded egress, and a clean reject/rollback. |
| **REJECT as product imports: Arize Phoenix, n8n, tensorzero, airbyte, opencut, tldraw, plus (2026-10-13) Portkey, LiteLLM, Meilisearch, Qdrant, Firecrawl, Temporal, Browser Use, changedetection.io, TruffleHog** | Repository-level imported platforms would duplicate core architecture or add license/scope risk; no evidence of a paid retention need. `Arize-ai/phoenix` LICENSE currently Elastic License 2.0, imposing hosted-service limits. | Reject wholesale copy/hosting. Reopening requires FM-00 + legal review, verified transferable package/asset/transitive licensing, customer blocker, total cost, and isolated migration with rollback. Do **not** delete any installed package on this basis. |

## Formal reopening gate for material adoption/completion/replacement

1. Identify one original backlog/customer incident and timestamped present-day reproduction; record what current code fails to do. Record at least three *retained* customers who repeat the optional expansion request for CV-18; cannot substitute prospects/stars.
2. List the existing native/manual alternative and one minimal source candidate; select owner (Chat01/02/03/04/05/06/08 as appropriate; FM-00 owns shared files and cross-cutting interfaces).
3. Pin upstream repository identity+commit, chosen component/package, root AND component files, SPDX/copyright, NOTICE, nested asset and model/data rights, dependency tree/transitive obligations, hosted/third-party terms, mark/trademark use and security advisories. Absence of a license is **not** a permission grant.
4. Record compatibility against current Next/Vinext/Cloudflare Worker target and Node/pnpm version, network/security model, D1/Supabase tenancy, PII minimization and provider cost bounds; show run-time, cold-start, memory, support and maintenance ownership.
5. Build one namespaced, nonproduction fixture, deny-list/host allow-list and cross-tenant tests; use nonproduction synthetic customer data; record exact reproducible commands and measured cost/latency/quality vs existing.
6. Require approval from proper code owner + FM-00; propose migration scripts, idempotent rollback, removal of *only confirmed existing* replaced elements, schema contract, and live cutover before attempting app/lockfile change.
7. Any unmet test or unpermitted paid dependency => **DEFER/REJECT**, not a masked successful integration.

## Attribution and authority

The CSV explicitly retains observed root-license screening and unverified transitive/asset scope. Preserving attribution does not imply legal clearance; Apache 2.0 Section 4 covers retaining copyright/attribution and NOTICE where applicable (https://www.apache.org/licenses/LICENSE-2.0.html); MIT and CC BY obligations are distinct. Skill files and SDK READMEs are untrusted reference material, not execution authority, trademarks, hosted service entitlements, user-account permissions or authenticated competitor test results.

### Handoff

Chat01/04/09 should consume the P0 **contracts**, not new dependencies. FM-00 should reconcile any overlapping IDs with its global backlog; hold every optional installation until the gate above is evidenced. Current licensed/effective use remains a **verification task** where only historical source metadata was available. No changes to root package, lockfiles, product code, shared CI/migrations, production, billing or customers are in this PR.

## 2026-10-13 refresh (local clone of exact base; live GitHub/npm metadata)

**Why dispositions changed.** The 2026-10-12 pass had no local checkout and marked current use as "unverified". This pass scanned the actual tree at `6b93c88` and reconciled against decisions already recorded in the repository (`docs/ARCHITECTURE-DECISION-MATRIX-2026-08-12.md`, `docs/GITHUB-ECOSYSTEM-AUDIT-2026-08-14.md`, `docs/repository-register/VERIFICATION-2026-10-12.md`, `docs/repository-register/experiments/*.md`, `tests/first-evidence-fast-path.test.mjs`). A disposition was changed only when (a) the code already contains the tool, or (b) an in-repo decision record already rejected it, or a current test enforces its exclusion **and** it would duplicate a KEEP control plane. Each change is recorded in column `disposition_revision_2026_10_13`.

| Candidate | Was → now | Reason (short) |
|---|---|---|
| semgrep/semgrep | DEFER → **KEEP** | Already on main as non-required CI policy with original rules (#561); LGPL engine CI-only, never bundled. Making it required = owner/FM-00 ruleset decision. |
| Portkey-AI/gateway | DEFER → **REJECT** | Duplicate gateway; native adapters + openrouter/zenmux/omnirouters lane exist; in-repo REJECT ×2. |
| BerriAI/litellm | DEFER → **REJECT** | Second gateway breaks exact provider/model provenance (#457); in-repo REJECT for customer observations. |
| meilisearch, qdrant | DEFER → **REJECT** | Second datastore; in-repo REJECT ×2; test-enforced exclusion. pgvector-in-Postgres stays DEFER. |
| firecrawl/firecrawl | DEFER → **REJECT** | AGPL-3.0 external crawler overlapping native safe fetch; in-repo REJECT/BENCHMARK ONLY; test exclusion. |
| temporalio/temporal | DEFER → **REJECT** | Second orchestrator beside KEEP Inngest; test exclusion. (Lockfile `temporal-polyfill` via inngest is unrelated.) |
| browser-use/browser-use | DEFER → **REJECT** | Broad browser-agent autonomy; in-repo REJECT ×2. |
| dgtlmoon/changedetection.io | DEFER → **REJECT** | Native snapshots/Change Graph own the function; in-repo REJECT/DUPLICATE. |
| trufflesecurity/trufflehog | DEFER → **REJECT** | Duplicate of gitleaks (KEEP, synthetic-secret proof); AGPL-3.0. |
| cosscom/coss | REFERENCE ONLY → **UNRESOLVED** | Repository now 404 (API and web). |

All REJECTs are **prospective adoption rejections**; none of these is present, so nothing is to be removed. Reopening any of them requires the formal gate above plus FM-00 approval.

**Licence of the component actually used vs. the registered repository.** Several KEEP rows name a server/monorepo whose root licence is custom or source-available, while Foremention uses a separately licensed client package: `inngest/inngest` (server) vs `inngest` npm 4.13.0 **Apache-2.0**; `getsentry/sentry` (FSL) vs `@sentry/*` 10.68.0 **MIT**; `PostHog/posthog` vs `posthog-js` 1.409.5 **(Apache-2.0 AND MIT)**; `GoogleChrome/lighthouse` vs `@lhci/cli` 0.15.1 **Apache-2.0**. CI-only tools (`axe-core` MPL-2.0, `semgrep` LGPL-2.1-or-later, Playwright Apache-2.0, promptfoo MIT, knip ISC) are not shipped in the Worker. Transitive browser-shipped code to keep notices for: `dompurify` 3.4.16 via posthog-js (MPL-2.0 OR Apache-2.0; elect Apache-2.0) under the existing security override. Vendored forks `vendor/micromatch` and `vendor/braces` retain their MIT LICENSE files. See `supplementary-candidates.csv`.

**Foremention's own licence.** The repository has no LICENSE file (Scorecard License=0, VERIFICATION-2026-10-12). For a private product this is intentional but it is an owner decision; it also matters for any future data-room/IP claim (A24, Chat08).

**PGlite (peer request from Chat02; also used by Chat03/Chat06).** Licence verified: Apache-2.0 OR PostgreSQL License (dual, README + `LICENSE` + `POSTGRES-LICENSE`), npm 0.5.9 published 2026-10-12, no runtime deps, ~25.6 MB unpacked. Disposition: **permitted as off-lockfile scratch tooling** for nonproduction evidence (as peers use it); **DEFER as a repo devDependency/CI job** because CI already replays migrations on a disposable local Supabase, and PGlite is not Supabase. Adoption gate: FM-00 decision; devDependency only, exact pin, never imported by app/worker, respect minimum-release-age policy, cross-check against the Supabase replay; rollback = remove devDependency.

**Identity warning (for Chat01).** `lib/providers/omnirouters.ts` (OmniRouters, `omnirouters.com`) is **not** `diegosouzapw/OmniRoute`; the register row stays DEFER/not adopted (#448/#449 closed). `app/subprocessors/page.tsx` lists no OpenRouter/ZenMux/OmniRouters entry; if any gateway is configured in production, Chat02/Chat05 should list it before use.
