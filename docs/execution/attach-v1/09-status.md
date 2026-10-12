# Chat09 — independent acceptance handoff

- **Role / branch:** Chat09; `fm-attach-v1/09-independent-qa` (isolated, no application edits).
- **Base SHA inspected:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` on `main`.
- **Source IDs owned:** `A04` (_29 row 4 and _24 row 4), `A16` (_29 row 16 and _24 row 16); preserve all 71 index rows without claiming 71 verified defects.
- **Exact branch head:** inspect current branch/PR SHA; this status file's commit updates the head, so an embedded SHA is not authoritative.
- **Paths owned:** `tests/chat09-independent-acceptance.test.mjs`; `tests/chat09-evidence-export-csv.test.mjs`; `tests/attach-v1-09/scenarios.json`; `docs/execution/attach-v1/09-status.md`; `docs/execution/attach-v1/09-proposals/source-trace-71.csv`; `docs/execution/attach-v1/09-proposals/acceptance-gate-report.md`.
- **Test classes:** newly authored root-glob Node source-contract assertions and 32 synthetic *NOT_EXECUTED* scenario records. They are NOT authenticated customer acceptance, staging tests, or production evidence.
- **Verification commands needed:** `node --test tests/chat09-independent-acceptance.test.mjs` (Node >= 22.13), then current exact-head `pnpm test && pnpm lint && pnpm typecheck && pnpm build` plus SQL/browser/security suites; upload PR check receipts. Terminal/network clone access in chat was unavailable, so no claim of local full-repo execution.
- **Remote evidence:** ruleset 20223161 status gates now include browser/security; `RepositoryRole` bypass remains `always`. PR #531 merged but historical test issue is not a current failure claim. Main at baseline had successful Security and CodeQL, in-progress CI; production checks failed on expected-vs-deployed SHA mismatch (`6b93c88c…` vs `b13e5327…`).
- **Dependencies:** FM-00 composed candidate, Chat02 two-tenant RLS receipts, Chat01 authentic measurement, Chat03 sandbox billing events, Chat04 reviewed decision/comparison, Chat06 interruption/recovery, Chat05 keyboard/responsive; Chat08 real commercial/customer evidence. FM-00 owns rulesets/shared workflows/migrations and global reconciliation.
- **Access boundary:** seven control files attached; 18 original checklist documents not attached physically; _28_v2 source explicitly missing in package metadata. Do not imply originals were inspected.
- **Required decisions:** no manual main merge, live migration, paid provider calls, deployment, billing activation, outreach or real-data changes. This is acceptance **PENDING**.
- **Rollback:** close/revert Chat09 draft PR; no application changes.
- **On continue:** read latest `fm-attach-v1/00-coordinator` and peers' branch status/PR heads, test actual composed exact candidate with nonproduction org A/B fixtures, then update gate report with passes and reproducible failures. No asynchronous work is running from this chat.

## Continuation checkpoint — 2026-10-12, post-peer inspection

**Prior exact-head verified green:** `9e8c14d2e7335c89a7e14938b4ff559dc70e9a50`. Exact PR run IDs: CI `38273528931` (1319/1319 Node tests, disposable SQL migration/tenant/comparison checks, lint, typecheck/build), browser `38273528885` (70 public observations; signed-in browser checks *skipped* without credentials), local Auth/PostgREST/Worker isolated journey `38273528855` (success), Security `38273528939` (success), CodeQL `38273528826` (success). The present head may contain this new documentation update and needs a *new* exact-head CI receipt. Do not transfer old green to new head automatically.

All ten packet branches and draft PRs located. No overlapping changed file paths from their common starting main SHA, but still **no composed integration candidate**. See `09-proposals/peer-gate-snapshot.md` for exact peer refs and CI runs. **Peer exact-head CI blockers:** Chat03 #566 1319 pass/1 fail (delegated Paddle identity guard vs stale source assertion); Chat04 #563 1320 pass/0 fail but React effect-state lint error; Chat05 #569 1311 pass/9 fail from public approved hero/contact source text contracts. Filed reproducible owner comments on those three PRs; no cross-owner file changes.

FM-00 independently verified 18/18 original available sources in its own archive; **Chat09 never received those original bytes** and has not independently reviewed them. `Foremention_Master_Backlog_28_v2.csv` remains missing. Current verdict unchanged: **INTEGRATION PENDING / no design-partner, paid pilot, self-service or 20-customer certification**. Next: inspect corrected exact peer heads, FM-00 composed branch, then run independent end-to-end acceptance against that exact candidate. No background execution continues after this turn.

## Independent QA additions — 2026-10-12

- New **QA09-31**: stale UI eligibility during run/project change must fail closed while re-authorization is pending (potential transient presentation risk identified in Chat04 PR #563; server leak not observed). Reported directly to owner.
- New **QA09-32**: untrusted evidence CSV formula/control-prefix neutralization and quote integrity. `tests/chat09-evidence-export-csv.test.mjs` executes deterministic tests of the shared `lib/csv.ts` encoder; not a signed-in export/API integration receipt.
- Scenarios **32, all NOT_EXECUTED** as full end-to-end scenarios; the standalone CSV encoder tests, once CI passes, supply only a component-level fixture receipt.
- Current head contains new test and documentation commits; previous green `9e8c14d…` is historical and **must not be reused** as exact-head verification.
