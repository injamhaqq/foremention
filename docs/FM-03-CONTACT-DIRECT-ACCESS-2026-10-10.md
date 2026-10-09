# FM-03 contact friction — scoped candidate

Date: 2026-10-10. Base main: `d4fea60a7bb8e047f2282cea9134121e9496c67e`.

## Observed issue
The actual PR #491 browser acceptance screenshot of `/contact` at 375px shows a long introduction and working-session explanation before the existing application form. Qualified visitors must scroll through much of the explanation to reach the application.

## Proposed visual (founder approval required)
Keep the canonical dark contact hero and all existing copy. Under the existing paragraph, insert one canonical green text/button shortcut: **Go to pilot application →**. It moves keyboard and pointer users to the existing **Apply as Design Partner** heading. On mobile the shortcut is full width; the focusable target has scroll margin for the sticky header.

## Risk containment
No forms, field labels, validation, backend endpoints, security controls, success states, PR #440 API changes, analytics events, pricing, brand assets or design tokens changed. No extra submission or event is created. The link is an in-page navigation aid, not an authoritative conversion event.

## Release gate
Contact route overlaps active PR #440; FM-00 must reconcile exact code before integration. Founder approval under CLAUDE.md, CI, browser/mobile accessibility, and FM-08 signoff are required. This branch is draft-only and not deployed.
