# FM-11: parallel engineering workstream protocol

**Authority:** CLAUDE.md, FOREMENTION_STATE.md, FM-00 integration coordination. Stage 0 customer-proof priorities remain in force. This protocol does not enable automatic coding or grant merge, deployment, spend or external-contact permission.

## One task, one write-set, one branch

1. Refresh the **current main SHA**, all open PRs (including drafts), all changed-file lists and pertinent repository instructions. Historical chat statements are not live evidence.
2. Propose an **exact filename write-set** to FM-00 before editing. FM-00 assigns competing files to one integration owner.
3. Use one independent checkout/worktree and branch per task. Suggested branch prefixes are **fm-01/** through **fm-11/**, without displacing already authorized conventions. Never let different PRs share an editable branch.
4. If another open PR already edits a proposed file, stop; have FM-00 sequence, reassign or require a fresh rebase. A green status check does not prove compatibility.
5. Produce a review-only PR with actual test results and exact head SHA. Never self-merge, force-push a colleague's branch, deploy, use secrets, spend AI credits or contact customers without permission.

## Cross-cutting files owned by FM-00

Do not edit these from an independent FM-01 through FM-11 worker PR: CLAUDE.md, FOREMENTION_STATE.md, .github/**, .claude/**, .mcp.json, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, supabase/migrations/**, docs/AUTOPILOT.md, docs/billion-dollar-build/EXECUTION-STATUS.md, scripts/validate-autopilot-diff.mjs or scripts/verify-workstream-handoff.mjs. Instead supply a proposed patch for a separately sequenced FM-00 integration PR. This is a concurrency policy, not a restriction on normal authorized maintenance.

## Required handoff fields

Each worker must report a JSON packet containing **workstream**, **baseSha**, **branch**, **prNumber** (null until created), **writeSet** (exact paths), **tests** (command plus actual status pass/fail/blocked/not-run), **dependencies**, **blockers**, and **nextTask**. In the PR body include the exact head SHA, relevant PR and CI links, rollback, tenant/security implications, migrations and environment-variable names only (never values). Never report an unrun test as passing.

Run:

~~~bash
node scripts/verify-workstream-handoff.mjs packet.json open-prs.json "$(git rev-parse origin/main)"
~~~

The supplied open PR snapshot has this structure:

~~~json
{
  "complete": true,
  "mainSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "capturedAt": "2026-10-09T10:00:00Z",
  "prs": [{ "number": 449, "files": [".github/workflows/agent-harness.yml"] }]
}
~~~

**This is illustrative, not a live PR snapshot.** Build the actual snapshot from all pages of GitHub's GET /repos/injamhaqq/foremention/pulls?state=open&per_page=100&page=N and GET /repos/injamhaqq/foremention/pulls/{number}/files?per_page=100&page=N for **every** open PR. Only assert complete=true after verifying full pagination. The checker validates the supplied snapshot's shape, base SHA, freshness (15-minute maximum) and exact-file collisions, but it cannot verify whether the supplied inventory is truthful or complete. It cannot detect semantic overlaps between different files. Refresh immediately before any integration decision.

## RED -> GREEN -> VERIFY and release authority

FM-00 alone sequences shared changes, verifies post-rebase exact SHAs and decides final integration. Every PR requires applicable tests, lint, typecheck, build, security, RLS/tenant-isolation checks, browser/accessibility tests, AI evaluations and migration verification. Do not weaken checks for convenience. The canonical CI check, additional workflow evidence, independent human review, artifact provenance and rollback are authoritative. Production acceptance must establish the actually deployed SHA. A passing FM-11 handoff validator is **not** a release authorization.
