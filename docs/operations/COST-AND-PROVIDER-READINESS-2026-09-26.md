# Company operational cost and provider readiness — 26 September 2026

Scope: build infrastructure and measurement first. No customer acquisition, fake expense allocation or forced provider calls.

## Evidence audited

- The production September month-to-date, as observed near 06:28 UTC on 26 September, contained 72 AI cost events. Five were `provider_reported`; 67 were `estimated` or otherwise not provider-reported. Total recorded accounting charge was approximately $3.152476. This is **not** an invoiced all-in cash expense.
- The existing `infrastructure_cost_allocations` table had **zero** rows. Do not fill it with hypothetical zero-dollar values or allocate an unverified monthly bill.
- Eleven product organizations existed but **none** were classified as KPI-eligible external customers/design partners. There were no external reviewed decisions. An actual customer unit cost cannot yet be determined.
- The monthly diagnostic query also found 17 old terminal attempts with non-null estimated costs but no separate AI ledger event; this is a historical reconciliation task, not proof of an outstanding charge.
- The observed September 20 failures were three Gemini 404s against an older `gemini-2.5-flash-lite` production setting, three Gemini 429 quota errors, three Cloudflare/Jina HTTP 401 retrieval errors, and three Cloudflare structured-source 502s. Both Jina and unstructured Cloudflare paths were subsequently replaced in source. Four recorded Cloudflare successes followed on September 20–21. **Do not** extrapolate this mixed pre/post-remediation sample to the current release's reliability.

## Implemented by this migration

`public.company_operational_cost_readiness` is an operator-only, invoker-security view with a transparent **month-to-date** reporting window.

The diagnostic separately exposes:
- the total recorded AI accounting values and number of events classified as provider-reported versus estimated/unknown, across all traffic (which may include internal work);
- the AI-cost ledger for explicitly KPI-eligible external organizations, separately from internal activity;
- the count and value of dated infrastructure allocations, without assuming that one allocation establishes coverage of every expense;
- the number of actual external human decision events, excluding unclassified and synthetic organizations;
- the number of terminal provider attempts with non-null recorded attempt cost but no cost ledger row;
- the number of unclassified product organizations.

`recorded_external_ai_cost_per_reviewed_decision_usd` is a **limited monthly operational ratio**, returned only when the denominator is nonzero. It is never labeled gross margin, total cost, or a causal outcome.

`verified_total_cost_per_reviewed_decision_usd` deliberately remains NULL until there is a separate, reconciled invoiced total cost source with an approved allocation policy. Introducing an apparently precise all-in figure based on estimates would be misleading.

### Read access

Only `service_role` is granted SELECT. No public, anonymous, or authenticated customer access. The view uses `security_invoker = true`.

### Verification in production

After the PR's exact-head CI and database review pass, apply the migration once and use a service-role query:

```sql
select * from public.company_operational_cost_readiness;
```

Acceptance: values reconcile with separate SQL counts on `ai_cost_events`, `infrastructure_cost_allocations`, `outcome_ledger_events`, and `company_organization_classifications`. Actual total cost remains NULL. Recheck Supabase security/performance advisors after migration.

### Remaining operational work (external inputs required)

1. Verify actual monthly invoice and free-tier billable usage for Cloudflare Workers/Workers AI, Supabase, Inngest, monitoring, outbound network/search and any paid AI gateways; keep supplier invoices private.
2. Establish period, vendor, category, invoice-hash, shared-cost allocation rules and approval for `infrastructure_cost_allocations`; never invent expense rows or recategorize internal tests as paying customers.
3. Reconcile 17 historical attempt-ledger gaps against original attempt timestamps and idempotency receipt evidence. Do not double-book retries or resurrect spend based on unmatched rows alone.
4. Add source-backed, reconciled provider-invoice expense and labor/service-delivery cost to the accounting model before allowing verified all-in per-decision cost or gross margin.
5. Re-run a **new-build**, budget-limited Cloudflare provider canary on the current deployed SHA. Keep optional Gemini disabled for paid/customer promises until the separately verified deployed model setting and quota are demonstrated with observed source-citation output.

### Founder workspace visibility and least-privilege follow-up

The founder-only `/app/agents` page now reads this existing company aggregate **server-side**, only after `isCompanyOperatorEmail` approves an authenticated Supabase viewer. A normal customer session cannot load or render its cross-organization diagnostics. No client analytics or additional AI provider calls are introduced.

The panel intentionally displays recorded AI accounting **including internal/QA traffic**, shows unclassified workspaces and ledger gaps, and withholds verified all-in cost. When the service aggregate is unavailable, the panel shows **unavailable**, not zero.

The follow-up `20260926081000_company_cost_view_read_grants.sql` additionally revokes Supabase's default `service_role` ALL privileges on the new view, then explicitly grants SELECT only. This is a least-privilege improvement, not a grant to customers.
