# Chat09 independent acceptance gate report — 2026-10-12

## Decision and evidence classes

**Integration verdict: PENDING / NO RELEASE CERTIFICATION.** This is an independent source/fixture handoff, not a simulated successful customer journey or proof of production readiness. Baseline inspected: `main@6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` (2026-10-12). Current independent branch and PR heads must be rechecked at integration. The only observed peer branch was `fm-attach-v1/00-coordinator`, initially pointing at the same SHA; a composed integration candidate and populated peer handoff records were not available at inspection.

| Evidence | Actual observation | What it does **not** prove |
|---|---|---|
| Source contract inspection | Existing project-scope and comparison contracts inspected on the baseline; `tests/customer-project-boundary.test.mjs` present | Disposable two-tenant/RLS denial or full browser customer journey |
| A04 historical #531 | [PR #531](https://github.com/injamhaqq/foremention/pull/531) is merged, merge SHA `cef628ccaebac9e774ea0c70a9fc91ba0bb3333c`; old failure head `9e43354…` is not today's verification target | Green CI on exact current integrated head |
| A16 live ruleset | Active ruleset [20223161](https://github.com/injamhaqq/foremention/rules/20223161) requires `Analyze JavaScript and TypeScript`, `CI`, `actions-security`, `browser-acceptance`, `dependency-review`, `osv`, `secrets`, `trivy` | Independent gate enforcement against an authorized bypass actor; ruleset includes `RepositoryRole` bypass `always`, `strict_required_status_checks_policy=false` |
| Exact baseline workflow state | Security and CodeQL successful; baseline `CI` in progress at inspection; production browser and first-evidence canary failed | Static source review is not current-head CI pass or production-readiness proof |
| Production provenance from workflow logs | Browser workflow [38271628860](https://github.com/injamhaqq/foremention/actions/runs/38271628860) and canary [38271628656](https://github.com/injamhaqq/foremention/actions/runs/38271628656) expected `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` but observed deployed `b13e5327ebe83dd8b3d2fb40760b657f5fb9785d` | Browser app interactions were **not** executed after the preflight failure; do not characterize as browser UX defects |
| Chat09 fixtures | 30 synthetic cases and root-included independent source-contract tests added on this isolated branch | Actual staging, billing, provider, retention, security-negative or live traffic outcomes |
| Historical source trace | 71 index rows individually preserved in `09-proposals/source-trace-71.csv`; original IDs appear in two backlog versions | 71 distinct current defects or inspection of the absent historical source documents |

## Source availability boundary

Seven packet control/index files were uploaded directly. The checklist names **19** original source files, states **18 included in the prior packaging** and says `Foremention_Master_Backlog_28_v2.csv` was unavailable; however the actual 18 original source documents/CSVs and any `Source_Files` directory were **not attached to this conversation**. The index transcribes 71 historical rows across three backlogs. Only the uploaded index and metadata, together with actual inspected current GitHub sources, support this Chat09 report. FM-00 must obtain/check authoritative original sources before a global completeness certification. Similar `A04` and `A16` rows from _24 and _29 are preserved separately.

## Acceptance plan / owner-directed reproduction

The [30-case scenario register](../../../../tests/attach-v1-09/scenarios.json) defines the unexecuted nonproduction acceptance matrix. Run on disposable org A / org B identities and a composed exact SHA with appropriately provisioned sandbox, preserving evidence per case:

1. **Chat02 / A04:** tenant A owner/analyst, B owner and A viewer: enumerate project, question, run, record, review, decision, export, job, billing; attempt B->A direct IDs and mixed A+B linked objects. Require denial and *unchanged storage*, even via service job. Pair with DB policy/RLS checks and inspect audit receipts. Current source-regex checks alone are insufficient.
2. **Chat01 / observation:** capture genuinely permitted provider identity/model, buyer question/version, locale/context, raw answer and available usage/receipt. Force unrelated/polysemy, partial/refused, URL unsafe, missing provenance and budget exhaustion. Require unavailable/insufficient evidence states; no asserted source causation.
3. **Chat04 / change chain:** approve evidence, persist a Change Specification/human decision, close/reopen/reload, then collect actual later reviewed observations using exactly matching methodology/question/provider/model/context. Changed-method runs must not be comparable. Fixture clocks must never be labeled retention.
4. **Chat06 / interrupted jobs:** force network loss before/after durable acknowledgement, retry and cancellation. Ensure idempotency, limits, observable recovery, no duplicate billable jobs.
5. **Chat03 / commercial:** sandbox only; signature, webhook admission, unordered events, duplicate replay, lost-ack, subscription cancel/failed-payment/recovery and entitlement downgrade; do not charge a real card, publish price, or activate live Paddle.
6. **Chat05 / browser:** run keyboard/focus/error/zoom, reduced motion and viewport widths 320, 375, 768, 1024 and 1440; use local candidate/staging. Public pages and signed-in critical workflow both required.
7. **FM-00 / release:** deliberate failed non-security PR gate must block ordinary merge **without repository-role bypass**; collect exact rule/actor/branch/CI receipt, separately document authorized emergency review. Check rollback and previous build eligibility without touching production.

Reproduction commands (on a **full checkout at exact composed SHA**, with Node >=22.13 and pnpm 10.25): `node --test tests/chat09-independent-acceptance.test.mjs`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, plus existing isolated SQL/browser/security workflows. **Do not report a pass until their exact-head receipts exist.** Tests added by Chat09 cover source contracts and fixture completeness, not DB HTTP/runtime transactions.

## Open reproducible blockers

| ID | Observation | Owner | Clear condition |
|---|---|---|---|
| QA09-B1 | Production exact SHA mismatch blocks trusted browser and canary before test body starts | FM-00 / release | Proven deployed exact candidate SHA, then new authenticated browser/canary receipts |
| QA09-B2 | Required statuses exist but role bypass is `always`; no fail-gate merge denial demonstrated | FM-00/admin | Protected branch admission-negative receipt + reviewed break-glass policy |
| QA09-B3 | 18 original historical sources absent from delivered packet despite checklist | FM-00 | Original-file checksum/availability reconciliation; no fabrications |
| QA09-B4 | No composed candidate / peer exact-head evidence at inspection | FM-00 | Exact heads integrated in isolated branch and retested |
| QA09-B5 | A04 only source-level inspected; no new disposable two-tenant denial receipt | Chat02 + Chat09 | Complete negative tests with org/project direct-ID and RLS proof |
| QA09-B6 | Actual paid/cancellation/recovery and independently comparable later-cycle customer receipts not presented | Chat03/04/06/08 | Nonproduction integrity first, then authorized real evidence when available |

## Segmented readiness (current evidence)

| Gate | Verdict | Missing evidence to change verdict |
|---|---|---|
| Founder-led design partners | **Not independently certified** | End-to-end authorized question->authentic answer->review->decision and project isolation; operational recovery |
| Paid pilot | **Not certified** | All design-partner gates plus verified sandbox payment/webhook/entitlement/cancellation and actual paid/contract evidence |
| Self-service | **Not certified** | Safe independent onboarding/billing/support/entitlement flows with browser/accessibility/security receipts |
| 20-customer concurrent delivery | **Not certified** | Proven isolation/capacity/budgets/jobs/recovery/support, real usage + financial/retention receipts and controlled rollback |

## Rollback / handoff

Only Chat09-namespaced files have been added; rollback is to close the draft PR or revert its test/docs commits on the Chat09 branch. No app logic, workflows, migrations, secrets, external providers, production settings, deployments, payment processing or real customer data were changed. FM-00 must inspect this report and matrix on the branch, refresh exact refs, then rerun composite checks. Do **not** merge the draft merely because isolated fixture tests pass.
