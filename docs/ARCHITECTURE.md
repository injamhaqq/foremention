# Architecture

## Runtime

- Next.js App Router through Vinext for Cloudflare/Sites deployment
- React Server Components for page composition; Client Components for filters, onboarding, prompt approval, forms, and the interactive recommendation journey
- Cloudflare Worker entry for image optimization and durable D1 Source Gap intake before delegating to the application router

## Data boundaries

- D1 stores public Source Gap Check submissions and rate-limit counters for the deployed public site
- Supabase Postgres is the multi-tenant product store for organizations, prompts, runs, answers, sources, citations, opportunities, actions, and evidence
- RLS policies in `supabase/migrations/` enforce organization ownership
- Deterministic fixtures in `lib/demo-data.ts` provide a credential-free demo and are always labeled fictional
- Provider and service-role credentials stay on the server

## Product chain

`buyer question -> AI engine -> recommended brand -> cited URL -> source influence -> competitor presence -> opportunity -> action -> citation change -> referral -> revenue`

Every conclusion must remain traceable to a dated observation and exact URL. Observed evidence, product assessments, and customer-supplied outcomes stay separate.

## Execution boundary

The browser never calls an AI provider directly. `/api/runs` validates the signed-in organization, requested prompts, provider configuration, and applicable limits, then emits one background event. Inngest owns retries and collection. Provider-specific adapters normalize answers while retaining the raw evidence and visible partial failures.

Demo runs are isolated from live providers and customer records.

