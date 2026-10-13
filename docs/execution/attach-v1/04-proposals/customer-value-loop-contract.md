# Chat04 → FM-00 / Chat01 / Chat02 / Chat06 / Chat08 / Chat09: decision and cycle-eligibility contract

**Packet:** 04. **IDs:** CV-05 (Commercial_Backlog_18.csv:5), A14/A15 (Master_Backlog_29.csv:14/15 and Master_Backlog_24.csv:14/15), A26/A27/A28 (Master_Backlog_29.csv:26/27/28). **Status:** proposal plus delivered pure code on `fm-attach-v1/04-workflow`. Nothing here changes shared SQL, CI, jobs, auth helpers or production.

## 1. What Chat04 now provides (code, tested locally)

`lib/customer-value-loop.ts` — dependency-free, importable from server code, workers and tests.

| Export | Contract |
| --- | --- |
| `computeCustomerValueLoop(snapshot)` | Returns `{ stage, nextAction, blockers, baselineRunId, decisionId, laterCycle, causation: "not_proven", closesCustomerProof }`. Stages: `setup_required → questions_required → setup_only → collecting / collection_interrupted → review_required → decision_required → action_required → awaiting_later_cycle → later_cycle_not_comparable / comparable_later_cycle`. Only rows matching the snapshot's organization **and** project are considered. |
| `assessLaterCycle(baseline, later)` | `comparable` only when both runs are human-reviewed terminal (`complete`/`partial`), same org+project, chronological, same methodology version, same **approved question-set version**, identical verified question/provider/model/**sampling**/**method** slots and complete nine-field measurement context (reuses `assessExactQuestionComparability`). Otherwise `not_comparable` with **every** reason. Rejected/unreviewed answers are listed as `exclusions`. |
| `decisionActionGaps(decision)` | Change Specification needs approval; `DO_NOW`/`TEST_FIRST` additionally need owner (id or role), action and due date. Explicit `no_action` and `reviewer_disagreement` are complete with rationale + author and **never get a fabricated owner**. |
| `reconcileDecisionSave(pending, persisted)` | Lost-ACK recovery by idempotency `saveKey`: `saved` / `not_saved_retry_same_key` / `conflict` (duplicate key or different baseline Record). |
| `closesCustomerProof` | `true` only for a comparable later run whose `origin === "customer_cycle"`. A fixture/clock run can never close CV-05 or Stage-0 condition 3. |

`lib/workspace-setup-state.ts` — A26 setup-required state (`demo | ready | setup_required`), explicit API code `workspace_setup_required`, verified account-help channel `hello@foremention.com` (already published on /privacy, /terms, /trust).

## 2. Fields the contract needs that are NOT yet persisted (FM-00 migration decisions)

Proposed incremental migrations (never edit historical migrations):

1. **`change_specifications` / decision table:** `save_key text` with a unique index on `(organization_id, project_id, save_key)`; `decision_kind` enum (`change_specification | no_action | reviewer_disagreement`); `decided_by`, `decided_at`, `approved_by`, `approved_at`, `due_date`. The existing UI write path should send a client-generated `save_key` and, on network failure, re-read by key before re-posting (`reconcileDecisionSave`). Owner of the write route: Chat04; migration: FM-00.
2. **`runs.question_set_version int`** recorded at dispatch (from the approved prompt versions), and **`runs.origin`** (`customer_cycle | fixture`) — or an equivalent derived flag — so reports cannot present a fixture as a real later cycle.
3. **`run_answers.sampling` and `run_answers.observation_method`** (or inside `measurement_context_json`). Chat01 already records `observationMethod` in raw provider output (per 01-status); it needs to be a persisted, comparable field. Until it exists, `assessLaterCycle` returns *“Sampling or observation-method provenance is unavailable”* — not comparable, by design.
4. **`update_prompt_versioned`**: add `p_project_id` and a project predicate (raised by Chat02's 02-status). The route `app/api/prompts/route.ts` already does an org+project-scoped read before the RPC and a Chat04 test pins that ordering, but the database function itself should enforce it.
5. **Zero-question setup-only** (`complete_onboarding`): unchanged from `shared-contracts.md` §1 — still blocked on FM-00.

## 3. Wiring proposals (next Chat04 steps once §2 lands)

- Overview “next best step” and `/app/runs/[id]` decision panel read `computeCustomerValueLoop` from a server loader (`loadCustomerValueLoopSnapshot(viewer)` scoped by `loadWorkspaceContext`). Not wired in this branch because the snapshot needs the §2 fields; wiring it now would have to invent them.
- `/app/runs/compare` should render `assessLaterCycle` reasons/exclusions for the selected pair alongside the existing `assessWorkspaceRunPairComparability` result; a comparison-specific CSV must bind to both authorized IDs (unchanged from `shared-contracts.md` §5).

## 4. Contracts requested from other owners

| Owner | Needed |
| --- | --- |
| Chat01 | Persist `sampling` + `observation_method` per answer; usage/receipt fields; keep unavailable = `null`. |
| Chat02 | Two-tenant RLS denial receipts for decisions/records/exports; decide whether an authenticated **pre-workspace** account-support route is wanted (A26 currently uses the verified email channel instead). Review `workspace_setup_required` as a shared code for the other ~35 API routes that still answer `"Workspace not found."` with 404. |
| Chat05 | Visual/copy review of the new support setup-required panel (reuses existing `panel`, `inline-notice`, `button--ink` classes; no new styles). Chat01 flagged A29 “visible manual setup mode” UI as Chat04/05 — not in packet 04’s index rows; FM-00 to allocate. |
| Chat06 | Run admission idempotency key (the fixture journeys model it as `key`), retry/cancel terminal states mapped to `failed | cancelled | interrupted`, schedule of a later cycle pinned to the baseline's question-set version/model/sampling (A14). Manual founder-scheduled second collection is the documented early bridge. |
| Chat08 | Consume decision events (`decision_kind`, `decided_at`) and `closesCustomerProof` — never count fixture cycles toward Stage-0 condition 3. |
| Chat09 | Re-run QA09-31 against this head (Record eligibility is now keyed to the Record ID); execute the two journeys + recoverable failure on a disposable non-production Supabase project. |

## 5. Rollback

Pure additions (`lib/customer-value-loop.ts`, `lib/workspace-setup-state.ts`, tests) can be reverted independently. The support route change only adds a `code` field and new wording to an existing 404; reverting restores the old message.
