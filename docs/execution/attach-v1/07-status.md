# Chat07 — repositories, licenses and competitor patterns — checkpoint

**Package:** 07. **Date:** 2026-10-12. **Repository:** `injamhaqq/foremention`. **Isolated branch:** `fm-attach-v1/07-repository-choices`. **Base:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (current main when branch created). **Status:** documented/reconciled; NOT product-integrated, NOT release approved.

## Owned delivery

| Owned path on 07 branch | Receipt |
| --- | --- |
| `docs/execution/attach-v1/07-proposals/canonical-repository-crosswalk.csv` | 154 normalized canonical repository candidates; single justified disposition, root license limitation, aliases, original row indices, current-use verification limits, conflicts and reopening gates |
| `docs/execution/attach-v1/07-proposals/source-occurrences.csv` | Complete 245-row occurrences: R67 67 + R124 124 + COMP 54; preserves original file/path/SHAs and observations; no collapsed aliases |
| `docs/execution/attach-v1/07-proposals/adoption-and-license-review.md` | Adoption/rejection/retirement triage; ownership, budgets, test conditions, minimal reversible proposals, security and licensing guardrails |
| `docs/execution/attach-v1/07-status.md` | This checkpoint for FM-00 (only Chat07-owned paths changed) |

## Source coverage, IDs and methodological truth

- Inputs: `Repository_Register_67.csv` (67), `Foremention_Repository_Register_124.csv` (124), and `Foremention_Competitor_Source_Register_2026-10-11.csv` (54 file rows, eight repos), plus `Foremention_Competitor_Knowledge_Pack_2026-10-11.md` and packet manifest/checklist.
- 45 overlaps between the first two repo registers, none of the 8 competitor repositories overlapped them: **154 unique**. **21 cross-register historic disposition conflicts** retained explicitly.
- Results: **15 KEEP, 88 DEFER, 39 REFERENCE ONLY, 9 REJECT, 3 UNRESOLVED**. KEEP is a preservation decision, not proof of live installation/passing CI. REJECT is a prospective adoption disposition, never instructions to delete absent code.
- Original assigned backlog: **CV-18** (Commercial_Backlog_18.csv row 18, P2 optional expansion). Deferred until at least 3 retained customers report the same blocker plus economic acceptance, per source; other-role original IDs are referenced as interface dependencies rather than claimed owned implementations.
- Missing original `Foremention_Master_Backlog_28_v2.csv` acknowledged and **not** invented. External/locked third-party source code not imported; competitors' usage/data/accounts inaccessible.

## Current code and source checks actually performed

- Fetched current main exact SHA, `CLAUDE.md`, `FOREMENTION_STATE.md`, `README.md`, `package.json` (blob `63453e7cfdd2e68bd3dd1baec97a6a7fd42fba23`), `pnpm-lock.yaml`, Stage-0 and architecture/release/testing/security documents, selected browser scripts. Root manifest confirms existing Inngest/Sentry/PostHog/Vinext/Cloudflare stack; Playwright/axe used by browser scripts from `.ci-tools`. No complete current source and CI dependency inventory was executed.
- GitHub repository metadata read on 2026-10-12 for Foremention and 11 relevant candidates. Retrieved current root LICENSE files from Profound TypeScript (Apache-2.0), Voyage GEO (MIT), rebelytics Peec (CC BY 4.0), Arize Phoenix (Elastic 2.0) and Docling (MIT); official `peec-ai/peec-mcp-skills` size=0 and LICENSE fetch reports repository empty. Root checks are **not** component, transitive, trademark or hosting clearance.
- Confirmed FM-00 coordinator branch `fm-attach-v1/00-coordinator` with `00-status.md` reporting integration pending; no assumption that other 8 workers have finished.

## Actual tests / checks

1. Local standard-library CSV transform/validation: **PASS** — 67, 124, 54 input rows; 154 unique canonical keys; 245 unique (source,row) observations; output dispositions enumerated; 21 conflict flags retained.
2. Remote `07-proposals/canonical-repository-crosswalk.csv` fetched by GitHub and counted: **154 DATA ROWS PASS**.
3. Remote `07-proposals/source-occurrences.csv` fetched by GitHub and counted: **245 DATA ROWS PASS**.
4. Current code review: **PARTIAL** — exact-base main files and browser scripts seen. **NO `pnpm test` / lint / typecheck / build / browser / deployment / real-provider tests were run**; container GitHub clone fails DNS resolution, and GitHub connector is API-based rather than a local runnable checkout. Do not claim application green.
5. License review: **PARTIAL** — 5 current root-license fetches and historical metadata for rest; component/subfolder/transitive rights incomplete; the proposal specifies mandatory pre-adoption gate.

## Dependencies and handoff

- **Chat01**: reproduce legacy irrelevant retrieval/abstention, usage guard concerns; use existing code before introducing a provider SDK/crawler; preserve method/source uncertainty.
- **Chat02**: tenant, PII, credential, egress and review approval constraints on any future pattern.
- **Chat04**: evidence-to-human Change Specification and comparable second-cycle contracts. No competitor bulk cloning.
- **Chat05**: public copy/SEO claims remain evidence-backed; competitor source patterns are reference only.
- **Chat06**: maintain existing Inngest operations/recovery rather than parallel scheduler.
- **Chat08**: require concrete retention/paid adoption evidence before optional expansion, not research labels.
- **Chat09**: independently check affected fixtures and any eventual composed runtime candidate.
- **FM-00**: review 21 conflicts and 3 unresolved identities, adopt no new runtime library from this PR; coordinate exact-head integration and live verifications.

## Migration/config/rollback and next step

**Migration proposal:** none to execute. **New service/API usage:** none. **Application, root lockfile, CI, production, outreach and billing changes:** none. **Rollback:** revert/drop this isolated documentation PR; no runtime or data effect. **Next permitted step:** FM-00 review and disjoint owned-provider/decision/QA fixture implementation when their exact peer heads/requirements arrive. Do not merge main here.

Branch commit before this checkpoint: `e9a7addd43dbaa26545ac48615eea3da8af1b972`. Final exact PR head is retrieved from PR metadata; a commit cannot self-describe its final SHA. This status is a resumable report, not a promise of autonomous later execution.
