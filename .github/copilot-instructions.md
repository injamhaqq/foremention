# Foremention Copilot Instructions

Foremention is a B2B software Recommendation Intelligence product. Treat the root `CLAUDE.md` as the repository constitution and read it before material work. Also consult `docs/billion-dollar-build/EXECUTION-STATUS.md`, `docs/billion-dollar-build/09-company-operating-system.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, and `docs/SECURITY.md` when relevant.

## Operating method

- Recover reality before editing: inspect current `main`, exact SHA, open PRs/issues, relevant implementation, migrations, tests, and release state. Do not trust stale chat summaries.
- Work in one bounded unit of work per task. Prefer the highest-value unresolved problem that is already evidenced by code, CI, production observations, or the canonical backlog.
- Use RED -> GREEN -> VERIFY. Add or update focused regression coverage before or with the implementation. Run the smallest useful checks first, then the repository release gates that the change requires.
- Standard commands are `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build`. Node.js >= 22.13.0 and pnpm 10.25.0 are required.
- Preserve the Foremention 5 signed-in architecture: Attention, Questions, Records, Comparisons, Settings. Source X-Ray is not a standalone product surface.
- Preserve the approved canonical brand assets and the security/data boundaries in `CLAUDE.md`. Never weaken authentication, authorization, Supabase RLS, tenant isolation, webhook/provider verification, evidence integrity, or release checks merely to make CI pass.
- Never fabricate customers, revenue, pricing validation, PMF, benchmarks, testimonials, investor interest, certifications, production state, or test results. Distinguish verified facts, observed state, customer evidence, hypotheses, TODOs, blockers, external dependencies, and unknowns.
- Reuse existing architecture and schemas. Do not create parallel CRM, analytics, evidence, lifecycle, billing, or company-state systems when an existing canonical system can be extended.
- Before merge, verify the exact commit being proposed. A merge is not a production verification.

## Autonomous-task boundary

When invoked as an autonomous worker, complete one bounded execution cycle: recover reality -> choose one justified task -> implement -> test -> review -> open/update a PR -> record evidence and the next recommended task.

Do not auto-merge. Do not perform destructive production/database operations, change secrets, weaken security controls, publish unverified claims, change pricing/ICP/category/business model, send customer communications, or make legal/financial commitments without explicit founder approval.

If the next action requires a founder decision, record a concise decision request instead of inventing an answer. If there is no justified product change, perform an evidence-based audit or maintenance task rather than manufacturing features.
