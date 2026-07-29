# Foremention

Foremention is self-serve recommendation-intelligence infrastructure for B2B SaaS teams. It tracks the buyer questions people ask AI systems, which brands those systems recommend, the outside pages supporting those answers, competitor presence, and how the evidence changes over time.

The product is software, not an agency service. Customers configure categories and prompts, run supported AI providers, inspect URL-level evidence, prioritize source opportunities, and monitor later observations inside their own workspace.

## Product chain

`buyer question -> AI engine -> recommended brand -> cited URL -> source influence -> competitor presence -> opportunity -> action -> citation change -> referral -> revenue`

Observed evidence, product assessments, and customer-supplied outcomes remain visibly separate. Foremention does not guarantee rankings, citations, editorial acceptance, traffic, leads, or revenue.

## Included

- Public product website, Source Map explainer, pricing, methodology, honesty clause, sample report, comparisons, legal templates, contact, and Source Gap Check
- Interactive recommendation journey and Source X-Ray
- Supabase email/password authentication and organization-scoped row-level security
- Credential-free, isolated seeded demo
- Customer workspace for onboarding, prompts, runs, Source Map, opportunities, evidence, analytics, and settings
- Provider adapters for OpenAI, Gemini, Anthropic, Perplexity, and deterministic mock runs
- Inngest background-run orchestration
- D1-backed public Source Gap intake for Sites deployments
- Sitemap, robots rules, structured data, social preview artwork, responsive layouts, keyboard support, and reduced-motion behavior

## Plans represented in the product

- Explorer: free
- Builder: $49/month
- Growth: $199/month
- Scale: custom

These are recurring software plans. Payment activation is not complete until a verified billing webhook updates the organization entitlement; a checkout return must never unlock paid access by itself.

## Quick start

Requirements:

- Node.js 22.13 or newer
- pnpm 10.25 or newer

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/login` and choose **Open seeded demo**. Demo mode requires no Supabase, provider, Inngest, or payment credentials and must never call external providers or create charges.

The default scripts use Vinext for the Cloudflare/Sites runtime. Standard Next.js alternatives are also available:

```bash
pnpm dev:next
pnpm build:next
pnpm start:next
```

## Production connections

### Supabase

1. Create a Supabase project.
2. Apply every file in `supabase/migrations/` in timestamp order.
3. Set the production Site URL and approved redirect URLs in Supabase Auth.
4. Add the project URL and publishable key to the host.
5. Keep the service-role key server-only.
6. Verify that anonymous users cannot read organization-owned tables and members cannot read another organization.

### AI providers and Inngest

1. Configure at least one supported provider key and an explicit model ID on the server.
2. Configure Inngest event and signing keys for hosted jobs.
3. Run representative prompts and verify provider/model labels, timestamps, raw evidence, citations, refusals, partial failures, and cost controls before allowing live customer runs.

### Payments

Connect a payment provider only after prices, refund terms, taxes, and the legal entity are approved. Paid entitlements must be granted by a verified webhook event, not by a browser redirect.

## Environment variables

| Key | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical app origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only writes and background work |
| `INNGEST_EVENT_KEY` | Sends hosted job events |
| `INNGEST_SIGNING_KEY` | Verifies hosted function requests |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Optional OpenAI adapter |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Optional Gemini adapter |
| `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_MODEL_VERSION` | Optional Groq Compound adapter with structured web-search citations |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Optional Anthropic adapter |
| `PERPLEXITY_API_KEY`, `PERPLEXITY_MODEL` | Optional Perplexity adapter |

Never commit `.env.local` or expose server secrets to browser code.

## Repository map

```text
app/                     public pages, product pages, and API routes
components/              public and product UI
lib/
  jobs/                  Inngest orchestration
  providers/             provider adapters
  auth.ts                server-side session checks
  demo-data.ts           fictional, credential-free demo
supabase/
  migrations/            schema, grants, and RLS
  seed.sql                fictional demo/reference records
docs/                    architecture, security, deployment, and QA
worker/                  Cloudflare/Vinext entry point
```

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

Before a public launch, also complete the deployed browser journeys, production Supabase/RLS test, provider evaluation, Inngest run, verified billing-webhook test, legal review, backup/restore drill, error monitoring, accessibility review, and real-device QA described in `docs/PRODUCTION-READINESS.md`.
