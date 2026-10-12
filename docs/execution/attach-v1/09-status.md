# Chat09 — independent acceptance handoff

- **Role / branch:** Chat09; `fm-attach-v1/09-independent-qa` (isolated, no application edits).
- **Base SHA inspected:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` on `main`.
- **Source IDs owned:** `A04` (_29 row 4 and _24 row 4), `A16` (_29 row 16 and _24 row 16); preserve all 71 index rows without claiming 71 verified defects.
- **Exact branch head:** inspect current branch/PR SHA; this status file's commit updates the head, so an embedded SHA is not authoritative.
- **Paths owned:** `tests/chat09-independent-acceptance.test.mjs`; `tests/attach-v1-09/scenarios.json`; `docs/execution/attach-v1/09-status.md`; `docs/execution/attach-v1/09-proposals/source-trace-71.csv`; `docs/execution/attach-v1/09-proposals/acceptance-gate-report.md`.
- **Test classes:** newly authored root-glob Node source-contract assertions and 30 synthetic *NOT_EXECUTED* scenario records. They are NOT authenticated customer acceptance, staging tests, or production evidence.
- **Verification commands needed:** `node --test tests/chat09-independent-acceptance.test.mjs` (Node >= 22.13), then current exact-head `pnpm test && pnpm lint && pnpm typecheck && pnpm build` plus SQL/browser/security suites; upload PR check receipts. Terminal/network clone access in chat was unavailable, so no claim of local full-repo execution.
- **Remote evidence:** ruleset 20223161 status gates now include browser/security; `RepositoryRole` bypass remains `always`. PR #531 merged but historical test issue is not a current failure claim. Main at baseline had successful Security and CodeQL, in-progress CI; production checks failed on expected-vs-deployed SHA mismatch (`6b93c88c…` vs `b13e5327…`).
- **Dependencies:** FM-00 composed candidate, Chat02 two-tenant RLS receipts, Chat01 authentic measurement, Chat03 sandbox billing events, Chat04 reviewed decision/comparison, Chat06 interruption/recovery, Chat05 keyboard/responsive; Chat08 real commercial/customer evidence. FM-00 owns rulesets/shared workflows/migrations and global reconciliation.
- **Access boundary:** seven control files attached; 18 original checklist documents not attached physically; _28_v2 source explicitly missing in package metadata. Do not imply originals were inspected.
- **Required decisions:** no manual main merge, live migration, paid provider calls, deployment, billing activation, outreach or real-data changes. This is acceptance **PENDING**.
- **Rollback:** close/revert Chat09 draft PR; no application changes.
- **On continue:** read latest `fm-attach-v1/00-coordinator` and peers' branch status/PR heads, test actual composed exact candidate with nonproduction org A/B fixtures, then update gate report with passes and reproducible failures. No asynchronous work is running from this chat.
