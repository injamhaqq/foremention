# Foremention Autonomous Execution State

This is a compact handoff ledger, not a substitute for live verification. Re-check GitHub, production health, code, migrations, customer evidence, and current commercial data before acting.

## Current authority — Stage 0 Customer Proof

- Verified operating reset: 2026-09-20.
- Repository: `injamhaqq/foremention`.
- Default branch: `main`.
- Verified main SHA before this hardening cycle: `8fce4b27e8bf6a17c3d0e8ecc7895706dfc44daa`.
- Production health at that SHA: `status=ok`, worker reachable, D1 reachable, Supabase reachable.
- Public category: **Recommendation Intelligence for B2B software**.
- Canonical measurement object: **Recommendation Record**.
- Canonical company-decision object: **Change Specification**.
- Governing company constraint: customer proof, not additional product breadth.

Do not declare Stage 0 complete until first-party evidence supports all three conditions:

1. 3–5 qualified external B2B SaaS design partners actively complete the agreed workflow.
2. At least 1 verified paid pilot or signed commercial commitment exists.
3. At least 2 organizations complete a second comparable reviewed cycle.

Unknown remains Unknown. Pipeline is not revenue. List price is not payment. A before/after observation is not causal proof.

## Stage 0 execution priority

P0 work is limited to:

- qualified target-account research;
- customer interviews and founder-led sales;
- design-partner conversion;
- activation and Recommendation Record review;
- customer-owned Change Specification assignment;
- comparable second cycles;
- paid-pilot and continuation evidence;
- real production/security/reliability defects;
- pilot blockers;
- measurement of the full funnel.

Broad marketplace, public benchmark, international expansion, large sales-team buildout, additional product lines, broad autonomous-agent breadth, and unsupported leadership/ROI/customer-logo claims remain frozen.

The detailed operating gate is `docs/STAGE-0-CUSTOMER-PROOF-90-DAY.md`. The founder motion is `docs/FOUNDER-CUSTOMER-PROOF-PLAYBOOK.md`. GitHub issue #283 is the live Stage-0 tracker.

## Production and public-funnel state

- Stage-0 funnel PR #282 merged to `main` as `8fce4b27e8bf6a17c3d0e8ecc7895706dfc44daa`.
- Primary design-partner CTA is deliberately pulled earlier into the hero.
- Public funnel analytics now covers CTA impression -> CTA click -> application page -> application start -> application submit.
- Commercial stages after submission remain first-party commercial truth; do not infer them from web analytics.
- `/llms.txt`, `/llms-full.txt`, `/sitemap.md`, `/index.md`, and `/AGENTS.md` are public agent-readable resources.
- Production `llms.txt` independently scored 100/100 in the 2026-09-20 Agent Ready scan.
- Remaining agent-readability hardening is allowed only when it does not distract from Stage 0 or weaken security.

## Agent OS state

Production health at the verified Stage-0 SHA reported:

- `enabled=true`;
- `reasoningEnabled=false`;
- operator configured;
- OpenAI credential configured;
- application email configured.

Do not represent disabled reasoning as active. Re-enable only after the provider/quota/error condition that caused fail-closed behavior is independently cleared and a production-risk justification exists.

## GitHub Autopilot state

The keyless GitHub Copilot controller architecture remains privilege-separated:

- AI job: repository read + `copilot-requests: write`;
- publisher job: repository write, no model execution;
- exact-base refusal;
- protected-path validation;
- no auto-merge;
- no stored OpenAI/model API key in the canonical Autopilot path.

Historical live proof:

- bootstrap PR #192 merged;
- AI-credit-floor repair PR #194 merged;
- Autopilot Controller run #2 (`33482925005`) completed a bounded keyless cycle safely;
- a later verified failure was caused by the GitHub Copilot account reporting **monthly quota exceeded**, not by a repository-permission or workflow-security defect.

**Stage 0 override:** automatic Autopilot push/schedule cadence is paused. The controller is manual-dispatch only so quota noise and autonomous engineering do not outrank customer proof. Use it only for a specific production, security, reliability, or pilot-blocker task after checking quota availability.

## Open work selection rule

Before changing code:

1. Check issue #283 and current customer/prod evidence.
2. Inspect current open PRs and avoid duplicate/stale implementation.
3. Choose one bounded task tied to customer evidence, production risk, security, reliability, or a real pilot blocker.
4. Preserve tenant isolation, RLS, evidence boundaries, exact comparability, and human approval.
5. Run the relevant tests and exact-SHA production verification.
6. Do not manufacture traction, customer evidence, revenue, ROI, category leadership, benchmark results, or causality.

## Founder-decision boundary

Require explicit founder approval before:

- sending customer/prospect communications through a new or unverified transport;
- material public pricing changes;
- destructive production/database operations;
- secret changes;
- weakening authentication, authorization, RLS, or security controls;
- legal commitments;
- material paid spend;
- publishing customer identity, logos, testimonials, case studies, or outcome claims.

Research, qualification, evidence preservation, draft preparation, regression fixes, and non-destructive production verification may proceed when they remain within the established Stage-0 scope.

## Execution ledger

### 2026-09-20 — Stage-0 operating reset

- Customer proof became the governing 90-day constraint.
- PR #282 moved the homepage CTA earlier, reduced design-partner form friction, added funnel analytics, added agent-readable public resources, and codified the Stage-0 operating gate.
- Production health subsequently reported exact build SHA `8fce4b27e8bf6a17c3d0e8ecc7895706dfc44daa` with Worker, D1, and Supabase reachable.
- No design partner, paid pilot, second cycle, renewal, PMF, or pricing validation was invented.

### 2026-09-01 — Autopilot live proof

- Autopilot bootstrap PR #192 merged as `0e0dcb823e16ed2b2483fcb3a8233d4db748b5bc`.
- AI-credit-floor repair PR #194 merged as `9b93b5515f6d71e5ac0811a10b92eec1b8de6dd2`.
- Controller run #2 (`33482925005`) completed preflight, keyless Copilot execution, packaging/upload, and publisher validation.
- It deliberately produced no patch when no justified change existed.

## How to update this file

Append only durable, verified handoff facts that materially change what the next operator should do. Prefer exact SHAs, issue/PR numbers, workflow run IDs, and production evidence. Never store secrets, raw customer data, invented metrics, or temporary speculation.
