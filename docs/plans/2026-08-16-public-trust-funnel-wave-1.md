# Public trust and funnel — Wave 1

Date: 2026-08-16
Base: `12b256dba80ae32d5f8c7c3bef859e8167e1b1e2`

## Why this wave exists

The launch audit found a small set of high-confidence public-site defects that materially affect trust, search accuracy, or mobile funnel quality without requiring a commercial/billing decision.

## Proven P1 defects

1. **Standards route split** — the public shell currently links Standards to `/honesty` while the sitemap publishes `/standards`. There is no `app/standards/page.tsx`, so the search-facing canonical route is not implemented.
2. **Structured-data pricing contradiction** — the global `SoftwareApplication` JSON-LD publishes Core `$149` and Signal `$499` offers even though Foremention is currently a free private beta with no active checkout.
3. **Footer/trust overload on mobile** — the footer exposes too many product/account/legal links and embeds an expandable analytics preference block directly in the navigation column.
4. **Trust naming ambiguity** — the legal/trust destination `/subprocessors` is labeled “Service providers” instead of the clearer B2B term “Subprocessors”.

## Design decision

### Standards
- Make `/standards` the canonical evidence-standards route.
- Preserve old `/honesty` links with a permanent redirect to `/standards`.
- Update public navigation to `/standards`.

### Structured data
- During the current free-beta/no-checkout state, do not advertise paid Core/Signal `Offer` objects in global JSON-LD.
- Keep the application/organization schema truthful and non-commercial.
- Paid offer schema can return only when billing is actually activated and verified.

### Footer
Visible footer navigation should be deliberately smaller:
- **Product:** Platform, Pricing, Methodology, Standards
- **Company:** About, Contact
- **Legal / Trust:** Privacy, Terms, Subprocessors, Analytics settings
- **Follow:** existing verified social destinations

Long-tail product/SEO routes remain available through contextual navigation and the sitemap; they do not need to occupy the global mobile footer.

### Optional experience analytics
- Keep Microsoft Clarity and Contentsquare privacy-off by default.
- Preserve the existing localStorage consent contract and revocation reload behavior.
- Replace the large expandable footer `<details>` surface with a compact `Analytics settings` trigger and an accessible dialog.
- The dialog must provide explicit keep-off/allow actions and a close control.
- Do not imply this control governs PostHog operational telemetry; its copy remains scoped to optional Clarity/Contentsquare experience analytics.

## Explicit non-goals

- No billing activation.
- No price change.
- No auth/RLS/provider/evidence/Inngest changes.
- No removal of `/subprocessors`.
- No competitor/pricing rewrite in this wave.
- No broad visual redesign.

## Verification

Test first, then require the existing PR gate set. After guarded merge, verify the resulting exact production SHA through Cloudflare, health, Inngest, Browser Acceptance, Lighthouse, authenticated acceptance, canary, security, SBOM, and provenance.