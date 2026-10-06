# Real-usable product transformation — first bounded slice

Date: 6 October 2026 Asia/Dhaka. Stage 0 and issue #283 remain authoritative.
This is implementation evidence, not customer proof or a deployment receipt.

## Verified checkpoint

- Freshly fetched main: `aae237b6ba42efe2ec7711ae3d8c472594cd8a04`.
- Main push workflows: CI 37132008375, Browser Acceptance 37132008399, Security 37132008391, CodeQL 37132008504, AI Safety/Code Health 37132008383, authenticated canary 37132008393: success at inspection.
- Read README, FOREMENTION_STATE, CLAUDE, SECURITY, Stage-0 gate, founder playbook, integration boundaries, production readiness, testing and build verification. Root AGENTS.md is absent; public/AGENTS.md is a public resource, outside this patch.
- Issue #283 remains open; its dated commercial counts are historical, not a fresh customer census. Current traction and under-15-minute activation remain Unknown.
- Production homepage, login and isolated fictional workspace were inspected in the browser. No real login, customer mutation or provider call was performed.
- Production demo showed three competing instructions: approve five questions, finish baseline via onboarding, and review a source. Its checklist considered four approved questions sufficient.
- Production demo also showed aggregate run totals without a matching latest answer preview. This is a separate fixture consistency issue, not evidence of missing customer answers.

## Product map and audit

| Existing owner / route | Decision | Reason / current limitation |
| --- | --- | --- |
| Public website and signup/login | KEEP; reuse #416 | Founder-led pilot positioning and fictional demo exist. Public redesign is already a separate draft. |
| Onboarding wizard, onboarding profile/analyze | EXTEND later | Website-derived drafts, manual fallback, competitor/question suggestions already exist. Field-level detected/suggested/confirmed provenance still needs focused review. |
| Questions `/app/prompts` | KEEP | Approval and launch already exist; first-baseline guidance must consistently ask for five. |
| Records `/app/runs` and detail | KEEP | Canonical answers, provider context, review, evidence inspection, cost and rerun controls exist. Zero citations must not strand the user. |
| Overview `/app` + retention attention | SIMPLIFY now | Share baseline guidance; eliminate conflicting internal retention panels and false quiet error states. |
| Evidence `/app/source-map` and contained inspection | KEEP | Explicit source review must remain distinct from record review and automated retrieval. |
| Opportunities + Change Specifications | KEEP / EXTEND next | Existing evidence-gated decision path; do not introduce another action object. First-use evidence-to-decision handoff needs a separate acceptance slice. |
| Comparisons `/app/analytics` | KEEP | Exact comparison boundaries are mandatory. #418 and #357 contain related integrity work; no new delta calculation here. |
| Outcome Ledger `/app/outcomes` | EXTEND after dependencies | #356 → #357 → #358/#359 already cover inspectable chains and isolated verification. No revenue-causality claim. |
| Intelligence Loop / Decision Lab | RELOCATE contextually (already in All tools) | Useful specialist surfaces, unnecessary as onboarding prerequisites. |
| Agent Control Plane | DEFER first-use exposure | Recorded telemetry is not customer value or proof of autonomous capability. |
| Alerts / Tools / Settings | KEEP | Maintain discoverability and routes; avoid a simultaneous navigation migration. |
| Ask Foremention / broad connectors / new enterprise objects | DEFER | No validated customer blocker justifies expanding Stage 0. |

## Biggest activation/usability problems

1. Contradictory first-use guidance between Overview and Attention (fixed here).
2. One approved question marked readiness while the activation path requires five (fixed here).
3. Zero-citation reviewed records stuck behind source review (fixed here without granting opportunity eligibility).
4. Failed attention reads presented as no attention needed (fixed with 503, explicit error and retry).
5. Internal retention-health language before the main customer content (removed from this first-use surface; API diagnostics retained).
6. Fictional demo run totals and answer preview do not align (deferred fixture repair).
7. Evidence-to-Change-Specification creation remains a distinct navigation/task boundary (next slice).
8. End-to-end real-provider, customer-authenticated activation time and second-cycle return are not freshly proven (blocked on an approved test workspace and release).

## Dependency-aware execution plan

1. A: audit/main/PR map — completed for this checkpoint.
2. B1: consistent first-baseline guidance and trustworthy attention errors — this draft.
3. B2: approve/verify #418 isolation prerequisite and reconcile inherited build defects before release.
4. C: refine a bounded 1–5 item decision-attention view after baseline guidance is accepted; reuse existing read models.
5. D: reviewed evidence → owned Change Specification, with acceptance criteria and remeasurement plan; inspect overlap with #356/#357 before editing.
6. E: comparable second cycle → honest result, using existing Outcome Ledger gates and isolated verification stack.
7. F: instrument only actually completed reviewed/accepted cycles; no historical backfill or proof from page views.
8. G: new capabilities only for repeated qualified customer blockers. No broad connector/agent build.

The five-destination Today/Questions/Evidence/Actions/Results IA is a hypothesis to evaluate after this slice. Existing URLs and eight-destination navigation remain intact to avoid mixing routing changes with evidence/readiness fixes.

## Implementation ledger

### Prerequisite repair

- Problem: #418 exact head contains six missing project arguments across five runtime files and a malformed legacy detector test.
- Local commit: `49ec0c0f` (remote publishing may produce a different commit identity with the same tree).
- Reused: existing project-scoped Notion export and follow-up finalizer contracts.
- Files: `app/api/integrations/notion/export/route.ts`, `app/api/resolutions/route.ts`, `app/api/runs/[id]/route.ts`, `app/api/runs/[id]/review/route.ts`, `lib/jobs/inngest.ts`, `tests/legacy-run-change-detector.test.mjs`.
- No schema, RLS policy, permission, provider, secret or production change.
- Security effect: pass the established active/run project identity through existing fail-closed contracts; do not relax the new signatures.

### B1 — first-baseline guidance

- Problem solved: conflicting setup destinations and thresholds, zero-citation dead end, false quiet state on attention failure.
- Reused: Recommendation Records, human answer/source review, Overview checklist, Attention inbox, provider availability, existing project ownership helper, existing routes and CSS.
- New helper: `lib/baseline-guidance.ts`, a pure derived presentation model; it is not an activation event or persistent object.
- Modified surfaces: `app/app/page.tsx`, `app/api/retention/attention/route.ts`, `components/retention-surface-bridge.tsx`, `lib/retention-loop.ts`.
- Added behavioral tests: `tests/baseline-guidance.test.mjs`, `tests/attention-route-state.test.mjs`. Four existing copy/location contracts updated to follow the shared helper and deliberate panel removal.
- Schema changes: none. No dependency/lockfile changes.
- Security: viewer-token reads only; schedules require active project; legacy action links are filtered through the existing all-links ownership contract; overflow fails closed. Sibling/ambiguous/unlinked actions cannot contribute due items or activation ownership.
- Evidence: a reviewed record requires a terminal run with a complete, nonempty verified answer set. Zero citations do not create a source review, opportunity, inferred explanation, action, outcome or causal claim. No comparison formula changes.
- Deadlines: a task due date is not remeasurement; only explicit remeasurement dates produce those reminders.
- Acceptance: both surfaces use the same five-question baseline guidance; record review and source review remain separate; failure/loading/cancelled states stay visible; attention failure has retry and Records fallback.
- Tests run: `pnpm test` 972 passed, 0 failed; `pnpm typecheck` passed; `pnpm lint` passed with 9 existing warnings; `pnpm build` passed; `git diff --check` passed. Node 24.19.0 / pnpm 11.25.0 locally; CI uses repository-pinned versions.
- Browser: current production fictional journey inspected. Candidate browser not verified locally: cloud browser blocks localhost; local Wrangler exits with `uv_interface_addresses` environment error. `vinext start` also cannot directly load the Cloudflare bundle. Independent PR browser checks remain required.
- RLS scope tests are executable mocked route tests using the real ownership filter, not a claimed live two-tenant Supabase test.
- Commit/PR exact identities and independent checks: see the draft PR receipt; no merge or deployment authorized by this ledger.
- Known limitations: latest-record readiness is not historical activation; provider coverage and live spend are not exercised; no new customer outcome event; existing legacy placement metrics retained in API diagnostics; no full Today insight synthesis yet.
- Next dependency: verify the full #418 stack and candidate browser journey, then implement the reviewed-evidence-to-Change-Specification handoff.

## Authority boundary

No merge, deployment, migration, external customer communication, submission, charge, secret change or public pricing change occurred. A merge/release decision is premature until independent candidate gates and the prerequisite stack are verified.

## Open PR inventory at inspection

All 24 open PR metadata/body records were inspected. Mergeability is GitHub's snapshot, not release approval.

| PR | Scope | Base | Exact head | Relationship state |
| --- | --- | --- | --- | --- |
| #420 | Company OS: add reviewed funding source evidence layer | `company-os/funding-draft-service-20261005` | `7f433f4b09821e33e0242e054a06cee6dca9153f` | mergeable at inspection |
| #419 | Company OS: reconcile capability register with Oct 5 blueprint | `company-os/funding-draft-service-20261005` | `981833384fd817e144d21938d42562962c21e491` | conflicts |
| #418 | P0: enforce active-project boundaries across customer product | `main` | `da0da0f4b0228cd6c4bd3d15cdba80698f6c73be` | mergeable at inspection |
| #416 | Website: implement 5 Oct public website blueprint | `main` | `77b5cc2ea1513cb1007a69c3a7c4ce24988b4023` | mergeable at inspection |
| #415 | Company OS: add authenticated scoped funding draft persistence | `company-os/funding-draft-runtime-20261002` | `0ad67ef1678cdb50f3a7367555e660e690d1a6c6` | mergeable at inspection |
| #413 | Security: mitigate braces recursion depth while preserving OSV gate | `main` | `d90ca8081e13090608f59011e9efce77d2c14a0a` | conflicts |
| #410 | Company OS: prepare funding drafts with patched dependencies | `company-os/unified-capability-spine-20261002` | `6b8b78dfccca600001d3b28bfa709bd8c64efe7b` | mergeable at inspection |
| #409 | P0: enforce project boundaries for workspace comments | `integration/authenticated-outcome-evidence-20260928` | `68ecc542004bed70a549e5ea2dc0e037ada9fb8a` | mergeable at inspection |
| #404 | Company OS: add unified capability integration spine | `main` | `5ab7ab705d6577b75cad0d3419447e25ac7d53b3` | mergeable at inspection |
| #402 | P0: enforce active-project boundaries for Google Sheets exports | `integration/authenticated-outcome-evidence-20260928` | `dc500fc21b9a2f79e228dfc13eac378857c37df6` | conflicts |
| #368 | Stage 0: dated competitor intelligence, founder 90-day plan and safe public Agent Reach export intake | `main` | `2f1ceb6582f8805166b6228882348a44ecd0f443` | conflicts |
| #367 | Research: dated competitive radar and secure Agent Reach research intake for Stage 0 | `security/patch-undici-fast-uri-20260929` | `2f1ceb6582f8805166b6228882348a44ecd0f443` | conflicts |
| #361 | P0: patch newly disclosed undici and fast-uri dependency advisories | `main` | `777cfdceffb7a83ee6310614423a07bfa56bbe85` | conflicts |
| #359 | Stage 0: verify signed-in PostgREST RLS and persisted nine-field comparisons in isolation | `hardening/outcome-exact-context-evidence-gate-20260928` | `18b9c5f4fb86aea582de9766c9a29bb825a9fb45` | mergeable at inspection |
| #358 | Stage 0: verified compiled-Worker APIs, decision evidence, authenticated Outcome Ledger | `hardening/outcome-exact-context-evidence-gate-20260928` | `8f5726fd8346c8f542d20b83e1388d549a731881` | mergeable at inspection |
| #357 | P1 #351: fail-close Outcome Ledger on full nine-field context even before database release | `strategy/decision-evidence-wedge-20260928` | `2a73f4c234c01b73c403d57b3977a18cbd416650` | mergeable at inspection |
| #356 | Stage 0: sharpen Foremention around inspectable decision evidence | `main` | `cb83c01171280dc6e9175ad624367851251fac0d` | mergeable at inspection |
| #355 | Stage 0: buyer-question competitive evidence packet grounded in reviewed citations | `main` | `2fe0b71c91d2426a52aea4eabf14f8ae506d88c9` | mergeable at inspection |
| #354 | P1 #332: fingerprint production migration ledger against pinned Git migration blobs | `main` | `d8733c9d2768ec41023010fd850496e4407a73d1` | mergeable at inspection |
| #353 | P1 #334: exercise authenticated customer review-to-second-cycle APIs in disposable local stack | `main` | `281b325294bc39251730d8ab167fc314ea63c422` | mergeable at inspection |
| #352 | P1 #351: verify complete follow-up context parity on isolated Supabase | `main` | `1bf6235df09ba5c81f6d80ef458e7fe8be59904d` | mergeable at inspection |
| #347 | P0: fail closed on official-domain search evidence and synthetic canary relevance | `main` | `8511b08ef9e3e3949b63494f4e8f34ca2fce4db5` | conflicts |
| #286 | Bump the npm-security-and-maintenance group across 1 directory with 20 updates | `main` | `acfe927e96d453546210eb48b11557afee425a0e` | mergeable at inspection |
| #235 | Bump the github-actions-maintenance group across 1 directory with 11 updates | `main` | `fc326bf5db1b7f9dd0bb678237378422ce524592` | mergeable at inspection |

#418 contains wider isolation/record work than its initial body describes (81 files at the inspected head). This slice is stacked on `da0da0f4b0228cd6c4bd3d15cdba80698f6c73be`, not merged to main. Its latest CI/Browser/CodeQL/Security workflows reported failure with cancelled jobs and no failed steps in the inspected job records; AI Safety passed. This is not a green release receipt. Local verification additionally found the concrete prerequisite defects repaired above.

Dependency groups: main → #356 → #357 → #358/#359; #402/#409 target #358; main → #404 → #410 → #415 → #419/#420. #367/#368 share one research head with different bases. #361/#413 and dependency updates need current-main reconciliation rather than blind merging. #416 is a separate public-site change. #352 stages a nonproduction comparison correction, #353 isolated customer APIs, #354 migration provenance, #355 buyer-question evidence, #347 provider source relevance. No part of the funding stack is pulled into this customer patch.

## Release prerequisite: source-map-js indexed-map denial of service

Problem: exact-head CI dependency audit and two independent security scanners block #421 on `source-map-js` 1.2.1. Customer-safe release requires repairing the dependency rather than suppressing the advisory.

Existing owner: PostCSS transitive dependency and existing `pnpm-workspace.yaml` security override policy. Separate bounded branch `security/source-map-js-20261006`, based on #421; no overlap with the test-only #422 slice. Changes: workspace override, matching lockfile package/snapshot/integrity, regression assertion in `tests/dependency-security-lock.test.mjs`, this ledger. Registry metadata supplies the 1.2.2 integrity; all other package versions remain unchanged. Primary upstream sources: https://github.com/7rulnik/source-map-js/issues/76 and https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2 . No schema, RLS, auth, secrets, provider behavior, audit suppression or production operation. Acceptance: frozen install, audit high/critical clear, test/lint/typecheck/build pass, exact-head CI/security verification. Browser remains a separate #422 dependency. Commit/PR identifiers and final receipts are reported in the PR description.
## Follow-up: credential-free candidate browser acceptance

Problem: #421 Browser Acceptance passed public routes/reflow but explicitly skipped authenticated routes because dedicated credentials were absent. That receipt did not verify the changed Overview.

Reused: existing local Worker PR job, pinned Playwright/axe tooling, `/api/auth/demo` fictional workspace flow, Overview, Questions, Records, Attention retry. Files: `scripts/browser-demo-baseline.mjs`, `.github/workflows/browser-acceptance.yml`, this ledger. No schema, RLS, auth, runtime, package, or provider changes. The script rejects non-loopback origins and unexpected mutations, exercises question-count agreement and next-step routing, record navigation, 503/retry with keyboard Enter, 1440/375/320px overflow and scoped axe checks. Screenshots and JSON receipts use the existing browser artifact directory. It runs only against the PR-local Worker, never production. It does not verify real provider collection, tenant isolation, activation, or customer outcomes. Local syntax/lint/patch hygiene checked; rendered receipt awaits CI because this workspace cannot launch the Worker. Commit and PR identifiers are supplied in the PR receipt to avoid self-referential commit metadata.

#421 exact head `322a7b689080cae392085fedadca984d0fc1ebe7`: retried cancelled gates. CodeQL, secrets, dependency review and workflow lint passed. CI dependency audit, Trivy and OSV now report the existing `source-map-js` 1.2.1 advisory (CVE-2026-93749 / GHSA-68fv-2mgg-jv7q), fixed in 1.2.2. This is a release blocker, not suppressed. A separate dependency-only repair is required before release; no merge or deployment authorized.

## Attention readability discovered by rendered review

#422 initial browser run `37408720525` passed the demo navigation/retry/axe/overflow checks at all three widths. Its archived screenshots revealed that the pre-existing Attention component had no layout CSS: links ran together into one paragraph above Overview. A passing machine check did not establish usable visual hierarchy.

Problem solved by the follow-up: visually separate Attention items and make each title, evidence limitation, and next-step link readable. Reused existing AttentionInbox and dark-workspace tokens; no new objects or conclusions. Files: `app/globals.css`, `components/retention-surface-bridge.tsx`, browser script, this ledger. Added responsive rows, spacing, explicit title/detail hierarchy, scoped wrapper including loading/error states, keyboard focus border and mobile action placement. Browser acceptance now asserts vertically separated rows, in addition to the existing navigation/retry/axe/overflow checks. No schema/RLS/data/security changes. #422 will target #423 so its candidate incorporates the verified security prerequisite; both remain above #421/#418. The initial screenshot receipt predates this layout fix; new rendered verification is required.

#423 Security run `37409013165`, CodeQL `37409013204`, and AI Safety `37409013217` passed at `e84f9b2c647ebbe235714d3f2c86a0c29192dba3`. Local frozen install completed using pinned pnpm 10.25.0; production dependency audit at moderate threshold reported no known vulnerabilities. Remaining full verification is recorded in the final PR receipt.

## Coherent fictional evidence slice — Oct 6 continuation

Checkpoint: refreshed main remains `aae237b6ba42efe2ec7711ae3d8c472594cd8a04`; all 27 open PR heads/dependencies unchanged. #422 head `7c8db5d7dd7b084774b57d9cb65aa9659ed19a8c` has all five workflows green. Continued on bounded `product/coherent-demo-evidence-20261006`, stacked on #422.

Customer problem: Overview/Records advertised 160 fictional answers but displayed none, while Intelligence computed a different 16-answer set. Sources, question-performance and competitor summaries also used independent samples. This obstructed evidence inspection and made the demonstration internally inconsistent.

Reused: existing in-memory `lib/demo-data.ts`, Recommendation Record answer/source components, data loaders, Intelligence computation, PR-local browser acceptance. One fictional answer fixture now owns the run summaries, question text, provider/model labels, dates, returned references, brand presence and first mention. Source Map citation totals are derived from the selected Record; unknown Record IDs return no fixture evidence. The customer Supabase queries and auth/RLS remain unchanged. Demo answer/search, competitor and question samples reuse the fixture; unsupported demo decision metrics remain unknown, source review remains pending. Existing fictional cost estimates remain explicitly demonstration data.

Files: `lib/demo-data.ts`, `lib/data.ts`, `lib/evidence-integrity-data.ts`, `lib/intelligence-loop.ts`, two Recommendation Record components, browser script, `tests/demo-evidence-fixture.test.mjs`, this ledger. Schema: none. Security: no token, role, RLS, provider or database mutation change. Repeated citations now receive answer/citation-specific accessible heading IDs rather than reusing one source ID across a Record.

Acceptance: Overview's preview and advertised answer count match the 16 inspectable answers; returned citations open contained evidence with pending human review; previous Record sources do not borrow newer references; repeated evidence headings are unique; demo 4-of-5 readiness remains unchanged; responsive/error/retry checks still pass. Added three executable fixture conservation/provenance tests and extended the existing browser journey. Local test/lint/typecheck/build checks pass before the final heading-ID adjustment; final rerun and rendered receipt required before completion. Commit/PR and exact-head receipts will be recorded in the PR description.

Known limitations: fictional mode cannot prove live provider analysis, real activation timing, action approval, customer outcomes or a retained second cycle. The next live blocker is a missing customer-facing creator for the existing Change Specification API; the legacy Create action button currently writes a placement instead.

### D1 — reviewed evidence → canonical decision draft

- Customer problem: Resolution Center exposes reviewed problems but sends a customer without a Change Specification back to Overview. The existing scoped creation API has no customer-facing caller.
- Owner reused: `opportunities`, reviewed `source_observations` / `evidence_items`, `change_specifications`, `change_specification_evidence`, existing audit log, and the existing Change Specification detail editor. Execution assets remain subordinate; legacy assets retain their stored history.
- Dependency: draft #424 → #422 → #423 → #421 → #418. This is a presentation handoff on that stack. #356/#357 outcome/comparison work and #419/#420 funding/Company OS are not imported or changed.
- Acceptance: select explicit persisted evidence; choose one baseline Record for source observations; create only a conservative draft; continue to the canonical editor to define the change, owner, acceptance criteria and verification plan. No automatic approval, generation, publication, measurement or attribution. Hide execution/follow-up controls until a decision or historical asset exists.
- Files: `components/resolution-center.tsx`, `app/app/resolutions/page.tsx`, `app/app/resolutions/resolution-center.module.css`, new pure `lib/decision-draft-request.ts`, `tests/decision-draft-request.test.mjs`, `tests/decision-draft-route-state.test.mjs`, `tests/decision-draft-client-state.test.mjs`, its shared fixture helper, `scripts/browser-decision-draft.mjs`, the existing Browser Acceptance workflow, this ledger.
- Schema/API/security changes: none. Existing mutation-origin, viewer-token, role, organization/project, provenance and rollback checks remain authoritative. Client checks provide feedback; they do not authorize access. Demo and viewer submissions remain denied. No new persistent object, endpoint, dependency, RLS policy, provider call or secret.
- Evidence integrity: unsupported, unpersisted, missing, mixed-baseline and oversized selections fail visibly. No silent evidence truncation. Review remains distinct from causality. API-created draft retains UNKNOWN eligibility, INSUFFICIENT_EVIDENCE decision, HYPOTHESIS truth and INSUFFICIENT confidence.
- Reliability: synchronous in-flight lock prevents rapid duplicate submissions. An uncertain save blocks another mutation on that page and tells the customer to reload and inspect existing decisions. This is not cross-tab/server idempotency.
- Tests: executable handoff cases; mocked execution of the actual canonical POST route for anonymous/demo/viewer/origin denial, sibling-project/missing/unreviewed provenance, conservative writes and scoped rollback; rendered React/client handler tests for read-only states, duplicate submission, uncertain response and historical assets. These are fixtures, not customer proof.
- Browser verification: authenticated decision creation is unverified; dedicated acceptance credentials are absent. Local browser/Worker restrictions remain documented in earlier slices. PR-local checks additionally render the actual React component with an isolated synthetic GET-state fixture and real global/module CSS at 1440/375/320px, checking native keyboard selection, overflow and axe. That rendering fixture cannot prove the authenticated mutation journey; save handlers and the actual POST route are exercised by executable mocked tests.
- Validation/commit/PR receipts: recorded in the PR after the final local checks. No merge or deployment authorized or performed.
- Known limits: no server-side cross-tab idempotency; no real workspace/provider acceptance or activation timing claim; a draft is not an accepted action or measured outcome. Existing advanced editor terminology and legacy placement creation on Opportunities require separate reconciliation.
- Next dependency: authenticate an isolated acceptance workspace and verify evidence selection → saved draft → human review → comparable follow-up; align Opportunities with the same canonical decision entry point before expanding instrumentation.
- Rendered fixture follow-up: the full Record screenshot exposed the legacy `.answer-stack article > p` rule overriding canonical answer typography. The bounded canonical selector now keeps recorded answer text readable on the actual dark workspace background; PR-local demo acceptance audits the answer paragraphs with axe. Styled-label and nested-disclosure test selectors were corrected without relaxing product-state assertions.

- D1 theme review: existing light wash colors conflicted with the canonical dark workspace text. Resolution panels now reuse established theme surfaces; baseline labels and the selector remain bounded at narrow widths. The rendering fixture loads the root layout's actual stylesheet order and the app-frame theme scope.

### D2 — readable source review and explicit read-only states

- Problem: exact-candidate Record screenshots expose inherited white foreground on hardcoded white source-review controls. The fictional demo/viewer fields remain editable and the demo offers a save operation, despite the declared read-only evidence boundary.
- Reused: existing SourceReviewForm, existing scoped PATCH API, existing human source-review and opportunity gates, established theme tokens and existing PR-local demo journey. No new truth store or workflow.
- Dependencies inspected: fresh main remains `aae237b6ba42efe2ec7711ae3d8c472594cd8a04`; all 29 open PR heads/bases refreshed before this implementation and unchanged except this task's own candidates. D2 is based on #425, downstream of #424/#422/#423/#421/#418. Existing outcome, funding, Company OS and public website stacks are unchanged.
- Files: `components/source-review-form.tsx`, `app/canonical-evidence.css`, `scripts/browser-demo-baseline.mjs`, new `tests/source-review-client-state.test.mjs`, this ledger.
- Acceptance: selected values and review text remain readable in the canonical workspace; read-only states disable the entire field group and save button; dispatched demo/viewer submissions cause no network mutation or activation event; real review still uses the established API, records the same evidence fields and preserves its synchronous submission lock.
- Schema/API/security changes: none. Server authorization, organization/project checks, review provenance, opportunity eligibility and audit logging remain authoritative. Client read-only behavior is not a replacement for authorization. No demo review data is created or recorded as customer proof.
- Tests: executable actual client handler/render tests cover read-only fields, programmatic denial, existing writable request/duplicate lock, success events and failure withholding. Browser checks inspect the real demo's contained form, native disabled state and computed foreground/background contrast (at least 4.5:1, including read-only values) at 1440/375/320px. Full validation receipts and exact commit/PR are recorded in its PR after checks.
- Browser limitation: no real authenticated review mutation is proven by fictional demo or mocked tests; dedicated acceptance credentials remain absent. No merge/deploy occurred.
- Next dependency: reconcile the legacy Opportunities placement CTA with canonical decisions and verify the authenticated review → decision → comparable follow-up journey in an isolated acceptance workspace.

- D2 final screenshot review also exposed a legacy white card underneath light-text, verbatim brand-mention sentences. Canonical mention-context cards now use the established dark surface/foreground tokens; the actual Record browser journey audits those extracted sentences separately. No extraction, measurement or inference logic changed.

- D2 browser fixture reliability: the simulated Attention outage now stays unavailable until explicit keyboard Retry, rather than consuming a one-shot error response. The check still requires a real failed request, a visible error, the Records fallback, a new recovery request and a recovered inbox; it does not assume a specific number of mount-time reads.

### D3 — Opportunities enter the canonical decision workflow

- Problem: Opportunities' “Create action” bypasses the canonical company decision by creating a legacy placement; unreviewed rows offer a disabled button instead of a useful next step.
- Reused: existing OpportunityList, Evidence review queue, scoped Resolution Center GETs, explicit evidence selection and existing Change Specification editor/POST route from #425. Existing historical placements remain intact.
- Dependency: fresh main `aae237b6ba42efe2ec7711ae3d8c472594cd8a04`; all 30 open PR heads/bases refreshed and unchanged. Controlled branch based on #426; no Company OS/funding/outcome/public website changes imported.
- Acceptance: reviewed rows link to “Review decision” with an exact cited-page navigation hint; unreviewed/demo rows link to Evidence. No placement or decision mutation occurs during navigation. Resolution Center matches the hint only against existing scoped evidence, never falls back to an unrelated problem, and offers an honest unavailable state plus evidence-review/browse links. Draft creation still requires explicit evidence selection and the existing server authorization/provenance gates.
- Files: `components/opportunity-list.tsx`, `components/resolution-center.tsx`, `app/app/resolutions/page.tsx`, `tests/opportunity-decision-entry.test.mjs`, its shared rendering fixture, existing decision fixture helper, customer journey contract, browser decision-layout script and this ledger.
- Schema/API/security: no schema, endpoint, RLS, secret or provider changes. The query is a selection hint, not an authorization mechanism or outbound fetch. Only organization/project-scoped GET results can match. No new persistent object or analytics truth store. Demo remains read-only.
- Evidence integrity: no approval, review, causal inference, commercial impact or action is manufactured. Unknown/unavailable evidence stays unavailable. Existing legacy assets are not reparented.
- Tests: four executable actual-component rendering cases cover reviewed link, unreviewed/demo evidence link, matching scoped context after an unrelated first row, and foreign/unknown context withholding. Existing customer journey assertion now verifies review-first navigation instead of legacy placement creation.
- Browser plan: existing isolated actual-React/CSS fixture expanded to 1440/1024/768/375/320, reduced motion, native keyboard link navigation and retained cited-page context, empty-state safety, overflow and axe. Synthetic GET-state/navigation fixture is not authenticated customer proof. Exact validation, commit SHA and draft PR receipts are maintained in the PR body.
- Known limits: exact URL matching deliberately fails closed; an unavailable or out-of-window reviewed problem requires review/browse rather than guessed context. Existing Sources bulk placement creation remains a separate legacy specialist workflow. Authenticated review → saved decision → comparable follow-up remains unverified without dedicated approved credentials. No merge/deployment performed.
- Next dependency: verify this chain in an isolated authenticated acceptance workspace; reconcile specialist bulk-placement entry separately without rewriting historical truth.
- Resumed D2 verification: final #426 artifact 11391211602 downloaded after workspace restoration; exact-candidate desktop/mobile source-review screenshots were manually inspected, confirming readable dark-theme selected values and explicit read-only caption. This resolves the interrupted screenshot-inspection checkpoint, not authenticated customer acceptance.
- D3 visual follow-up: initial artifact 11400982211 passed all browser gates but its synthetic native-navigation response omitted UTF-8, corrupting arrow/checkmark glyphs in that fixture (not proven in the application). The response now declares UTF-8 in header/meta and asserts document encoding plus an intact evidence-link arrow. Final verification must use the updated head, not the preceding green receipts.
