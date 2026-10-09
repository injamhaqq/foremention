# FM-11: parallel engineering workstream protocol

**Authority:** CLAUDE.md, FOREMENTION_STATE.md, FM-00 integration coordination. Stage 0 customer-proof priorities remain in force. This protocol does not enable automatic coding or grant merge, deployment, spend or external-contact permission.

## One task, one write-set, one branch

1. Refresh the **current main SHA**, all open PRs (including drafts), all changed-file lists and pertinent repository instructions. Historical chat statements are not live evidence.
2. Propose an **exact filename write-set** to FM-00 before editing. FM-00 assigns competing files to one integration owner.
3. Use one independent checkout/worktree and branch per task. Suggested branch prefixes are **fm-01/** through **fm-11/**, without displacing already authorized conventions. Never let different PRs share an editable branch.
4. If another open PR already edits a proposed file, stop; have FM-00 sequence, reassign or require a fresh rebase. A green status check does not prove compatibility.
5. Produce a review-only PR with actual test results and exact head SHA. Never self-merge, force-push a colleague's branch, deploy, use secrets, spend AI credits or contact customers without permission.

## Cross-cutting files owned by FM-00

Do not edit these from an independent FM-01 through FM-11 worker PR: CLAUDE.md, FOREMENTION_STATE.md, .github/**, .claude/**, .mcp.json, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, supabase/migrations/**, docs/AUTOPILOT.md, docs/billion-dollar-build/EXECUTION-STATUS.md, scripts/validate-autopilot-diff.mjs, scripts/verify-workstream-handoff.mjs or scripts/capture-workstream-prs.mjs. Instead supply a proposed patch for a separately sequenced FM-00 integration PR. This is a concurrency policy, not a restriction on normal authorized maintenance.

## Required handoff fields

Each worker must report a JSON packet containing **workstream**, **baseSha**, **branch**, **prNumber** (null until created), **writeSet** (exact paths), **tests** (command plus actual status pass/fail/blocked/not-run), **dependencies**, **blockers**, and **nextTask**. In the PR body include the exact head SHA, relevant PR and CI links, rollback, tenant/security implications, migrations and environment-variable names only (never values). Never report an unrun test as passing.

Run the **read-only inventory collector** before validating a worker packet:

~~~bash
# Requires public GitHub API access; optional read-only GH_TOKEN if rate-limited.
node scripts/capture-workstream-prs.mjs > /tmp/fm11-open-prs.json
node scripts/verify-workstream-handoff.mjs packet.json /tmp/fm11-open-prs.json "$(git rev-parse origin/main)"
~~~

Never commit the temporary inventory or supply your private GitHub credentials in a packet. Both tools are local/manual utilities; the collector performs GET requests only, never creates a PR, triggers a workflow or deploys code. If the public API hits rate limits, re-run with a separately authorized read-only GitHub authentication context.

The supplied open PR snapshot has this structure:

~~~json
{
  "complete": true,
  "mainSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "capturedAt": "2026-10-09T10:00:00Z",
  "prs": [{
    "number": 449,
    "headBranch": "fm-11/example-task",
    "headSha": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "files": [".github/workflows/agent-harness.yml"]
  }]
}
~~~

**This example is illustrative, not a live PR snapshot.** The collector obtains **every page** of all open PRs and all changed filenames, reserves both old and new filenames for renames, and rechecks main and the open-PR identities before marking an inventory complete. It fails closed on GitHub API failures, pagination limits, main/PR drift and stale capture time. The validator checks supplied snapshot shape, base SHA, freshness (15-minute maximum), own-PR branch provenance and exact-file collisions. The collector is not a cryptographic GitHub snapshot: a PR can still change after capture, and semantic overlaps between different filenames require FM-00 review. Re-run immediately before integration; never bypass failed checks by manufacturing a snapshot.

## RED -> GREEN -> VERIFY and release authority

FM-00 alone sequences shared changes, verifies post-rebase exact SHAs and decides final integration. Every PR requires applicable tests, lint, typecheck, build, security, RLS/tenant-isolation checks, browser/accessibility tests, AI evaluations and migration verification. Do not weaken checks for convenience. The canonical CI check, additional workflow evidence, independent human review, artifact provenance and rollback are authoritative. Production acceptance must establish the actually deployed SHA. A passing FM-11 handoff validator is **not** a release authorization.
