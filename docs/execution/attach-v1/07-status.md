# Chat07 — repositories, licenses and competitor patterns — checkpoint 2

**Package:** 07. **Date:** 2026-10-13. **Repository:** `injamhaqq/foremention`. **Branch:** `fm-attach-v1/07-repository-choices`. **Draft PR:** #568. **Base:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (main; unchanged on 2026-10-13). **Checkpoint-1 head:** `adbc49de9574810680bf51a700ce4c06fb5424ae` (CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, Isolated Authenticated Journey all **success**: runs 38273754444, 38273754680, 38273754574, 38273755244, 38273754515, 38273754460). **Exact checkpoint-2 head:** read from PR #568 (a commit cannot contain its own SHA). **Status:** documentation/proposals only; NOT product-integrated; NOT release approved.

## Owned delivery (only Chat07 paths changed)

| Path | Content |
|---|---|
| `07-proposals/canonical-repository-crosswalk.csv` | 154 canonical candidates, one disposition each. Checkpoint 2 adds 5 columns: `identity_api_2026_10_13`, `api_license_spdx_2026_10_13`, `current_use_2026_10_13` (tree scan at `6b93c88`, hits manually reviewed), `prior_in_repo_decisions`, `disposition_revision_2026_10_13`. Older columns `fresh_repository_identity`/`foremention_current_use` are kept as the 2026-10-12 record. |
| `07-proposals/source-occurrences.csv` | Unchanged: 245 occurrences (R67 67 + R124 124 + COMP 54). |
| `07-proposals/adoption-and-license-review.md` | Gate and owner proposals; 2026-10-13 refresh section (revisions, used-component licences, PGlite, identity warning). |
| `07-proposals/supplementary-candidates.csv` | NEW: PGlite peer licence review; vendored micromatch/braces forks; used-component aliases (inngest-js, sentry-javascript, posthog-js, lighthouse-ci); OmniRouters vs OmniRoute disambiguation. |
| `07-proposals/source-recovery.md` | NEW: which original sources were recovered byte-identical, which were not, and live identity/licence checks run. |
| `07-proposals/competitor-pattern-issue-map.md` | NEW: 8 knowledge-pack patterns mapped to real IDs/issues/PRs and owners. |
| `07-proposals/crosswalk-integrity.test.mjs` | NEW: stdlib `node --test` integrity checks (counts, mapping, R124 byte/row reconciliation, KEEP present / REJECT not a package, revision reasons). |
| `07-status.md` | This checkpoint. |

## Results

- **Dispositions (154):** KEEP **16**, DEFER **78**, REFERENCE ONLY **38**, REJECT **18**, UNRESOLVED **4** (checkpoint 1: 15/88/39/9/3). 11 changes, each justified in the CSV: semgrep DEFER→KEEP (already a non-required CI job, #561); Portkey, LiteLLM, Meilisearch, Qdrant, Firecrawl, Temporal, Browser Use, changedetection.io, TruffleHog DEFER→REJECT (they would duplicate an existing KEEP control plane, and the repo's own 2026-08-12/08-14 decision records or a current exclusion test already reject them); cosscom/coss REFERENCE ONLY→UNRESOLVED (repo now 404). Every REJECT is a prospective adoption decision. None of these is present, so nothing is to be removed.
- **Sources:** R124 recovered from main (`docs/repository-register/register-2026-10.csv`, byte-identical to the checklist sha256 after LF→CRLF), and it reconciles 124/124 rows. The competitor register and knowledge pack were recovered byte-identical from draft PR #535, and the competitor register reconciles 54/54 rows. **R67 not found anywhere** (main, 533 branch tips): its 67 occurrences are carried from checkpoint 1 and are unverified against the original bytes. `Foremention_Master_Backlog_28_v2.csv` is still missing and was not reconstructed.
- **Live checks:** 154 GitHub identities checked. 153 resolve, 1 is 404, and 3 are archived upstream (open_deep_research, opencut-classic, tensorzero). 53/53 competitor blobs match at the snapshot ref and are unchanged at upstream HEAD. Licences were checked for the npm/PyPI components that KEEP rows actually ship.
- **Current use (tree scan, manually reviewed):** KEEP rows are all present (deps or CI). REJECT/UNRESOLVED rows are absent from the manifest and lockfile. dompurify, zod, ajv and OpenTelemetry are present only transitively and stay DEFER for direct adoption. Readability is benchmark-only in an isolated runtime. No peer branch changes `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `vendor/`.
- **Original ID CV-18** (Commercial_Backlog_18 row 18; FM-00 crosswalk assigns it to 07): **DEFER, unchanged**. It reopens only when at least 3 retained customers repeat the same blocker and there is a specific paid request with economic acceptance. No peer status reports such evidence.
- **Peer requests answered:** Chat02 (rls-replay README) asked for a PGlite licence review. Verified: dual Apache-2.0 / PostgreSQL. Allowed as off-lockfile scratch tooling. Adopting it as a devDependency/CI job is DEFER, an FM-00 decision, because CI already replays migrations on a disposable Supabase.

## Checks actually run (local clone at branch head, Node v22.23.3, pnpm from `/usr/bin`)

1. `pnpm install --frozen-lockfile --ignore-scripts` restored the existing locked deps. **PASS**; no lockfile change.
2. `node --experimental-strip-types --test --test-concurrency=8 tests/*.test.mjs` (full repo suite): **1316/1316 pass, 0 fail**.
3. `pnpm typecheck`: **PASS**. `pnpm lint`: **PASS** (0 errors, 10 pre-existing warnings).
4. Targeted: `tests/repository-register-guards.test.mjs`, `dependency-security-lock`, `quality-tooling-contract`, `first-evidence-fast-path`, `browser-acceptance-contract`: **34/34 pass**.
5. `node --test docs/execution/attach-v1/07-proposals/crosswalk-integrity.test.mjs`: **5/5 pass**. A mutation check (one disposition flipped) made it **fail 2/5**, as it should.
6. Not run: `pnpm build`, browser and production checks. CI on the new head: see PR #568 checks. Licence screening is not legal clearance of every transitive dependency, asset or hosted term.

## Handoffs

- **FM-00:** review the 11 disposition revisions and the 4 UNRESOLVED identities; decide PGlite as a CI devDependency (recommend no); note the R67 bytes are unavailable; nothing to merge into shared files from 07.
- **Chat01:** OmniRouters (`omnirouters.com`) is not OmniRoute. Confirm its service terms. Profound SDK patterns are reference only (contract/fixture shape, no SDK code).
- **Chat02/Chat05:** `app/subprocessors/page.tsx` has no OpenRouter, ZenMux or OmniRouters entry. If any gateway is configured in production, list it before use.
- **Chat04/Chat08/Chat09:** consume `competitor-pattern-issue-map.md`. CV-18 needs Chat08 retained-customer evidence before anything reopens.

## Founder/owner decisions (collected, not requested in chat)

1. Whether Foremention should carry a LICENSE file. It is absent now (Scorecard License=0), and this also matters for A24 IP evidence.
2. Whether to approve PGlite as a devDependency/CI job. The Chat07 recommendation is no, because the Supabase replay exists.
3. Whether to make the Semgrep boundary job a required check (ruleset change).
4. Provide or locate the original `Repository_Register_67.csv` if R67 needs byte-level re-verification.
5. Hosted quotas/terms that only the owner can see: Inngest, PostHog, Sentry delivery. These are carried from VERIFICATION-2026-10-12.

## Migration/config/rollback/next

No migrations, config, application, lockfile, CI, production, billing or outreach changes. Rollback: revert the Chat07 commits or close PR #568; there is no runtime effect. Next action on "continue": re-read peer heads, re-run the integrity test, and re-scan if main moves.
