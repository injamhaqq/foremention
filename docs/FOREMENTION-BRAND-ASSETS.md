# Foremention — Canonical Brand Assets

Status: **LOCKED**

The canonical Foremention identity is the supplied vector artwork. This record resolves the brand-asset truth gate in `docs/superpowers/specs/2026-08-25-evidence-standard-production-design.md`.

## Runtime source of truth

- Approved reverse full lockup: `public/brand/foremention-logo-white.svg`
- Approved reverse symbol: `public/brand/foremention-mark-white.svg`
- Browser tab icon: **not currently published as an approved standalone artwork**. `app/favicon.ico` is absent and explicitly required to remain retired by `tests/canonical-visual-system.test.mjs`; do not restore it or invent an icon without a separate approved identity/metadata review.

`components/brand.tsx` renders the approved reverse assets on the existing graphite/black backgrounds. The older light-background paths `public/brand/foremention-logo.svg` and `public/brand/foremention-mark.svg` are retired and absent from the current runtime. They must **not** be restored, recreated, or inferred from the reverse artwork without a separate founder-approved brand-asset migration.

The visible wordmark must not be reconstructed with typed text, a substitute font, CSS geometry, or a regenerated approximation.

## Locked geometry and color

- Full lockup viewBox: `0 0 264.096 33.24`
- Symbol viewBox: `0 0 22.625 22.625`
- Ink: `#0F0F0F`
- Reverse: `#FFFFFF`
- Scale proportionally only.
- Minimum full lockup width on screen: 100px.
- Minimum symbol size: 16px.
- Keep clear space equal to half the symbol height on all sides.

## Do not

- stretch, squash, rotate, or skew the artwork;
- add shadows, outlines, gradients, bevels, glow, or decorative effects;
- recolor the identity arbitrarily;
- rebuild the wordmark in another font;
- use the black asset on a dark surface or the white asset on a light surface.

## Legacy identity

The historical `SourceEclipseMark`, `public/source-eclipse.svg`, and related CSS are not canonical Foremention identity sources. Any compatibility symbol entry point must resolve to the canonical Foremention mark and must not render the historical geometry.
