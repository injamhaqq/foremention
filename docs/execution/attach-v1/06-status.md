# Chat06 — operations execution checkpoint

**Role:** jobs, communications and recovery. **Branch:** fm-attach-v1/06-operations. **Base (main at start):** 6b93c88cd22653fb17c9bec5ca91ca4e997d76b9 (2026-10-12). **Handoff:** draft PR, branch SHA authoritative from GitHub; FM-00 owns final integration.

## Source mapping and evidence boundary

Assigned index rows: CV-12 (Commercial_Backlog_18.csv row 12); A05, A13 and A17 (Foremention_Master_Backlog_29.csv rows 5/13/17 and Foremention_Master_Backlog_24.csv rows 5/13/17). Consulted A14 (owner Chat04) and A18 (owner Chat01) across both backlog registers. Packet manifest lists 18 included original Source_Files and missing Foremention_Master_Backlog_28_v2.csv, but **this conversation's seven mounted attachments contain no Source_Files directory or the original 18 reports**; historical row summaries in Backlog_Source_Index(6).csv were used. Complete original-content review remains unverified. Live GitHub code, Constitution, Stage 0 rules and issues #283, #332, #504 and merged PR #512 were inspected.

## Implemented in owned files only

- lib/jobs/notification-delivery-policy.mjs: verify HTTPS-or-localhost site origin, only same-origin /app internal destinations, reject URL-normalized escape; stable delivery-UUID provider idempotency key.
- lib/workspace-email-alerts.ts: validate URL before event reservation and outgoing email; use existing Resend adapter idempotencyKey; preserve pending status with explicit delivery_outcome_uncertain on ambiguous provider outcome; do not misclassify accepted-send/DB-ack loss as failed; duplicate event remains unsent.
- lib/application-email.ts: classify provider HTTP 5xx as uncertain, not definitively unsent.
- tests/06-notification-delivery-policy.test.mjs: URL abuse, sender contract, stable key, mocked Resend adapter success/network/5xx/4xx behaviors.
- docs/execution/attach-v1/06-proposals/operations-acceptance.md: gated A05/A13/A17 handoff, recovery/restore nonproduction checklist, bounded capacity assumptions and cross-owner interface tests.

## Actual testing/limitations

At local isolated policy-helper staging, first three pure policy tests passed under Node v22.16.0; the fourth static integration assertion could not execute because full repository files were not locally available (container cannot resolve github.com). **Do not interpret this as a full-suite pass.** Repository exact-head GitHub Actions must run the new regression, typecheck, lint, build, security gates and independent acceptance. No live notification was sent. All GitHub connector edits were limited to this branch. No production writes, migrations, backups, services, spending, main merge, CI bypass or webhook activation.

## Unverified external gates and next action

- Application delivery: no atomic email claim/replay migration; operator-controlled reconciliation required after ambiguous receipt. Resend 24-hour idempotency behavior/retention was not independently proved. Sender/scope behavior needs paired disposable DB tenant tests. Gate remains closed to automatic replay.
- Webhook: DNS TOCTOU at connection-time, real claim/settle RPC migration parity, synthetic delivery races before explicit enablement. Default/unsafe egress remains gated off.
- Restore: #332 history and missing customer-confirmation trigger require FM-00 owner review. No production-derived disposable backup restore was performed.
- #504: Worker CPU-resource cause found in dated Cloudflare analytics, but mitigation/paid-plan choice, fresh multi-viewport acceptance and long-term reliability are not verified by this branch.
- Schedules: coordinate pinned model/methodology, DST/fold, provider spend and second-cycle comparison with Chat01/04; no undocumented shared code changes.
- Original reports: 18 original Source_Files claimed by uploaded manifest are not mounted; index-only source coverage until independently provided from a supported location.

**Rollback:** revert only this branch's operations commits after owner review. Turning off application email transport disables sends; preserve existing pending/sent receipt ledger for reconciliation rather than deleting records. Do not roll back other workers' code.
