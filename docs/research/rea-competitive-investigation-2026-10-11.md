# REA competitor investigation for Foremention — 2026-10-11

**Status:** public-source competitive research and optional local development workflow. **Not:** an REA runtime capture, production integration, customer benchmark, validated comparative efficacy study, or authorization to copy a third party's proprietary implementation.

**Source repositories:** [REA](https://github.com/morluto/rea) (MIT, copyright 2026 morluto; [license](https://github.com/morluto/rea/blob/main/LICENSE)) and [Foremention](https://github.com/injamhaqq/foremention). REA's README describes `rea-agents`, MCP, static JS/Electron and website observation. Its [browser documentation](https://github.com/morluto/rea/blob/main/docs/browser-observation.md) describes `list_browser_targets`, `inspect_web_page`, `analyze_web_bundle`, `observe_web_session` and limitations.

## Decision

**ADOPT as an opt-in developer investigation procedure; do not add to the hosted product or auto-start it for every agent session.** REA can inspect public site behavior and shipped JS artifacts; it cannot discover hidden servers, confidential product economics, actual customer demand or source-code ownership. A competitor feature's observable UX is not permission to copy code/design. Foremention's approved Stage-0 priority is customer proof, an evidence-quality fix and repeatable reviewed decision workflows, not another top-level platform or new provider.

Foremention already has `/app/competitors`, `/app/competitors/page.tsx`, `components/competitor-tracker.tsx`, `app/api/competitors/route.ts`, `/app/runs/compare`, the Recommendation Record evidence path, exact-question/provider/model comparability, and human review. Existing competitor tracking shows verified answer mentions, reviewed cited pages, source overlap and exact-comparable movement; it explicitly does **not** estimate overall market share. This research is about *Foremention's commercial competitors*, not the tenant-specific competitor brands customers track. Never insert this market survey as genuine customer collection data.

Current potential improvement: an evidence-linked explanation of **which buyer questions mention a rival but not the workspace brand and which reviewed references support that observation**, followed by one human-reviewed decision. Gate on a verified pilot problem; treat absent/incomplete answers as unknown, not competitor wins.

## Public competitive evidence snapshot

First-party, unauthenticated descriptions observed on 2026-10-11. These are vendor-advertised capabilities; no competitor login, CDP inspection, paid plan or API was used.

| Vendor / role | First-party source | Advertised capability | Closest Foremention path | Pilot decision |
| --- | --- | --- | --- | --- |
| Peec AI — direct | https://peec.ai/ | Brand comparison, choice of AI models, cited sources, AI-guided opportunities, CSV/API/MCP | Questions / Records / Evidence / competitor tracking | **P1 research:** test how a buyer notices a cited-source gap |
| Semrush AI Visibility Toolkit — adjacent suite | https://www.semrush.com/kb/1598-competitor-research-report | Competitor mentions, topic/prompt gaps, visibility report; compare up to four domains | Questions / competitor tracking / Comparisons | **P1 research:** investigate 'missing' question drilldown with exact comparability |
| Otterly.AI — direct | https://otterly.ai/ | Prompt research, AI search analytics, citations, competitor comparisons, content audits | Questions / Evidence / Opportunities | **P2:** assess first-run clarity and raw evidence navigation |
| Scrunch — direct and adjacent AXP | https://scrunch.com/ | Prompt/topic/competitor benchmarking, citation diagnostics, AI bot traffic, Agent Experience Platform | Evidence / Opportunities / website diagnostics | **P2:** investigate diagnostic evidence; defer AXP |
| Profound — enterprise platform | https://www.tryprofound.com/ | Answer Engine Insights, Prompt Volumes, Agent Analytics and AI Marketer drafts/actions | Records / Opportunities / Change Specifications | **P2:** human approval pattern only; defer broad agent suite |
| Ahrefs Brand Radar — adjacent suite | https://help.ahrefs.com/en/articles/11064852-what-is-brand-radar-and-how-to-use-it | Large prompt-based discovery, brands, cited pages/domains and competitive comparisons | Questions / Evidence / Comparisons | **P2:** consider only if buyers ask for prompt discovery |

Independent landscape cross-check: https://technologyadvice.com/blog/information-technology/ai-software/best-ai-search-monitoring-tools/ (published 2026-06-23, updated 2026-06-24). Vendor capability statements are not verified proof of implementation quality. Plans, model lists and prices can change, so prices are deliberately not represented as current guaranteed figures here.

## How to use REA for this research (manual, opt-in)

REA main's [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md) reports npm package **6.4.0** checked 2026-10-11. Confirm the chosen release before starting, especially if main has newer commands. REA supports Node 22 >=22.19, Node 24 >=24.11, or Node 26+, plus npm. Run in the environment that actually owns the dedicated browser, not an unrelated remote Codespace.

1. Review only, before permitting any agent config changes: `npx rea-agents@6.4.0 setup --client claude_code --dry-run --json`. For Codex use `--client codex`.
2. After reviewing the plan and approving changes, run `npx rea-agents@6.4.0 setup --client claude_code`; restart the agent. Optional `npx skills add morluto/rea --skill reverse-engineer-anything` **installs instructions only**, not MCP tools. Project `.mcp.json` is deliberately unchanged.
3. For passive public browser observation on a local Linux workstation (adapt Chrome executable/profile path): `google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/rea-foremention-public https://peec.ai/`. Do not use a signed-in browser profile; bind the debug port to loopback only.
4. `rea list-browser-targets http://127.0.0.1:9222 --json`. Select the actual returned `TARGET_ID`, then `rea inspect-web-page http://127.0.0.1:9222 TARGET_ID --observation-ms 1000 --json`. Optional `rea analyze-web-bundle http://127.0.0.1:9222 TARGET_ID --json` to inspect shipped script/module relationships without execution.
5. Record actual REA evidence IDs, exact target/version, accessible flow, user-facing controls, first-party doc corroboration, and unknowns. Never represent this document's first-party desk research as an REA browser capture.
6. Repeat on one public feature page for a different competitor; compare *behavioral principles*, not copied markup/bundles or pixels. Reproduce a simple original flow in Foremention only after a verified customer pilot blocker and tests justify it.

**Privacy/security:** A debugging port grants significant browser control; use an isolated browser with no secrets, no customer data and a disposable profile. Avoid authenticated vendor endpoints, forbidden scraping, access-control circumvention, third-party code copying, session replay and licensing violations. Inspecting JavaScript does not reveal backend services or establish actual algorithm behavior. If the environment lacks Chrome/CDP or REA MCP, document the blocker; do not fabricate observations.

## One bounded evaluation, no premature feature launch

Hypothesis: for a B2B SaaS design partner, a question-level gap linked to raw AI answer + native returned references + human review makes the next Change Specification easier to choose. Proposed test: ask 3 qualified design partners to review a single question and answer record, explain what evidence would justify an action, and compare comprehension/time-to-decision with the current workflow. This is a **proposed test**, not collected customer evidence or a claim of improved conversion.

Acceptance requirements before an implementation PR:
- A named, real pilot problem and its first-party evidence exists.
- No invented prompts, results, source lists, benchmark scores or historical trends.
- A question/brand/provider/model/methodology-specific observation drives the candidate gap; partial history fails closed.
- Only reviewed returned references and explicitly retrieved sources are presented as such; absence is never proof of zero visibility.
- Human decision required for action; no autonomous publish/send, no customer-data import from research.
- Existing `/app/competitors` and canonical navigation remain intact; isolated branch, unit/browser tests, exact-SHA CI and explicit review before merge.

## Related Foremention work

Existing research draft [PR #535](https://github.com/injamhaqq/foremention/pull/535) already preserves a public competitor SDK/skills survey; avoid overlapping its four paths, duplicate SDK integrations and hypothetical feature creep. Stage-0 scope remains governed by [issue #283](https://github.com/injamhaqq/foremention/issues/283). The present note is a distinct *REA usage and public workflow* handoff; it neither supersedes PR #535 nor asserts the REA tool has been run against a competitor.

**As-of data boundary:** Public pages and current repository files inspected 2026-10-11; authenticated competitor functionality, measured performance, screenshot parity, live REA artifacts, pricing accuracy, customer willingness-to-pay and deployment status **not verified**.
