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
5. **FM-00** obtain missing original `Foremention_Master_Backlog_28_v2.csv` only when possible; preserve the distinction between 71 historical index rows and current distinct defects. Seven index/instruction files were attached, but several original historical files were recovered separately from the user's ChatGPT Library: `Foremention_Master_Backlog_29.csv` (A26–A28 rows verified), `Commercial_Backlog_18.csv` (CV-05 row verified), and corresponding audit and route/state records. The full set of 18 originals was **not individually hash-verified**; the 28_v2 file remains absent.

## No-action/safety and rollback

No production access, migrations, provider calls, spend, customer updates, billing activation, outbound messages or deployment were performed. No cross-role files were edited. No user data was fabricated. To roll back, close PR #563, delete only the isolated `fm-attach-v1/04-workflow` branch or revert its isolated commits after integration review. Do not revert shared main or a peer's worktree. `A27` server checks remain independent from the client-only control gate.

**Next dependency-ready action:** inspect exact PR #563 head GitHub Actions results, repair any feature-owned regression and update this checkpoint. Then FM-00 can inspect PR/status directly; no founder copy/paste is needed.


## Continuation checkpoint — latest code through 1541894b405deab408e8bbd61391b438205f7549

This section supplements the prior checkpoint without rewriting historical status. Confirm the current branch/PR head after this status commit; **do not use the code commit above as the exact document-head SHA**.

### Verification that happened after the first checkpoint
- At the original implementation head `f34620b4e7eea6c066bf21a1cc4e7ddb2df26f9a`: CI run **38274493514** passed **1,320/1,320 Node tests** and isolated migration replay, then **failed at lint**. The actionable failure was `components/retention-surface-bridge.tsx` line 77 `react-hooks/set-state-in-effect`. Security, CodeQL, Semgrep, Browser Acceptance, AI Safety and Isolated Authenticated Journey completed **success** for that older exact head; it was **not** full CI success. A subsequent commit `46764ec` removed the synchronous effect state update and moved the reset into the explicit Retry handler.
- GitHub connector read-only access confirmed all ten `fm-attach-v1` branches exist; FM-00 and all nine workers now have durable status files. Coordinator still reports **integration pending** and no paid launch go. Peer snapshots are contracts, not proof of composed release.
- One newer CI run was cancelled automatically when its branch head became stale. Only the **current exact SHA's full workflow conclusions** can close a gate. No production receipt has been obtained.

### Additional Chat04-owned changes
- `app/api/export/record/[id]/route.ts`: CSV keeps the original 10 answer columns in order and appends explicit organization/project IDs, run status/time, methodology version, unique-question revision/locale/market, actual observation-surface category, consumer-app non-equivalence and reference-origin uncertainty. Absent manifest/question metadata is **unavailable**, not guessed. Comparability and causal uplift are **not** inferred by exporting a Record. Missing/failed answers are not converted into zero visibility.
- `tests/attach-v1-04-record-export-provenance.test.mjs`: two new static contract checks covering column compatibility, unknown provenance and CSV formula-neutralization invocation. **Source-contract tests are not authenticated export/download acceptance.**
- `components/onboarding-wizard.tsx`: first-run browser poll bounded to 40 checks, checks HTTP/payload validity, cancels its scheduled timer on cleanup, and exposes saved-run inspection on failure/cancellation or inconclusive browser polling. The durable job is **not** automatically retried; another provider call remains a separate user choice after checking the existing record.
- `tests/attach-v1-04-customer-value-boundaries.test.mjs`: fifth explicit interruption/recovery contract added.

### Remaining acceptance gates
1. **Exact latest-head CI:** node test suite, lint, typecheck, production build, isolated migration, Browser Acceptance, Isolated Authenticated Journey, CodeQL, Semgrep, AI Safety and Security; do not count cancelled older builds.
2. **Chat04/FM-00/Chat09 integrated acceptance:** two disposable tenant-isolated journeys through persisted human-reviewed source evidence → explicit Change Specification with DO_NOT_DO/monitor or approved human choice → owner/decision date → subsequent exact compatible run → export; one ambiguous mutation/interrupted collection must recover without duplication. No synthetic clock is actual retention.
3. **Contract ownership:** Chat01 provider rights/method/sample/usage; Chat02 RLS and pre-workspace account authorization; Chat03 billing; Chat05 contrast/public account help; Chat06 job recovery; FM-00 schema and shared acceptance. No zero-question database change or authenticated support-before-workspace route was made on this isolated branch.
4. **Current performance:** Record action eligibility currently reads the bounded active-project `/api/runs` list, whose default is the newest 100. Historical Records older than that may not get action controls even when individually accessible; propose exact-ID read-only action eligibility once owner-specific API contract is approved. The existing server share endpoint continues to independently enforce active org/project role and status. Do not present a UI gate as a substitute for RLS.

### Rollback
Close draft PR #563 / revert only Chat04 commits; no migrations or production behavior were activated. No raw keys, customers, payments or outbound messages changed.


## Additional A27 authorization repair — head before note f18f940bdb643e308995526d9217ce9171931404

Client-side persisted-run existence alone does not establish permission to **share** a Record: viewer-role accounts may read/export but must not receive the share action. The A27 continuation therefore added a read-only, organization/project-scoped `GET /api/records/[id]/share` returning `{ canShare, observed }`, derived from the **same existing `canShare(role)` policy** used by POST/DELETE. The existing write endpoints independently revalidate role, project and run status. `RecordControls` fetches this server-computed capability after scoped Record existence, exposes Share only if `canShare===true`, preserves permitted export/print for reader roles, and remounts per run ID to avoid leaking a previous Record's capability state. A sixth source-contract test checks that split.

**Verification:** pending fresh exact-head runs. No claim that this GET alone is an authenticated two-tenant negative acceptance receipt. Browser/role/run-expiry/cross-org tests still need disposable identities under Chat09/Chat02 coordination. The share endpoint's capability query is read-only and does not activate distribution or alter records.


## Continuation 2026-10-13 — local checkout, executed tests, A26 + CV-05 contract + QA09-31

**Base main (unchanged):** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. **Resumed from remote head:** `9a11c6156bf757b8e64538fdb41f0da754a125ff` (the branch and draft PR #563 already existed, so this run continued them instead of recreating the branch). **Code head before this status commit:** `251c5fcd`; resolve the live branch head for the exact document SHA. Environment change vs. earlier checkpoints: a real local clone (`git` over HTTPS) with `pnpm install --frozen-lockfile` now works, so the commands below were **actually executed locally**.

**Source boundary for this run:** only `START_HERE.md`, `PROMPT.md`, `SHARED_RULES.md`, `OWNERSHIP_AND_COORDINATION.md`, `PACKAGE_ID.json`, `Source_File_Checklist_19.csv` and `Backlog_Source_Index.csv` were available. The 18 original Source_Files were **not attached**; this run did not re-verify the earlier claim that some were recovered from a Library. Work is grounded in index rows, current repo code, CLAUDE.md / FOREMENTION_STATE.md and peer status files.

### Implemented in this run (original IDs)

| ID | Change | Paths |
| --- | --- | --- |
| (regression fix) | Earlier Chat04 commit `6449c3cd` broke `pnpm typecheck` (`ReturnType<typeof setTimeout>` vs DOM `number`). Fixed. | `components/onboarding-wizard.tsx` |
| A26 | One setup-required state on `/app/support`: server resolves workspace presence (a failed lookup is **not** treated as “no workspace”); no form, no history fetch and no duplicate alerts before setup; account help via the already-published `hello@foremention.com`; CTA to `/app/onboarding`. API adds `code: "workspace_setup_required"` to the existing 404 (auth/origin/requester scoping unchanged). | `lib/workspace-setup-state.ts`, `app/app/support/page.tsx`, `components/support-center.tsx`, `app/api/support/tickets/route.ts` |
| CV-05 / A15 / A14 (contract) | Pure loop contract: stages setup→questions→setup-only→collection→review→decision (Change Specification / explicit no-action / reviewer disagreement)→owner/action/date→later cycle; later-cycle eligibility matches question-set version, methodology, question/provider/model/sampling/method and nine-field context with all reasons + exclusions; lost-ACK decision reconciliation by save key; `causation: "not_proven"` always; `closesCustomerProof` only for `origin: customer_cycle`. | `lib/customer-value-loop.ts` |
| QA09-31 (A27 follow-up, reported by Chat09) | Record eligibility, share capability and created share link are stored **with the Record ID they were computed for**; an ID change without remount immediately derives `checking` / no Share. | `components/retention-surface-bridge.tsx` |
| A28 | Buyer-question create/edit (`/api/prompts` POST/PATCH) now rejects >1,000-character wording instead of silently truncating (`cleanText(...,1000)` sliced before). | `app/api/prompts/route.ts`, `lib/approved-buyer-questions.ts` |

### Tests and checks actually run (local, this head)

- `node --experimental-strip-types --test tests/*.test.mjs` → **1,336 / 1,336 pass**, 0 fail (was 1,320 on the earlier CI run before Chat04 additions).
- Chat04 namespaced tests `tests/attach-v1-04-*.test.mjs` → **20 pass** (4 files). New behavioural file `attach-v1-04-customer-value-journeys.test.mjs` imports the real modules (not regex): A28 0/1/5/custom/duplicate/blank/>5/>1000 cases; A26 state helper; **journey 1** (tenant A: setup-only → collection → review → incomplete decision blocked → owner/date → comparable later cycle, causation not proven, fixture does not close proof); **journey 2** (tenant B: partial run with rejected slot, reviewer disagreement persists without owner, model change → not comparable with explicit reason and exclusion, tenant A rows unreachable); **recoverable failure** (interrupted collection, same-key retry returns same run, explicit retry, lost decision ACK reconciled by key, no duplicates). Mutation check: disabling the question-set-version rule or the owner/date gate makes a test fail.
- `pnpm typecheck` (tsc --noEmit) → **pass**. `pnpm lint` → **0 errors**, 10 pre-existing warnings in files Chat04 did not touch. `pnpm build` (vinext) → **Build complete**.
- **Not run:** Browser Acceptance, Isolated Authenticated Journey, CodeQL/Semgrep/Security workflows (GitHub Actions run on push; check the PR's exact-head checks), any Supabase/RLS execution (only production exists and it is read-only for this packet), any provider call.

### What the fixture journeys do and do not prove
They prove the Chat04 contract's transitions, exclusion reasons, idempotent recovery and tenant-scoped filtering against an **in-memory store**. They do **not** prove RLS, real persistence of decisions, a real provider observation, or a real elapsed later customer cycle. CV-05 stays **open** until two disposable non-production journeys run end-to-end (gate below).

### Updated dispositions
- CV-05: contract + fixture journeys delivered; **live journeys open** (needs non-production Supabase + FM-00 migrations in `04-proposals/customer-value-loop-contract.md` §2).
- A14: eligibility side delivered (`assessLaterCycle`); scheduling/admission/DST stays Chat06; **open**.
- A15: lost-ACK reconciliation contract delivered; DB `save_key` + UI wiring need FM-00 migration; **partially addressed**.
- A26: support page fixed in Chat04 scope; ~35 other routes still answer `Workspace not found.` — shared-code proposal to Chat02/FM-00; settings/resolutions/customer-success pre-setup controls **not changed**.
- A27: implemented + QA09-31 hardening; **pending exact-head CI/browser + role matrix (Chat09/Chat02)**.
- A28: 1–5 exact list + no truncation on create/edit implemented; zero-question setup-only **blocked on FM-00 migration**.

### Gates remaining
1. Exact-head GitHub Actions on PR #563 (all workflows) — check after push.
2. FM-00: migrations §2 (decision `save_key`/kind/approval/due date, `runs.question_set_version` + origin, answer sampling/method, `update_prompt_versioned` project predicate, zero-question setup-only).
3. Non-production Supabase environment (none exists; production is read-only) for two disposable journeys + recoverable failure; Chat09 executes.
4. Real later customer cycle (time-elapsed, real customer) — cannot be produced by any test.
5. Chat05 visual review of the support setup-required panel (founder workflow: visual before material UI; this reuses existing classes and adds no new visual direction).

### Rollback
Revert any of `b4f6b89e`, `21290185`, `7e253332`, `e217808f`, `251c5fcd` independently, or close PR #563. No migration, deployment, provider call, spend or outreach occurred.


## Continuation 2026-10-13 (evening IST) — founder-approved fix of Chat04 open blockers A11 caller + CV-05/A15 SQL

**Base main (unchanged):** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. **Resumed from head:** `2af90b3c4899fc433bb0b317d341134d7a75f571` (the head FM-00 composed into `fm-attach-v1/00-coordinator@327237d6`). **Inputs read:** SHARED_RULES.md, OWNERSHIP_AND_COORDINATION.md, FM-00 `00-status.md`, `00-proposals/reconciliation-71.csv`, `interface-contracts.md`, `composition-receipt.md` at `327237d6`. FM-00 listed exactly these Chat04 follow-ups: move the prompt route to `update_prompt_versioned_in_project`; deliver SQL for `save_key` / `question_set_version` / nine-field context / optional `setup_only`.

### A11 — prompt edit now calls the project-bound RPC
- `app/api/prompts/route.ts` PATCH → `lib/buyer-question-edit.ts` `updatePromptInProject` → `rpc/update_prompt_versioned_in_project` with `p_project_id = context.projectId` (server-resolved active project, never a body value). The existing org+project-scoped read stays in front (defence in depth); the caller can only reach the two versioning RPC paths.
- DB denial (P0001 “not found in this project”, 404) → **404 “Buyer question not found in the active project.”**; permission → 403; anything else propagates. A denial is **never** retried on the org-only RPC.
- **Dependency:** migration `supabase/migrations/20261013100000_update_prompt_versioned_in_project.sql` (Chat02 proposal @56d6591c, adopted by FM-00 on `fm-attach-v1/00-coordinator`). It is **not** on this branch. Compatibility bridge so 04 is green alone and composed: only when PostgREST says the function is not deployed (`404 PGRST202`) does the edit fall back to the legacy `update_prompt_versioned` (after the scoped read), with a server warning. **FM-00: delete the bridge (`LEGACY_PROMPT_RPC` branch) together with the phase-2 revoke** once 20261013100000 is in every environment.
- Tests (RPC mocked): own-project edit sends org+project; **cross-project denial** (prompt in A2, active project A1 → 404, no legacy call, row unchanged); cross-org denial; permission mapping; bridge only on PGRST202. DB-side denial was already proven by FM-00's A11 probe 4/4 on PGlite.

### CV-05 / A15 / A14 — SQL proposal + wired callers
- **Proposal SQL (for FM-00 adoption, not applied):** `docs/execution/attach-v1/04-proposals/migrations/20261013140000_chat04_customer_value_loop_persistence.proposal.sql` (+ `README.md`, `chat04-probe.mjs`, probe results). Contents: (1) `project_question_set_versions` epoch bumped by trigger on any active-question-set change; (2) `runs.question_set_version` stamped at insert/immutable and `runs.cycle_origin` (`customer_cycle` for signed-in member runs, NULL = unknown for undeclared service-role writers, `fixture`); (3) `run_answers.observation_method` / `sampling_json` derived only from `raw_json` (complements the nine fields already stamped in `measurement_context_json` by 20260901000200); (4) `record_decisions` with unique `(organization_id, project_id, save_key)`, no fabricated owner for no-action/disagreement, approved actionable decisions require owner+action+due date, approved rows immutable, member-only reads, **no direct writes** — only `save_record_decision` (idempotent; same key + different Record = PT409) and `complete_record_decision_action` (owner/admin approval). Historical rows are not backfilled.
- **Not included:** zero-question `setup_only` — FM-00 recorded it as “deferred until the founder wants it” (reconciliation-71 A28); `complete_onboarding` untouched, 1–5 questions stays enforced.
- **Callers (Chat04-owned):** `app/api/records/[id]/decision/route.ts` (GET list / POST save with lost-ACK reconciliation by save key / PATCH owner-action-date-approval), `app/api/customer-value-loop/route.ts` (GET loop state from persisted rows, newest 20 runs), `lib/record-decisions.ts`, `lib/customer-value-loop-snapshot.ts`; `LoopRun.origin` gains `"unknown"` (never closes proof). Without the migration these answer **503 `decision_persistence_pending`** — nothing is faked. No UI is wired yet (next step after FM-00 adopts).
- **Replay (disposable PGlite 0.5.9 in `/workspace/work/fix04/pg`, outside the lockfile, never production):** 04 tree 97/97 + probe **17/17**; composed `00@327237d6` tree 99/99 + probe **17/17**; proposal placed in the migrations dir: 04 **98/98**, composed **100/100**; Chat02 RLS probe on composed + proposal **10/10**. Probe covers epoch stamping/bumping/immutability, origin rules, raw-derived method/sampling, idempotent save + lost-ACK replay, PT409 key reuse, viewer/outsider/anon/cross-org/sibling-project/unreviewed-run denials, no fabricated owner, analyst cannot approve, approval completeness, immutability (incl. service role), direct-write denial, org-scoped reads, grants, org-deletion cascade.

### Requests to other owners
- **FM-00:** adopt (or amend) 20261013140000; Postgres-17 replay on a disposable Supabase project before production; remove the A11 bridge with the phase-2 revoke.
- **Chat06:** scheduled/worker-created runs must set `runs.cycle_origin` explicitly (`customer_cycle` for real scheduled cycles), otherwise they stay unknown and cannot close CV-05.
- **Chat01:** add `raw.sampling` (object: temperature/top_p/samples) next to the existing `raw.observationMethod`; until then later cycles are “not comparable — sampling unavailable” by design.
- **Chat09:** QA against the composed head after adoption: two-tenant decision save/reload + lost-ACK journey on a disposable project.

### Dispositions after this run
- A11: caller moved + cross-project denial test → **implemented pending composed CI**; phase-2 revoke + bridge removal remain FM-00.
- CV-05 / A15: SQL + callers + tests delivered → **implemented pending FM-00 adoption**; real saved-decision reload on a disposable DB and a real later customer cycle remain open.
- A14: comparison context (epoch, sampling, method, nine fields) persisted/mapped → **pending adoption + Chat01 sampling + Chat06 origin**.
- A28 zero-question setup: **deferred (founder decision)**.

### Rollback
Revert this run's commit(s) on `fm-attach-v1/04-workflow`. Nothing was applied to any shared or production database.

**Exact-head CI for code commit `3ea2d0a3ff4b60d53edec9e10e303a0f95b29fc3` (this run):** CI 38401732781 **success** (node suite + migration replay + lint/typecheck/build as configured), Isolated Authenticated Journey 38401732901 **success** (its real PATCH `/api/prompts` ran against Supabase-local without 20261013100000, i.e. through the PGRST202 bridge), Browser Acceptance 38401733043, Security 38401732913, CodeQL 38401732748, AI Safety and Code Health 38401733042, Semgrep 38401732925 — all **success**. Local: 1,350/1,350 tests, typecheck, lint 0 errors (10 pre-existing warnings), build complete. Local trial merge of this head into `00@327237d6`: 1,544/1,544 tests, typecheck pass, lint 0 errors. The commit after this one changes only this status file.
