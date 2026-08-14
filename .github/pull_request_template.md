## What changed

Describe the smallest coherent customer, reliability, security, or operational change.

## Evidence and truth boundary

- [ ] No fabricated citations, customers, metrics, outcomes, rankings, or causal claims.
- [ ] Provider output, cited-page content, Foremention inference, human review, and later observations remain distinct.
- [ ] Demo data remains fictional and isolated.

## Security and tenancy

- [ ] Authentication/authorization impact reviewed.
- [ ] Organization/RLS boundary reviewed where tenant data is touched.
- [ ] Secrets stay server-side and are not logged, committed, or sent to analytics.
- [ ] New outbound URL handling preserves SSRF/private-network protections where applicable.
- [ ] New mutations preserve origin/CSRF, validation, idempotency, quota, and cost controls where applicable.

## Product quality

- [ ] Customer-facing states remain understandable without internal infrastructure knowledge.
- [ ] Mobile/overflow/keyboard/focus behavior reviewed where UI changed.
- [ ] Failure and empty states remain truthful.
- [ ] No unrelated infrastructure or duplicate control plane was introduced.

## Verification

- [ ] Automated tests added/updated for changed critical behavior.
- [ ] `pnpm audit --prod --audit-level=moderate`
- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] Cloudflare Worker dry-run
- [ ] New security/quality workflows reviewed

## Production impact

State migrations, new environment-variable **names only**, provider-cost implications, rollout/rollback notes, and the exact live acceptance required after merge. Never paste secret values.
