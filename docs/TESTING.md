# Testing and quality gates

Run:

```bash
pnpm test
pnpm lint
pnpm build
```

The contract suite checks the exact offer/brand system, RLS evidence chain, provider/job architecture, production route inventory, fictional-data disclosures, D1 persistence, social preview, SEO routes, focus states, and reduced-motion support.

Visual QA must cover `/`, `/honesty`, `/source-map`, `/sample-report`, `/pricing`, `/login`, `/app`, `/app/source-map`, and `/app/placements` at desktop and mobile widths. Demo access begins at `/login` with **Open seeded demo**.

Remaining external verification requires applied production Supabase migrations, live provider and Inngest credentials, a verified payment webhook, real customer authorization, legal review, and a real customer evidence set.
