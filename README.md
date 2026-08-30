# Foremention

Foremention is recommendation-intelligence infrastructure for B2B software teams. It records the buyer questions people ask AI systems, which brands those systems recommend, the evidence returned with those answers, competitor context, human review state, and how genuinely comparable observations change over time.

The product is software, not an agency service. Teams define priority buyer questions, run supported AI providers, inspect Recommendation Records, review source evidence and uncertainty inside those records, compare later observations only when the measurement remains equivalent, and decide what to do next.

## Product architecture

The primary signed-in product is deliberately constrained to five objects:

`Attention -> Questions -> Records -> Comparisons -> Settings`

Recommendation Record is the canonical object. Evidence inspection is part of the record, not a separate product surface. Proven specialist capabilities such as competitor tracking, opportunities/actions, the Resolution Center, Outcome Ledger, Vendor Passport, Intelligence Loop, Agent Control Plane, Decision Lab, Evidence Vault, alerts, team controls, and integrations remain available contextually from those five objects rather than competing as global navigation destinations.

## Product truth chain

`buyer question -> provider/model -> answer -> named/recommended brand -> returned reference when available -> distinct source -> retrievability -> evidence -> human review -> competitor context -> decision -> action -> comparable later measurement`

Observed evidence, inference, automated processing, human review, customer decisions, later outcomes, and causal claims remain visibly separate. A returned reference does not prove that the source caused a recommendation. Foremention does not guarantee rankings, citations, editorial acceptance, traffic, leads, or revenue.

## Included

- Public product website, Recommendation Intelligence and Recommendation Record explainers, methodology, research, legal/trust pages, contact/design-partner intake, and legacy Source Gap intake
- Recommendation Records with integrated returned-reference, retrievability, observed-evidence, review, limitation, and comparison-eligibility inspection
- Supabase email/password authentication and organization-scoped row-level security
- Credential-free, isolated seeded demo
- Customer workspace centered on Attention, Questions, Records, Comparisons, and Settings, with proven specialist tools retained contextually
- Foremention Agent Control Plane with recorded, organization-scoped execution telemetry for collection, mapping, measurement, and human review
- Foremention Intelligence Loop for reviewed-evidence search, comparable run changes, explicit confidence checks, recorded cost, and one deterministic next action
- Provider adapters for OpenAI, Gemini, Anthropic, Perplexity, Groq, Cloudflare Workers AI, and configured gateways, with deterministic mock runs
- Inngest background-run orchestration
- D1-backed public Source Gap intake for Sites deployments
- Sitemap, robots rules, truthful structured data, social preview artwork, responsive layouts, keyboard support, and reduced-motion behavior

## Plans represented in the product

- Core: one brand/category, bounded buyer-question coverage, monthly measurement, Recommendation Records, human review, and exports
- Signal: broader question coverage, up to three brand workspaces, weekly measurement, exact-comparison context, collaboration, alerts/actions, and shareable Records
- Intelligence: custom multi-brand/multi-market scope, governance, integrations, API/webhook scope, and enterprise access controls when configured

Founder-led design-partner terms are being validated with real teams. Creating a design-partner/private-beta workspace does not charge a card or silently activate a paid entitlement. Self-serve Core/Signal subscription checkout exists only when Stripe, a webhook secret, and real package Price IDs are configured; otherwise billing stays fail-closed and the product keeps the founder-led contact path. Intelligence remains sales-led/custom-scoped. No public dollar price is fabricated by the repository.

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
3. Run representative buyer questions and verify provider/model labels, timestamps, raw evidence, returned references, refusals, partial failures, and cost controls before allowing live customer runs.

### Payments

Foremention uses Stripe Checkout Sessions for recurring Core/Signal subscriptions and the Stripe Customer Portal for self-service billing management when Stripe is configured. Browser success redirects never grant entitlements. Package state becomes active only from a verified, replay-bounded Stripe webhook mapped into the existing `billing_accounts` and `organization_entitlements` records.

Before enabling paid checkout in production, approve real Stripe Prices, refund/cancellation terms, tax handling, the contracting legal entity/jurisdiction, and customer-facing billing copy. Leave the Stripe variables unset until those facts are real; the product then remains founder-led and fail-closed.

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
| `CLOUDFLARE_MODEL` and `CLOUDFLARE_*_COST_*` | Optional Workers AI binding adapter; answer comparison only when the configured model does not return web citations |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `OPENROUTER_*_COST_*` | Optional explicit-model OpenRouter adapter; availability and cost depend on configured model |
| `ZENMUX_API_KEY`, `ZENMUX_MODEL`, and `ZENMUX_*_COST_*` | Optional fixed-endpoint ZenMux gateway; unavailable until an explicit model and current cost rates are configured |
| `OMNIROUTERS_API_KEY`, `OMNIROUTERS_MODEL`, and `OMNIROUTERS_*_COST_*` | Optional fixed-endpoint OmniRouters gateway; unavailable until an explicit model and current cost rates are configured |
| `STRIPE_SECRET_KEY` | Optional server-only Stripe API key; required for hosted subscription checkout/portal |
| `STRIPE_WEBHOOK_SECRET` | Optional Stripe endpoint secret used to verify and replay-bound billing webhooks |
| `STRIPE_CORE_PRICE_ID` | Real Stripe recurring Price ID for Core; leave unset until approved |
| `STRIPE_SIGNAL_PRICE_ID` | Real Stripe recurring Price ID for Signal; leave unset until approved |

Never commit `.env.local` or expose server secrets to browser code.

See [`docs/integration-boundaries.md`](docs/integration-boundaries.md) before adding another provider, crawler, agent, or gateway.

## Repository map

```text
app/                     public pages, product pages, and API routes
components/              public and product UI
lib/
  jobs/                  Inngest orchestration
  agent-control-plane.ts owned agent registry and idempotent stage telemetry
  providers/             provider adapters
  auth.ts                server-side session checks
  demo-data.ts           fictional, credential-free demo
supabase/
  migrations/            schema, grants, and RLS
  seed.sql                fictional demo/reference records
docs/                    architecture, security, deployment, and QA
worker/                  Cloudflare/Vinext entry point
```

## Agent / automation harness

Repository-level Claude Code guidance lives in `CLAUDE.md`. Shared project MCP servers live in `.mcp.json`; project hooks, skills, and specialist subagents live under `.claude/`. The harness is intentionally conservative: it protects sensitive paths, re-injects Foremention product truth at session start, keeps design/browser integrations project-scoped, and validates its configuration in GitHub Actions.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Before a paid public launch, also complete deployed browser journeys, production Supabase/RLS testing, provider evaluation, Inngest verification, Stripe webhook/Checkout/Portal testing for every active package, legal review, backup/restore drills, error monitoring, accessibility review, responsive QA at 1440/1024/768/375/320, reduced-motion review, canonical-logo audit, SEO review, and real-device QA described in `docs/PRODUCTION-READINESS.md`.