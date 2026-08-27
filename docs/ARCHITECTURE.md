# Architecture

## Runtime

- Next.js App Router through Vinext for Cloudflare/Sites deployment
- React Server Components for page composition; Client Components only where interaction requires them
- Cloudflare Worker entry for image optimization and durable D1 Source Gap intake before delegating to the application router

## Data boundaries

- D1 stores public Source Gap Check submissions and rate-limit counters for the deployed public site
- Supabase Postgres is the multi-tenant product store for organizations, buyer questions, runs, answers, sources, evidence, reviews, actions, and later observations
- RLS policies in `supabase/migrations/` enforce organization ownership
- Deterministic fixtures in `lib/demo-data.ts` provide a credential-free demo and are always labeled fictional
- Provider and service-role credentials stay on the server

## Product architecture

The primary signed-in product is intentionally constrained to five objects:

`Attention -> Questions -> Records -> Comparisons -> Settings`

Recommendation Record is the canonical object. Evidence inspection is part of the record rather than a separate product surface.

## Product truth chain

`buyer question -> provider/model -> answer -> named/recommended brand -> returned reference when available -> distinct source -> retrievability -> evidence -> human review -> competitor context -> decision -> action -> comparable later measurement`

Every conclusion must remain traceable to a dated observation and its provenance. Observed evidence, inference, automated processing, human review, customer decisions, later outcomes, and causal claims stay separate. A returned reference does not prove that the source caused the recommendation.

## Execution boundary

The browser never calls an AI provider directly. `/api/runs` validates the signed-in organization, requested questions, provider configuration, and applicable limits, then emits one background event. Inngest owns retries and collection. Provider-specific adapters normalize answers while retaining raw evidence and visible partial failures.

Demo runs are isolated from live providers and customer records.
