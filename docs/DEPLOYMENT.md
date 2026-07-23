# Deployment runbook

This runbook takes Foremention from the fictional seeded demo to a private product pilot.

## 1. Preflight

- `pnpm test`, `pnpm lint`, and `pnpm build` pass
- `.env.local`, service-role keys, provider keys, signing secrets, and payment secrets are not committed
- Public pricing and the honesty clause match the product
- Demo mode completes without Supabase, provider, Inngest, or payment calls
- Only evaluated provider adapters are enabled for live runs

## 2. Configure Supabase

1. Use the production project in an appropriate region.
2. Apply every file in `supabase/migrations/` in timestamp order.
3. Do not load `supabase/seed.sql` into live customer data unless the fictional demo organization is explicitly required.
4. Set the production Site URL and approved redirect URLs in Supabase Auth.
5. Create the first account and organization owner.
6. Test RLS from anonymous, member, and cross-organization sessions.
7. Add refresh-token rotation and session revocation before relying on long-lived accounts.

The publishable key may be used by the browser with RLS. The service-role key must remain server-only.

## 3. Configure jobs and providers

1. Configure the production `/api/inngest` endpoint.
2. Store `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in the host secret store.
3. Add one provider and explicit model ID at a time.
4. Run representative prompts internally.
5. Verify model label, timestamps, raw evidence, answer text, cited URLs, refusal handling, cost limits, rate limits, and partial-failure behavior.
6. Keep the deterministic mock adapter out of live customer runs.

## 4. Configure payments

1. Approve the legal entity, plan prices, taxes, cancellation, refunds, and invoice details.
2. Create products and recurring prices in the chosen payment provider.
3. Store payment secrets only in the host secret store.
4. Verify webhook signatures.
5. Grant or change paid entitlements only after a verified webhook updates the organization subscription.
6. Confirm that a checkout return, failed payment, replayed event, or demo action cannot unlock paid capacity.

## 5. Host the app

### OpenAI Sites / Cloudflare Vinext

- Reuse the project ID in `.openai/hosting.json`
- Keep D1 bound as `DB`
- Use `pnpm build`
- Add environment values through Sites, never inside `.openai/hosting.json`
- Save and deploy only a pushed, known-good source commit

### Conventional Next.js host

- Use `pnpm build:next` and `pnpm start:next`
- Add every required environment value through the host
- Confirm the runtime can reach Supabase, Inngest, configured providers, and the payment provider

## 6. Production smoke test

1. Open the homepage and every public navigation route on desktop and mobile.
2. Submit a Source Gap request and confirm one D1 row.
3. Create and verify a real account.
4. Confirm a non-member cannot read another organization.
5. Queue one approved prompt through one configured provider.
6. Confirm an Inngest execution and persisted answer with raw evidence.
7. Confirm a provider failure remains visible and incomplete.
8. Complete a test checkout and confirm only the verified webhook changes entitlements.
9. Sign out and confirm `/app` redirects to `/login`.
10. Test password recovery, export, deletion, backup, and restore.

## 7. Rollback

- Application: redeploy the previous known-good version
- Provider: disable the failing adapter for new runs while preserving prior records
- Database: use forward-only corrective migrations; never edit an applied migration
- Compromised secret: revoke, rotate, update the host, and redeploy
- Bad collection: mark affected evidence excluded; do not silently erase the audit trail

