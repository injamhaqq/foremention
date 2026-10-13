# Chat04 → FM-00 / interface owners: customer value loop contracts

**Packet:** 04. **Scope IDs:** CV-05; A14, A15, A26, A27, A28 (A14/A15 each occur in two historical source CSVs). **Head branch:** `fm-attach-v1/04-workflow`. **This document is a proposal; it does not modify shared SQL, other teams' files, or production.**

## Required shared contracts and bounded owners

### 1. Exact question approval and workspace-only setup (FM-00 schema + Chat02 authorization; A28)
- Current API `app/api/onboarding/route.ts` now accepts only **1–5 explicitly approved normalized questions**, returning a 400 instead of inventing missing questions. `lib/approved-buyer-questions.ts` is the client/server normalization and uniqueness boundary. The UI generates draft suggestions only upon explicit user interaction or existing website-draft creation; removed suggestions are not repopulated by server-side persistence.
- The current `public.complete_onboarding(jsonb)` function, defined by migration `20260728000100_live_collection_hardening.sql`, **rejects zero questions**. Do not claim zero-question setup works. FM-00 should introduce an incremental, ordered and replayable migration making optional zero-question setup possible **only** when an explicit `collectionIntent=setup_only` state is authoritative. No runtime should start a collection from an empty set. Do not edit a historical migration.
- Authorization: preserve one canonical atomic onboarding transaction, actor-bound org/project membership, project/locale/question versions and audit record. Persist the exact validated, ordered question text, and return `promptCount`/approved version identifiers. Duplicate normalization and max length must match API validation. Never silently substitute generated prompts in a database function.
- Suggested acceptance: 0 questions + `setup_only` creates workspace, zero prompts, **zero provider calls**; 0 without setup-only returns 400; 1,5 distinct questions persist exactly; duplicate, 6 and >1,000-char inputs fail without creation; retries are idempotent. Existing 1–5 contract can ship before the optional-zero migration.

### 2. Support before workspace (Chat02 + Chat05 / FM-00 for owner decisions; A26)
- Current `app/api/support/tickets/route.ts` uses workspace context, so a signed-in account with no organization cannot submit or read a workspace ticket. Client must **not** show a functional submit control if this known prerequisite is absent.
- Provide verified account-help contact independently of org creation. Prefer a security-reviewed authenticated account-support route with user identity, abuse controls, minimal non-tenant payload, no fabricated workspace grant, and human-reviewed replies. Otherwise expose a **verified** existing contact channel with a truthful setup-required state; `/contact` is a design-partner application, **not verified** as customer support.
- Status matrix: `signed-in/no-org` → working account help; `signed-in/org` → workspace ticket; `denied` → no submit; `load-failed` → error/retry not empty history. Preserve RLS, tenant scope, CSRF/origin validation, rate limits and audit logs.

### 3. Comparable later observation and jobs (Chat01 + Chat06 + FM-00; A14/CV-05)
- Source PR #480 is **merged**; source #500 on DST is **closed, not merged** as of inspection, so exact latest work must be reevaluated before adoption. Chat04 must not fork schedulers or patch Inngest/job-owned paths.
- Require the exact approved prompt text/version, upstream provider, exact model, method/methodology, measurement settings, buyer context, locale/market, sampling, chronology and project to match. Comparability API returns structured eligibility **plus field-wise exclusions**. Missing context is `not_comparable`, never a synthetic trend.
- Worker responsibilities: a single idempotent admission key, quota/provider-pin acceptance, cancellation race safety and DST recurrence; persisted recovery state and observability. Manual founder-operated second collection is an explicitly labelled interim bridge, not evidence of automatic scheduling.

### 4. Review → decision/action → second-cycle receipts (Chat04/F​​M-00/Chat09; A15/CV-05)
- Existing decision, Change Specification, run review and comparison surfaces are **not proof** of complete customer journeys. Reuse reviewed #452 ideas only after exact-head diff; PR #452 is closed and unmerged. Avoid duplicate decision systems.
- Acceptance receipts needed: (1) two independent disposable organization/project journeys, each from **exact approved setup** to **persisted provider observation** to **reviewed evidence** to **human saved decision or no-action + reviewer dissent** to **Change Specification/owner/date** to **eligible later observation** and **CSV/export**, checking reloaded state and safe URLs; (2) at least one interruption with durable retry and no duplicate decision/job; (3) explicit comparison exclusions for mismatched provider/model/context and different projects.
- Use isolated fake responses only in test environment; clocks advanced in tests do **not** constitute a genuinely elapsed second customer cycle. No production runs, customer edits, paid provider calls, live billing, or outreach without separate authorization.

### 5. Record-action eligibility (Chat04 delivered, Chat02 validation remains authoritative; A27)
- Client gates the Record actions on a UUID route and authorized persisted active-project run listing with allowed state `review|complete|partial`; failure shows a retryable no-actions state.
- Server `/api/records/[id]/share` already independently checks share-capable role, active project and permitted run state. `/api/export/record/[id]` checks authenticated scoped run access. Consider exposing an explicit `canShare` permission in a dedicated read-only resource if viewer/reader roles should not see a button they cannot execute; do not trust UI for permission.
- `/app/runs/compare` stays a selector/representation of the selected pair. Do **not** point Record share/export/print actions at the literal `compare` ID. A comparison-specific export must bind to both authorized comparable IDs via `assessWorkspaceRunPairComparability`, with review receipt and exact context; not implemented here.

## Evidence boundaries
The current conversation included seven index/instruction attachments, not the original `Source_Files` directory or ZIP. During execution, several original historical source files were independently recovered from the user's ChatGPT Library, including `Foremention_Master_Backlog_29.csv`, `Commercial_Backlog_18.csv`, `Foremention_Audit_2026-10-11_v2.md`, and the route/state coverage registers. The A26–A28 and CV-05 original source rows were inspected. The complete 18-source inventory has **not** been hash-verified in this execution. `Foremention_Master_Backlog_28_v2.csv` remains separately declared missing and was not found in the Library search. All historical claim IDs here are leads; current repo and a test receipt determine actual closure.

Do not merge this proposal as an activation instruction. FM-00 owns shared schema/release/CI and integration; Chat09 owns independent composed acceptance verdict.


### A27 implementation refinement: role-bound share visibility
Chat04 added a read-only `GET /api/records/[id]/share` capability, scoped to the active organization/project and invoking the existing `canShare(role)` predicate; it never grants rights. Only the Share control waits on the role response. Export/print remain visible for authorized readers of the Record, with their own server scoping. FM-00/Chat02/Chat09 should test actual viewer vs analyst vs owner behavior, unknown IDs, revoked membership, other-project IDs and stale run state. A signed-in viewer's absence of Share is a **UI behavior**, not a replacement for the server POST/DELETE denial and RLS. Historical results before the role-bound addition are not proof of the new exact head.
