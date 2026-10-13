# Chat09 — independent acceptance handoff

- **Role / branch:** Chat09; `fm-attach-v1/09-independent-qa` (isolated, no application edits).
- **Base SHA inspected:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` on `main`.
- **Source IDs owned:** `A04` (_29 row 4 and _24 row 4), `A16` (_29 row 16 and _24 row 16); preserve all 71 index rows without claiming 71 verified defects.
- **Exact branch head:** inspect current branch/PR SHA; this status file's commit updates the head, so an embedded SHA is not authoritative.
- **Paths owned:** `tests/chat09-independent-acceptance.test.mjs`; `tests/chat09-evidence-export-csv.test.mjs`; `tests/chat09-composed-export-tenant.test.mjs`; `tests/chat09-source-trace-matrix.test.mjs`; `tests/attach-v1-09/scenarios.json`; `docs/execution/attach-v1/09-status.md`; `docs/execution/attach-v1/09-proposals/source-trace-71.csv`; `docs/execution/attach-v1/09-proposals/acceptance-gate-report.md`.
- **Test classes:** newly authored root-glob Node source-contract assertions and 32 synthetic *NOT_EXECUTED* scenario records. They are NOT authenticated customer acceptance, staging tests, or production evidence.
- **Verification commands needed:** `node --test tests/chat09-independent-acceptance.test.mjs` (Node >= 22.13), then current exact-head `pnpm test && pnpm lint && pnpm typecheck && pnpm build` plus SQL/browser/security suites; upload PR check receipts. (2026-10-12 note: clone access was then unavailable. Superseded 2026-10-13: full local execution done — see latest checkpoint.)
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

## Continuation checkpoint — 2026-10-13 ~15:30 IST (full local clone; tests actually executed)

**Resumed from** `fm-attach-v1/09-independent-qa@1ebef5f5c273c324977b087815474851cb504263` (PR #564); not restarted. **Base main unchanged:** `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. Environment now has a working HTTPS clone with push, Node v22.23.3, pnpm 10.25.0, `pnpm install --frozen-lockfile --ignore-scripts` (no lockfile change). The earlier "no terminal/clone" limitation no longer applies.

**FM-00 composed candidate: NONE.** `fm-attach-v1/00-coordinator@2aa0c3356e06f94b7cbb9d240cf61dcb8cad4410` (PR #562) is documentation-only and still says it has not combined worker patches. Chat09 therefore built a **local, unpushed composition dry-run** to find integration faults early. It is NOT a release candidate and must not be cited as FM-00's.

### Exact peer heads verified (fetched 2026-10-13, re-fetched at end: unchanged)

| Packet | PR | Exact head | GitHub checks at head (Chat09 read) | Chat09 local full suite at that head |
|---|---|---|---|---|
| 00 | #562 | `2aa0c3356e06f94b7cbb9d240cf61dcb8cad4410` | all required green; Workers Builds fail* | docs only |
| 01 | #565 | `92805b04decd80adf776dbae88a69963adfb669b` | all required green | **1350/1350 pass** (matches owner claim 1350) |
| 02 | #567 | `4ac867c7e9ea4054a885dbb1bb49c28f46622018` | all required green | **1353 pass / 0 fail / 1 todo** (matches claim) |
| 03 | #566 | `22f70e9f0dc1091bc845f93e00dacd3975e89054` | all required green incl. billing-provider-contract | **1358/1358** (matches claim) |
| 04 | #563 | `2af90b3c4899fc433bb0b317d341134d7a75f571` | all required green (lint blocker from 10-12 fixed) | **1336/1336** (matches claim) |
| 05 | #569 | `210e8f94a8ffe042fda3192c21276f9839b5fcc6` | required green; **CodeQL FAIL (1 new high alert)** | **1328/1328** (matches claim; 9 copy failures from 10-12 fixed) |
| 06 | #570 | `59e592ea3e9ec1f168cd179050c79098baefa5af` | required green; **CodeQL FAIL (3 new high alerts)** | **1357/1357** (matches claim) |
| 07 | #568 | `28fceca3cf8f776b0fc1cbf8ae82020f569cdee1` | green except browser-acceptance in progress at read | **1316/1316**; crosswalk-integrity 5/5 |
| 08 | #571 | `2a4eaaed688fa1002d3d0b69132d8e84600f0334` | green except browser-acceptance in progress at read | **1331/1331**; `tests/08-*` 15/15 |
| 09 | #564 | prior `1ebef5f5…` all required green | see below for this commit |

\*`Workers Builds: foremention-mvp` (Cloudflare app) fails on **every** head including main; it is not a required check and Chat09 cannot read its log (Cloudflare dashboard). FM-00/founder: confirm whether the Cloudflare Git-integrated production build is expected to fail or is a broken deploy path.

Browser-acceptance logs (read by Chat09 at 05/06 heads): `PASS — 70 public browser/page observations; authenticated=skipped.` Signed-in browser acceptance remains **unexecuted** on every head.

### Local composition dry-run (unpushed)

`main@6b93c88` + 01…08 heads above + Chat09 `7bfab267` → merge commit `7da7c448…`, tree `b83274f91ee0ad6bd6c72febf9bd8b1e04200c39`. Zero textual conflicts; no branch touches `package.json`, `pnpm-lock.yaml`, `.github/` or `supabase/migrations`.

| Check on composed tree | Result |
|---|---|
| `node --experimental-strip-types --test tests/*.test.mjs` | **1530 tests: 1528 pass, 1 FAIL, 1 todo** |
| `npx tsc --noEmit` | pass |
| `eslint .` (repo config) | 0 errors, 11 warnings (all pre-existing files) |
| `npx vinext build` | Build complete |
| Chat07 crosswalk-integrity | 5/5 |
| Chat09 QA09-33 composed export (new) | **4/4 pass**; mutation checks: dropping the org filter from manifest selections fails test 2, bypassing the scoped `loadRuns` lookup fails test 1 |

### Reproducible failures, by owner

1. **QA09-B7 → Chat02 (primary) / Chat04 / FM-00 — composition breaks a tenant-denial test.** `tests/attach02-two-tenant-denial.test.mjs:232` "Record CSV export only serves the caller's active-project records" fails on the composition with `attach02 harness: unexpected import @/lib/run-manifest from app/api/export/record/[id]/route.ts`. Cause: Chat04 (`2af90b3c`) added `loadRunManifest` to the export route; Chat02's harness (`tests/attach02-harness.mjs` REAL_LIBS / deps) does not resolve it. Each branch is green alone; together the denial test **errors before asserting**, i.e. the cross-tenant export guarantee is unchecked. Repro: merge the two heads onto `6b93c88`, run `node --experimental-strip-types --test tests/attach02-two-tenant-denial.test.mjs`. Fix belongs to Chat02 (inject `@/lib/run-manifest` + `@/lib/methodology-registry` the way `tests/chat09-composed-export-tenant.test.mjs` does), not by removing Chat04's manifest. Chat09's QA09-33 shows the composed route itself does deny correctly in the emulator.
2. **QA09-B8 → Chat05:** CodeQL high "Incomplete string escaping or encoding" at `tests/fm05-website-ux-contract.test.mjs:176` (`privatePath.replace(/\//g, "\\/")` builds a RegExp without escaping backslashes/metacharacters). Test-only, low runtime risk, but it is a red security check on #569. Check run 115192349504.
3. **QA09-B8 → Chat06:** CodeQL high ×3 "replaces only the first occurrence of \t" at `docs/execution/attach-v1/06-proposals/tools/restore-rehearsal.mjs:150,151,156` (`key.replace("\t", " ")`). Proposal tooling, but red security check on #570. Check run 115192417980.
4. **QA09-B8 → FM-00/admin:** both CodeQL alert failures sit outside ruleset 20223161's required list (`Analyze JavaScript and TypeScript` is required and succeeded; the alert-gating `CodeQL` check is not), so a high-severity alert does not block merge. Ruleset re-read 2026-10-13: `RepositoryRole` bypass `always`, `strict_required_status_checks_policy=false` — unchanged (A16 stays BLOCKED).
5. **Carried → Chat01:** Chat02's `todo` test documents IPv6 SSRF gaps (`::/96`, Teredo, `100::/64`); owner patch `02-proposals/ssrf-guard-ipv6-gaps.patch.md` still unapplied.
6. **Main/production (FM-00):** main `6b93c88` CI run 38271628768 fails only at the production-provenance step: deployed `buildCommit b13e5327…` vs expected `6b93c88…` (136 attempts). Production remains on `b13e5327`; nothing on any attach-v1 branch is deployed.

### Delivered on this branch in this checkpoint

- `tests/chat09-composed-export-tenant.test.mjs` (QA09-33): real composed export route + real `lib/run-manifest.ts` over Chat02's in-memory PostgREST emulator. Auto-**SKIPs** on refs lacking both peer pieces (it skips on this Chat09-only branch; a skip is never a pass).
- `tests/chat09-source-trace-matrix.test.mjs`: 71-row integrity (18/29/24 per source, no `_28_v2` row, one verdict per ID, every pass labelled nonproduction, every row has a remaining gate).
- `tests/attach-v1-09/scenarios.json`: 35 scenarios (added QA09-33 composed export, QA09-34 CodeQL-alert merge gate, QA09-35 composed suite completeness); new `component_evidence` per scenario; `evidence_status` stays `NOT_EXECUTED` for all.
- `09-proposals/source-trace-71.csv`: new columns `chat09_verdict_2026_10_13`, `owner_exact_head`, `chat09_evidence_2026_10_13`, `exact_blocker_or_gate_2026_10_13`.
- Chat09-only branch locally: `tests/chat09-*` 8 pass / 4 skipped (QA09-33 by design).

### Matrix coverage (71 rows / 47 distinct IDs)

| Verdict | Rows | Distinct IDs |
|---|---|---|
| VERIFIED_PASS_NONPROD (CV-07, A12, A29) | 4 | 3 |
| IMPLEMENTED_PENDING_COMPOSED | 40 | 26 |
| MANUAL_BRIDGE (CV-13, A06, A23) | 5 | 3 |
| DEFERRED_DECISION (CV-10, CV-15, CV-18, A20, A24) | 7 | 5 |
| BLOCKED (CV-04, CV-05, CV-09, CV-14, CV-16, A04, A11, A15, A16, A22) | 15 | 10 |

"Verified pass" means the acceptance clause is met by deterministic nonproduction tests that Chat09 re-ran at the owner head and on the composition — never production proof.

### Exact-SHA gate report (supersedes nothing; adds today's evidence)

| Gate | Verdict | What is missing |
|---|---|---|
| Composed candidate | **NOT EXISTING / NOT GREEN** — local composition has 1 failing test (QA09-B7) | FM-00 composed SHA + full CI; Chat02 harness fix |
| Founder-led free design partners | **NOT CERTIFIED** | Signed-in browser journey (authenticated=skipped everywhere), nonproduction Supabase two-tenant HTTP/RLS matrix, real persistence of decision + later cycle, production deploy of exact SHA |
| Paid pilot | **NOT CERTIFIED** | All above + sandbox Paddle lifecycle receipt (no sandbox key), recovery point/backup (none: `backups: []`, no PITR), founder legal/payout/pricing decisions; 0 Paddle transactions |
| Self-service | **NO-GO** | Above + pre-workspace account help across routes, live pricing approval, CodeQL/bypass merge gate |
| 20-customer capacity | **NO-GO** | Workers Free CPU-limit incidents (A17), no measured labour/support/retention, no restore drill on real infra |
| Rollback | Code: revert/close draft PRs (no migrations/config applied). Data: **no production recovery point exists**, so no schema migration should be applied | Founder recovery point + disposable project drill |

Commercial evidence stays separate: 0 paying customers, $0 cash, 0 interviews recorded (Chat03/08 read-only receipts). Clock fixtures and in-memory journeys do not prove elapsed cycles or retention.

### Founder decisions collected (not asked mid-run)

1. Create a production recovery point (Supabase Pro backups or encrypted `db dump`) before any migration; approve a **disposable nonproduction Supabase project** + dedicated acceptance credentials so signed-in browser, RLS and two-journey acceptance can actually run.
2. Provide Paddle **sandbox** credentials/catalog/staging host (connected key is live-only).
3. Pricing/ICP: $299 agency pilot vs $3k/$6k SaaS vs live catalog USD 99/299 monthly.
4. Ruleset: remove/limit `RepositoryRole` bypass `always`, enable strict checks, and decide whether the alert-gating `CodeQL` check becomes required.
5. Workers plan (CPU limit, A17) — spend decision.
6. Is the failing Cloudflare `Workers Builds: foremention-mvp` check expected? Production still serves `b13e5327`.
7. Project as an authorization boundary (A11) for agency client-viewer use.
8. Legal/payout/entity/subprocessor items (CV-15, A20) and A19 copy approval.

### Next action (on "continue")

Re-fetch heads; if Chat02 fixes QA09-B7 and FM-00 publishes a composed SHA, rerun the full suite + QA09-33 on that exact SHA and read its CI; if a nonproduction Supabase + credentials are approved, execute QA09-01…35 end to end. No background work continues after this turn. Local composition worktree is scratch only and was not pushed.
