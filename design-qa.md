# Homepage design QA - PR #12 - 2026-08-11

## Scope

- Branch: `homepage-readiness-2026-08-11`
- Starting commit: `d9b61f5440dfd7b17629b6745767ff0cb680d551`
- Source visual supplied by the owner: `C:\Users\Injam\Downloads\asd211231231231.PNG`
- Pre-fix desktop capture: `C:\Users\Injam\AppData\Local\Temp\foremention-pr12-qa\desktop-1440.png`
- Pre-fix mobile capture: `C:\Users\Injam\AppData\Local\Temp\foremention-pr12-qa\mobile-390.png`
- Post-fix desktop capture: `C:\Users\Injam\AppData\Local\Temp\foremention-pr12-qa\desktop-1440-fixed.png`
- Post-fix mobile capture: `C:\Users\Injam\AppData\Local\Temp\foremention-pr12-qa\mobile-390-fixed.png`

The owner screenshot appears to use a reduced browser zoom, so it is treated as composition guidance rather than a pixel-perfect reference. QA used browser zoom 100% and CSS pixels.

## Initial defects

### P1 - Desktop hero collision

At 1440 x 900, the original heading ended at x 776.48 while the preview began at x 748.09. The regions overlapped by about 28 px. The 580.78 px headline height also made the opening difficult to scan.

### P1 - Lost above-the-fold hierarchy

The original hero was 1309.78 px tall in a 900 px viewport, delaying the product proof and weakening the primary action.

### P2 - Mobile opening was too copy-heavy

At 390 x 844, the original heading was 307.02 px tall and the product preview began at y 1180.64.

### P2 - Release safeguards had regressed

PR #12 lacked explicit ChatGPT user, Claude search/user, and training-crawler rules, current sitemap metadata, and robust Contentsquare script-snippet parsing.

## Fix applied directly to PR #12

- Replaced the oversized hero sentence with a shorter evidence-first headline.
- Bounded the desktop hero to equal flexible columns with `min-width: 0`.
- Removed inherited preview offsets and capped headline size and width.
- Shortened support and workspace-activation copy.
- Restored explicit public search/user crawler rules and blocked training crawlers.
- Updated sitemap metadata to 2026-08-11.
- Restored validated Contentsquare URL extraction from either a direct URL or supplied script snippet.
- Made the citation batching contract tolerate Windows and Unix line endings.

No code was copied or merged from the separate homepage repair branch.

## Post-fix browser evidence

### 1440 x 900

- Document client width: 1425 px; scroll width: 1425 px; no horizontal overflow.
- Heading: x 122.5, y 210.5, width 475, height 205.69, right 597.5.
- Preview: x 741.30, y 188.02, width 561.20, height 626.34.
- Horizontal collision: 0 px.
- Hero height: 849.38 px, reduced by about 460 px.

### 1280 x 720

- Document client width and scroll width: 1265 px; no horizontal overflow.
- Heading right edge: 460.5; preview begins at x 658.09; collision: 0 px.
- Hero height: 826.5 px. The headline, value proposition, and primary action are visible; the product preview intentionally continues below the short viewport.

### 768 x 1024

- Document client width and scroll width: 753 px; no horizontal overflow.
- The layout changes to one column, so the horizontal overlap value is not a collision.
- Heading height: 149.48 px; preview begins at y 895.17.

### 390 x 844

- Document client width and scroll width: 375 px; no horizontal overflow.
- Heading width: 330 px; height: 139.92 px.
- Supporting copy width: 347 px and remains inside the viewport.
- Preview begins at y 963.02, after the primary action and concise activation note.

### 1920 x 1080

- Document client width and scroll width: 1905 px; no horizontal overflow.
- Heading and preview remain separate; collision: 0 px.

## Interaction and runtime checks

- Primary CTA resolves to `/signup`.
- `Inspect the evidence` moves to `#source-xray` with the section aligned below the sticky header.
- The Source X-Ray disclosure control changes the visible evidence state when activated.
- Browser log contained Vite development messages and the React development hint only; no console error or warning was observed.
- Source X-Ray and existing reduced-motion/accessibility behavior were preserved.

## Automated checks

- Production dependency audit: passed; no known vulnerabilities.
- Tests: passed, 180 of 180.
- Lint: passed.
- TypeScript typecheck: passed.
- Production build: passed.
- Diff whitespace check: passed before final documentation update and must be rerun before commit.

## Final result

passed

No P0, P1, or P2 defect remains in the repaired PR #12 homepage scope. This is a verified PR-branch result, not a production deployment claim.
