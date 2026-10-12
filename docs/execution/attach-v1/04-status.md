# Attach v1 / 04 — customer value loop execution checkpoint

**Role:** Chat04 customer-value workflow. **Owned branch:** `fm-attach-v1/04-workflow`. **Draft PR:** https://github.com/injamhaqq/foremention/pull/563. **Exact base main:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. **Implementation head before writing this status:** `eff463e6e5e295430a0d34180876e9c98c4e325d`. For the final status-document commit, resolve the branch's exact live head; this file cannot embed its own as-yet-unknown commit hash.

## Scoped historical source IDs and dispositions

| Original source rows | ID | What was inspected / changed | Status |
| --- | --- | --- | --- |
| `Commercial_Backlog_18.csv:5` | CV-05 | Existing run detail, onboarding, sharing, comparison and review routes inspected. Full two independent production-like saved-decision/later-cycle receipts are **not available**. | **Open — dependency and acceptance gap** |
| `Foremention_Master_Backlog_29.csv:14`; `Foremention_Master_Backlog_24.csv:14` | A14 | Inspected current /api/runs and comparison contracts. PR #480 merged; #500 closed/unmerged. Shared worker/DST and later nine-field proof delegated to Chat06/FM-00. | **Open — job/integration verification** |
| `Foremention_Master_Backlog_29.csv:15`; `Foremention_Master_Backlog_24.csv:15` | A15 | First collection, error states, review and reload paths inspected. Opt-in collection/save failure is explicit. PR #452 closed/unmerged. No real complete decision/second-cycle saved receipt. | **Partially addressed / full journey open** |
| `Foremention_Master_Backlog_29.csv:26` | A26 | Confirmed support component offers submit while `/api/support/tickets` requires workspace (source report, current routes observed). Supplied interface proposal for secure pre-workspace help; no cross-auth changes made. | **Open — Chat02/05** |
| `Foremention_Master_Backlog_29.csv:27` | A27 | Reserved static `compare` route excluded by UUID validation. Scoped persisted active-project run list gates UI for `review|complete|partial`; loading, eligibility error/retry and share-network error recovery. Server authorization kept unchanged. | **Implemented, pending exact-head CI/browser verification** |
| `Foremention_Master_Backlog_29.csv:28` | A28 | Added explicit 1–5 approved question validation, NFKC trim, case-insensitive duplicate, >1,000-char rejection, server no-silent-fill, manual regenerate action, optional first collection consent. Zero-question workspace unsupported by current DB function: coordinator migration proposal. | **1–5 boundary implemented, zero-question setup open** |

## Owned implementation paths

- `lib/approved-buyer-questions.ts` — pure server/client exact-list validation.
- `app/api/onboarding/route.ts` — no concatenation of AI suggestions into persisted approved questions; invalid lists fail with actionable response.
- `components/onboarding-wizard.tsx` — no step-back question regeneration; 1–5 review; explicit suggestion action; collection opt-in defaults off.
- `components/retention-surface-bridge.tsx` — UUID-only Record actions, persisted scoped list gate, safe retry and error UI.
- `tests/attach-v1-04-customer-value-boundaries.test.mjs` — 4 new regression tests (question edge cases, no implicit collection, reserved path, persisted eligibility/retry).
- `docs/execution/attach-v1/04-proposals/shared-contracts.md` — FM-00/Chat02/Chat06/Chat09 interface/migration/test proposals.
- This owned status record.

## Actual tool verification and tests

- GitHub connector: repository `injamhaqq/foremention` accessible with push; branch created from exact `6b93c88c…`; feature files and tests committed on `fm-attach-v1/04-workflow`; draft PR #563 opened. No main merge.
- Actual current files were fetched by the GitHub connector before updates; code was edited with blob-SHA guarded replacement. Commit SHAs exist on the remote branch; no local Git checkout was made.
- Container `git ls-remote https://github.com/injamhaqq/foremention.git HEAD` **failed** because `github.com` DNS resolution was unavailable. Therefore a local full pnpm install/typecheck/build/test could **not** honestly be executed against the repository in this environment.
- Opening draft PR triggered remote GitHub Actions CI, Browser Acceptance, Security, CodeQL, AI Safety/Code Health, Semgrep Boundary Policy and Isolated Authenticated Journey. At initial inspection, these were **pending/in progress**, **not PASS**. A run against an earlier commit is not an exact-head gate.
- New tests are source-level unit/contract checks. They are **not** proof of an active Supabase, provider, real customers or a genuine elapsed second cycle.

## Unresolved gates / coordination

1. **FM-00** reconcile pre-existing root/migration/public-interface constraints, decide zero-question `setup_only` migration, choose comparison-only export contract; run exact-head composed CI and QA.
2. **Chat02/Chat05** provide a verified pre-workspace account-help path and consistent setup-required states without fabricated permissions.
3. **Chat01/Chat06** provide nine-field comparable context and exact provider/model/session/locale/sampling receipts; enforce worker admission, repeat scheduling, cancellation and retry. Evaluate #500 DST patch separately rather than assuming merged.
4. **Chat04/Chat09** complete two isolated end-to-end decision/save/reload/owner/later-cycle/export journeys and an interrupted retry on a disposable real integrated environment. Human-reviewed no-action and disagreement must persist, not be inferred from fixture clocks.
5. **FM-00** obtain missing original `Foremention_Master_Backlog_28_v2.csv` only when possible; preserve distinction between 71 historical index rows and verified unique current defects. Uploaded package contained 7 index/instruction files only, not the 18 originals named in `Source_File_Checklist_19.csv`; the latter are therefore not individually hash-verified here.

## No-action/safety and rollback

No production access, migrations, provider calls, spend, customer updates, billing activation, outbound messages or deployment were performed. No cross-role files were edited. No user data was fabricated. To roll back, close PR #563, delete only the isolated `fm-attach-v1/04-workflow` branch or revert its isolated commits after integration review. Do not revert shared main or a peer's worktree. `A27` server checks remain independent from the client-only control gate.

**Next dependency-ready action:** inspect exact PR #563 head GitHub Actions results, repair any feature-owned regression and update this checkpoint. Then FM-00 can inspect PR/status directly; no founder copy/paste is needed.
