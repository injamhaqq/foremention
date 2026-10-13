# A16 — ruleset 20223161 ("main protection"): what is needed (admin change, not code)

Re-read 2026-10-13 ~19:00 IST via `GET /repos/injamhaqq/foremention/rulesets/20223161` (read-only). Nothing was changed.

## Current state (as read)
- Enforcement `active`, target `~DEFAULT_BRANCH`; rules: deletion, non_fast_forward, creation, pull_request, required_status_checks.
- `pull_request`: `required_approving_review_count: 0`, no code-owner review, merge/squash/rebase allowed.
- `required_status_checks`: `Analyze JavaScript and TypeScript`, `CI`, `actions-security`, `browser-acceptance`, `dependency-review`, `osv`, `secrets`, `trivy`; **`strict_required_status_checks_policy: false`**.
- **`bypass_actors: [{ actor_type: RepositoryRole, actor_id: 5 (admin), bypass_mode: always }]`** — `current_user_can_bypass: always`, so any admin (including automation acting with an admin token) can merge red or unreviewed.
- The alert-gating check named **`CodeQL`** (the one that fails when a new high/critical alert appears) is **not** required; only the analysis job `Analyze JavaScript and TypeScript` is. A PR that introduces a high-severity alert is therefore mergeable.

## Why it is not a worker-branch code fix
All three gaps live in repository settings. No file in the repo controls them, so there is no contained code change to make on 01–09. Changing them is a founder/admin decision (readiness decision 5) and must not be done by an agent.

## Proposed change (founder/admin applies in Settings → Rules → Rulesets → "main protection", or via `PUT /repos/injamhaqq/foremention/rulesets/20223161`)
1. `bypass_actors`: remove the RepositoryRole entry, or change `bypass_mode` to `pull_request` (bypass only through a PR, still logged). Recommended: remove.
2. `required_status_checks.parameters.strict_required_status_checks_policy`: `true` (branch must be up to date with main before merge — matters because #562 composes nine branches).
3. Add `{ "context": "CodeQL" }` to `required_status_checks` (alert gating). Optionally add `quality`, `semgrep-policy`, `billing-provider-contract`, `Isolated Authenticated Journey`, which already run on every PR.
4. Optional: `required_approving_review_count: 1` once a second reviewer exists (solo founder today → leave 0, rely on 1–3).

## Acceptance receipt that closes A16 (Chat09)
- Re-read the ruleset and record the new JSON.
- Merge-denial receipt: on a throwaway draft PR with a failing required check, the GitHub mergeability API (`GET /repos/.../pulls/<n>` → `mergeable_state: blocked`) shows it blocked for an admin. Do not attempt a real merge.
