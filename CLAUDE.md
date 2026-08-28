# Foremention Repository Constitution

Foremention is a recommendation-intelligence product for B2B software. The company direction is Registered Evidence with the expression `Register. Prove. Prepare.`

## Founder workflow

Before any material UI, product, brand, SEO, investor, accelerator, or design-system change:

1. Show the intended visual first.
2. Explain what will change, what remains locked, and why.
3. Only then implement.
4. Return with visual proof and exact verification status.

## Locked brand rules

- Company name: Foremention.
- Category: Recommendation Intelligence.
- Descriptor: Recommendation intelligence for B2B software.
- Use the exact founder-supplied canonical logo and wordmark assets. Never retype, redraw, approximate, stretch, recolor arbitrarily, add glow, bevel, shadow, or reconstruct the mark in CSS.
- Use the exact white/reverse lockup on dark surfaces and the exact black/ink lockup on light surfaces. Use the standalone canonical mark only when the full lockup cannot fit.
- Brand system: near-black conviction mode, warm-light inspection mode, deep registered green, registration/alignment/resolution as signature behavior.
- The hero must read as recommendation evidence resolving into an inspectable record, not a planet, cyber-grid, or generic AI network.

## Foremention 5 — locked product architecture

The primary signed-in product has five objects only:

1. Attention — what changed / what requires review.
2. Questions — real buyer questions.
3. Records — canonical Recommendation Records, including evidence inspection.
4. Comparisons — only valid/comparable later observations.
5. Settings — minimal workspace administration.

Source X-Ray is retired as a standalone feature, page, navigation item, SEO route, analytics event, investor story element, or design-system deliverable. Preserve the useful inspection behavior inside Recommendation Records: returned reference -> retrievability -> observed evidence -> review -> limitations -> safe conclusion -> comparison eligibility.

## Product truth

Canonical intelligence chain:

`buyer question -> provider/model -> answer -> named/recommended brand -> returned reference when available -> distinct source -> retrievability -> evidence -> human review -> competitor context -> decision -> action -> comparable later measurement`

Preserve explicit states such as observed, inferred, automated, reviewed, accepted, rejected, unavailable, insufficient evidence, contradictory, comparable, not comparable, later observation, outcome, and causation not proven.

Never imply that a returned source caused a recommendation. Never manufacture false precision.

## Business truth

- Do not fabricate customers, logos, ARR, MRR, testimonials, investor names, funding, reviews, benchmarks, recommendation counts, or case studies.
- Label prototype information as demo data, illustrative example, or placeholder.
- Current conversion posture is founder-led; prefer `Request a demo` / `See an example` over invented self-serve scale.
- Pricing remains a hypothesis until validated.

## Security and data boundaries

- Preserve authentication, authorization, Supabase RLS, organization/workspace isolation, service-role boundaries, provider secret handling, OAuth/webhook verification, evidence integrity, auditability, and privacy.
- Demo mode must stay credential-free and isolated from live providers and customer records.
- Never weaken tests or security semantics to make a release green.

## Standard commands

```bash
pnpm install
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Node.js >= 22.13.0 and pnpm 10.25.0 are required.

## Release gate

Use RED -> GREEN -> VERIFY. Before merge, require fresh evidence for tests, lint, typecheck, production build, configured security checks, browser acceptance, accessibility, responsive QA (1440 / 1024 / 768 / 375 / 320), reduced motion, canonical-logo audit, SEO audit, and performance review. Merge/deploy only the exact verified SHA, then prove production on that exact SHA.

## References

- `README.md` — product/setup context.
- `docs/ARCHITECTURE.md` — runtime and data boundaries.
- `docs/TESTING.md` — standard quality gate.
- `docs/SECURITY.md` and `SECURITY.md` — security requirements.
- `docs/BUILD-VERIFICATION.md` — expected production build outcome.
- `.claude/skills/foremention-product-truth/SKILL.md` — reusable product/brand truth.
- `.claude/skills/foremention-release-gate/SKILL.md` — explicit release workflow.
