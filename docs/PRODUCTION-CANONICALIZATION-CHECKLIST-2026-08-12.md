# Foremention Production Canonicalization Checklist — 2026-08-12

This checklist is the release boundary after PRs #15, #16, #17, and #18. It prevents further product work from being mistaken for a completed release while production may still be serving a stale or mixed build.

## Target release

- Repository: `injamhaqq/foremention`
- Canonical branch: `main`
- Required commit: `787111087bc1219d444dd4cd1f0508094435b96d`
- Existing production domain: `https://foremention.com`
- Existing Worker/site infrastructure must be preserved.

## Release acceptance

Production is accepted only when all applicable checks below are recorded from the live system.

### Provenance

- [ ] `/api/health` returns the exact canonical commit `787111087bc1219d444dd4cd1f0508094435b96d`.
- [ ] Health response is fresh and `Cache-Control: no-store` remains effective.
- [ ] Current Cloudflare Worker/site version is recorded if the deployment platform exposes it.
- [ ] No stale/mixed static-vs-dynamic release behavior is observed.

### Public/auth

- [ ] Homepage loads.
- [ ] Signup loads and creates only real customer state.
- [ ] Email/password login works.
- [ ] Logout works.
- [ ] Password reset works.
- [ ] Google OAuth remains hidden unless external Google + Supabase configuration is verified.
- [ ] If Google OAuth is enabled, callback, cancellation, existing-account behavior, session persistence, and safe relative redirects are tested.

### Authenticated customer journey

- [ ] Workspace opens.
- [ ] Workspace switching is tenant-safe.
- [ ] Overview is understandable without internal architecture knowledge.
- [ ] Questions can be reviewed/created.
- [ ] A real collection can start and completes or communicates async state clearly.
- [ ] AI Results show persisted answers and exact provider/model provenance.
- [ ] Sources distinguishes no collection / collecting / zero returned citations / needs review / reviewed evidence.
- [ ] Source X-Ray opens from real cited evidence.
- [ ] Competitors shows real denominators.
- [ ] Pause tracking persists through reload and excludes the competitor from future eligible monitoring.
- [ ] Resume tracking persists through reload and restores future eligible monitoring.
- [ ] Opportunities cannot be created from unreviewed/fabricated evidence.
- [ ] Actions preserve evidence lineage.
- [ ] Analytics exposes timeframe/sample/denominator and does not imply causation.
- [ ] Alerts deep-link to real recorded state.
- [ ] Settings controls that are shown actually work.
- [ ] Exports remain authenticated and tenant-scoped.

### Search

- [ ] Global Foremention search is tenant-scoped.
- [ ] Questions are searchable.
- [ ] Reviewed AI Results are searchable.
- [ ] Sources are searchable.
- [ ] Competitors are searchable.
- [ ] Reviewed Opportunities are searchable.
- [ ] Actions are searchable.
- [ ] Partial search failure is disclosed rather than misrepresented as zero results.

### Reliability / security

- [ ] Anonymous `/app` access is rejected/redirected correctly.
- [ ] Cross-organization reads/writes remain blocked.
- [ ] Session survives a deployment where expected.
- [ ] Recoverable workspace errors stay inside the workspace shell and Retry does not duplicate collection/evidence.
- [ ] No secret values appear in browser output, logs, health, or exports.
- [ ] Existing provider/crawler failure sanitization remains intact.

### Mobile

Verify at minimum:

- [ ] 390×844
- [ ] 430×932
- [ ] 740px width
- [ ] 768×1024

Check:

- [ ] no horizontal overflow;
- [ ] consent UI does not dominate/obscure the app;
- [ ] competitor cards remain usable;
- [ ] error states do not take over the entire application unnecessarily;
- [ ] touch controls remain reachable;
- [ ] tables/search/navigation are usable.

## Failure policy

Any of the following blocks acceptance and should trigger rollback or a forward fix before claiming the release is live and verified:

- tenant isolation failure;
- auth failure;
- data/evidence corruption;
- lost collections;
- critical Source X-Ray failure;
- production cannot start;
- major error-rate regression;
- stale or mixed release provenance;
- critical security regression.

## Next milestone after acceptance

Only after the target release is live and verified should the next P2 slice start. Preferred order:

1. native Source Snapshot Engine / Change Graph improvements;
2. Postgres + pgvector semantic retrieval when keyword search shows a real gap;
3. native SearchRouter with Brave/Exa/SearXNG adapters kept separate from AI recommendation observations;
4. incremental Playwright/axe/Lighthouse/security gate expansion;
5. usage/entitlement and external-search economics only after requirements are concrete.
