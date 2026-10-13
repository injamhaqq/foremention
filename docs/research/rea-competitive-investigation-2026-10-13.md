# REA competitor investigation for Foremention, 2026-10-13 update

**Status:** public first-party desk research (vendor pricing pages, official docs/help pages). No sign-up, no login, no paid plan, no REA/CDP capture. This updates and extends `docs/research/rea-competitive-investigation-2026-10-11.md` on branch `research/rea-competitor-evidence-20261011` (draft PR #536). Claim-level evidence, each with its exact source URL and `as_of = 2026-10-13`, is in `rea-public-competitor-observations-2026-10-13.csv` (84 claims, 5 marked `unverified`).

**Scope change vs 2026-10-11:** the 2026-10-11 note deliberately left prices out. This update records the published prices exactly as shown on 2026-10-13. Four direct competitors were added: **AthenaHQ, Rankscale, Goodie, Writesonic GEO**. Bluefish was not added because the four-vendor cap was already used.

**Method notes and caveats**
- Peec AI renders its prices in JavaScript. The figures were read from the pricing component bundle the page loads (`framerusercontent.com/.../3UaZbEy0CJhuDnUxo0-...mjs`, componentIds `pricing-starter/pro/advanced`), not from rendered text. Peec agency prices appear only as component defaults and are marked `unverified`.
- Writesonic shows **annual-billed** prices ($79/$199/$399). Monthly-billed prices of $99/$249/$499 are only implied by "Save $X/year". Only the "$99/mo" floor appears outright, in the page description, so the derived figures are marked `unverified`.
- AthenaHQ ($295) and Goodie ($295/$999) both have a monthly/annual toggle. The fetch could not confirm which billing basis the static figure shows.
- Semrush KB URL fetched as `https://www.semrush.com/kb/1493-ai-toolkit` (canonical `1493-ai-visibility-toolkit`).
- Vendor statements are advertised capability, not verified implementation quality.

## Foremention baseline (from the public repo, main branch, 2026-10-13)

- `app/pricing/page.tsx`: Core **$99/mo** (25 approved buyer questions, 1 brand, **monthly** cadence). Signal **$299/mo** (100 questions, up to 3 brand workspaces, **weekly** cadence). Both are labelled "Proposed · not yet purchasable". Beta is limited to 10 questions. **Discrepancy:** the brief gives Signal as "$249 or $299", but main already shows $299.
- `docs/PROVIDER-SURFACE-TRUTH.md`: the production free-only collection surface is **Cloudflare Workers AI + independent Bing Search RSS retrieval**. It explicitly says this is *not* a native ChatGPT, Gemini or Perplexity observation.
- `lib/question-suggestions.ts`: question suggestions are built from Source Map evidence. There is no prompt demand/volume data.
- The brief also lists: questions, Recommendation Records with citation evidence, competitor comparisons, and a draft "rival shows up instead of you" view (PR #355).

## Summary table

Prices are USD/month as published on 2026-10-13. "Rival instead of you" means an explicit view or report naming prompts or sources where competitors appear and the brand does not.

| Vendor | Published tiers (exact) | Engines tracked | Prompt limits | Competitor SOV | Rival-instead-of-you view | Citation / source evidence | Agency / multi-brand | Free trial / tier |
|---|---|---|---|---|---|---|---|---|
| **Peec AI** | Starter $95 ($80 annual); Pro $245 ($205); Advanced $495 ($420); Enterprise custom. +model add-on $35/$85/$165 | Choose 3 of ChatGPT, AI Mode, AI Overviews, Copilot, Gemini, Naver AI, Perplexity, Claude; Enterprise up to 13 | 50 / 150 / 350 prompts; 1 / 2 / 5 projects | Yes ("share of voice… against competitors") | Yes: gap analysis of sources "that name competitors but not you" | Yes: URL/domain detail, citation share, source classes | Yes: agency pricing page (credit tiers); prices unverified | Free trial (length not stated) |
| **Semrush AI Visibility Toolkit** | $99; +user $99; +domain $99; +50 prompts $60 | Prompt Tracking: ChatGPT Search, Google AI Mode, Gemini | 25 prompts (toolkit); Semrush One 50/100/200 | Yes (Brand Performance SOV); not in Prompt Tracking | Yes: "prompts… where others are getting cited but you aren't" | Yes: Sources report and answer snapshots | Partial: per-domain add-ons, corporate seats | **No free trial** |
| **Otterly.AI** | Lite $29; Standard $189; Premium $489; Enterprise custom (annual $25/$160/$422) | ChatGPT, AI Overviews, Perplexity, Copilot; add-ons AI Mode, Gemini, Claude | 15 / 100 / 400; Enterprise 1,000+; +100 for $99 | Yes ("Share of AI Voice") | Yes (marketing copy: gaps "where competitors get cited") | Yes: Link Citations Analysis | Yes: unlimited workspaces (Standard+), agency partner program | Free trial (7-day vs 14-day both stated) |
| **Scrunch** | Core $250; Enterprise custom | Core 4: ChatGPT, Perplexity, Google AIO, Copilot; Enterprise 9 | 125 prompts, 5,000 responses/mo, 5 competitors | Benchmarking yes; "SOV" wording unverified | Not stated | Yes: Citations / Sources | Yes: multi-client workspaces (agency pricing not rendered) | 7-day free trial |
| **Profound** | Trial free; Enterprise custom; Agency Growth self-serve (price not shown) | Trial: ChatGPT, Gemini, AIO; Enterprise up to 9 | Trial 50 prompts × 7 days; Enterprise tailored | Yes ("competitive presence") | Not stated | Yes ("tracking citations") | Yes: centralized client management | Free 7-day trial |
| **Ahrefs Brand Radar** | Custom Prompts from $50 ($699 all models); AI Visibility Index $199 | Index: AIO, AI Mode, ChatGPT, Perplexity, Gemini, Copilot; +Claude for Custom Prompts | Included 5 / 10 / 20 prompts in Ahrefs Lite/Std/Adv; Index 83 prompts/day | Yes ("AI Share of Voice") | Partial: "AI Mention Gap Analysis" skill via Letaido | Yes: citations, cited pages, fanout | Unverified | Custom Prompts free in paid Ahrefs plans |
| **AthenaHQ** (new) | Essential Free; Starter $295; Enterprise custom | Free 5; Starter 11 (ChatGPT, Perplexity, AIO, AI Mode, Gemini, Claude, Copilot, Grok, DeepSeek, Meta AI, Mistral) | Credit-based: 300 free / 3,600 responses/mo | Benchmarking yes; SOV wording not found | Not stated | Yes: citation intelligence | Enterprise ("Enterprises & Agencies") | **Free tier** |
| **Rankscale** (new) | Essentials $20 (yearly); Pro $99; Pro+ $229; Growth $385; Enterprise $780 | ChatGPT, Perplexity, AI Mode, AIO, Gemini, DeepSeek, Mistral, Claude, Copilot, Grok, Muse Spark | Credit-based: 1,200 / 3,000 / 5,500 / 12,000 credits (≈0.25/engine/prompt); unlimited terms | Benchmarking yes (SOV only for ads) | Partial: fanout "wins and losses" | Yes: citations and sources-box analysis | Yes: 10–100 brand dashboards; white-label (Growth+) | 7-day Pro trial |
| **Goodie** (new) | Core $295; Pro $999; Enterprise demo. Agency Growth $275 | Core 5 (ChatGPT, AIO, Perplexity, AI Mode, Copilot); Pro 8; Enterprise 13 | 110 / 250 / 500+ prompts; 1 brand (multi-brand Enterprise) | Yes ("share of voice relative to competitors") | Not stated | Yes: Deep Citation Analysis | Yes: pitch workspaces; client workspace from $399 | 7-day free trial (Core) |
| **Writesonic GEO** (new) | Annual: Starter $79, Basic $199, Growth $399; Enterprise custom ("from $99/mo") | Starter–Growth: ChatGPT, Gemini, AIO; Enterprise 8 | 50 / 100 / 200 prompts; 1 / 1 / 2 projects | Not stated | **Yes: headline "Find which prompts recommend your competitors instead of you"** | Unverified (only "citation opportunities") | Yes: Agency Starter $200 (20 pitch projects) | Free start, no card |
| **Foremention** (planned) | Core $99; Signal $249 or $299 (main shows $299); Intelligence custom | Cloudflare Workers AI + Bing RSS (no native engine) | 25 / 100 questions; monthly / weekly | No (by design: no market-share estimate) | Draft (PR #355) | **Yes**: Recommendation Records with provenance and human review | Signal: 3 brand workspaces | Beta limited to 10 questions |

## Top 3 product gaps for Foremention

Ranking: number of the 10 surveyed competitors with the feature on their fetched first-party pages, limited to features Foremention lacks.

1. **Native tracking of named AI answer engines (ChatGPT, Perplexity, Gemini, Google AI Overviews/AI Mode): 10/10.** Every vendor tracks at least ChatGPT, and most track 4 to 13 engines. Foremention's own `PROVIDER-SURFACE-TRUTH.md` says its production surface is Cloudflare Workers AI + Bing RSS and "not a native ChatGPT, Gemini or Perplexity observation". This is the most consequential gap, because buyers compare tools on "which engines". Foremention's honest provenance is a real differentiator, but only once a native surface exists. The cheapest credible step is one documented direct API with grounding/citation fields, under the doc's existing 20-question and 10-reviewed-observation promotion gate. That conflicts with the current $0 AI budget, so it needs a decision.
2. **Prompt/question demand research (volume, trends, discovery database): 10/10.** Peec (prompt volume 1–5), Semrush (Prompt Research), Otterly (AI Prompt Research Tool), Ahrefs (475M-prompt index), Profound (Prompt Volumes), AthenaHQ (prompt volume estimation), Rankscale (prompt research, Pro+), Goodie (Prompt Research), Writesonic (AI Search Volume, Basic+), Scrunch (AI Search Trends). Foremention suggests questions from Source Map evidence but has no demand signal to say which buyer questions matter most. It ranks second rather than first only because a lightweight version (prioritising questions, not a 475M-prompt index) is cheaper and less central than engine coverage.
3. **Daily (or more frequent) measurement cadence at entry tiers: 8/10 state it explicitly.** Peec, Semrush, Otterly, Ahrefs, Profound, Goodie and Writesonic say daily; Rankscale offers hourly to monthly. Scrunch and AthenaHQ are volume-based and don't state cadence. Foremention plans **monthly** on Core and **weekly** on Signal. Competitors list cadence directly on their pricing cards, so monthly at $99 reads as thin. A cheaper alternative to daily runs is to explain the cadence through evidence quality (reviewed, comparable runs instead of noisy daily samples) and to offer on-demand re-runs.

Runners-up: agency/multi-client workspaces with pitch/prospect environments and white-label reporting (8/10; Foremention's 3 Signal workspaces cover it partly). AI crawler/agent traffic analytics (7/10: Peec, Otterly, Scrunch, Profound, Ahrefs, Goodie, Writesonic). An explicit share-of-voice metric (5/10 say "share of voice": Peec, Semrush, Otterly, Ahrefs, Goodie). Foremention deliberately avoids market-share estimates, and that should stay a stated methodology choice rather than a gap to close. Free trial or free tier: 8/10 (Semrush has none; Ahrefs only includes Custom Prompts in paid plans).

**Where Foremention is not behind:** the "competitor shows up instead of you" framing is now mainstream. Writesonic leads its pricing page with it, Peec has source-level gap analysis, and Semrush's Competitor Research does the same thing. PR #355 is therefore table stakes, not a differentiator. Its edge has to come from what the 2026-10-11 note already prioritised: per-question evidence (raw answer + returned references + human review), with absent or incomplete answers treated as unknown rather than wins.

## Pricing position vs Core $99 (25 questions) and Signal (100 questions, 3 brands)

Headline list price per tracked prompt/question per month (single brand unless noted; engines and cadence differ, so this is indicative only):

| Plan | $/mo | Prompts | $/prompt | Notes |
|---|---|---|---|---|
| Otterly Lite | 29 | 15 | 1.93 | 4 engines, daily |
| Peec Starter | 95 | 50 | 1.90 | 3 models, daily |
| Writesonic Starter (annual) | 79 | 50 | 1.58 | 3 engines; ~$99 monthly → 1.98 |
| Rankscale Pro | 99 | ~40 daily on 4 engines (1,200 credits) | ~2.48 | multi-brand dashboards (10) |
| Semrush AI Toolkit | 99 | 25 | 3.96 | 3 engines, no trial |
| **Foremention Core** | **99** | **25** | **3.96** | monthly cadence, non-native engine |
| Otterly Standard | 189 | 100 | 1.89 | unlimited workspaces |
| Writesonic Basic (annual) | 199 | 100 | 1.99 | ~$249 monthly → 2.49 |
| Rankscale Pro+ | 229 | ~100 daily on 4 engines (3,000 credits) | ~2.29 | 25 dashboards |
| Peec Pro | 245 | 150 | 1.63 | 2 projects |
| Scrunch Core | 250 | 125 | 2.00 | 1 brand |
| **Foremention Signal @ $249** | **249** | **100 (3 brands)** | **2.49** | weekly cadence |
| AthenaHQ Starter | 295 | 3,600 responses | n/a | 11 models |
| Goodie Core | 295 | 110 | 2.68 | 1 brand, strategist |
| **Foremention Signal @ $299** | **299** | **100 (3 brands)** | **2.99** | weekly cadence |

Readings:
- **Core $99 sits at the market's most crowded price point** (Semrush $99, Rankscale Pro $99, Peec Starter $95, Writesonic ~$99 monthly). Its 25 questions match only Semrush, which offers no trial. Peec, Rankscale and Writesonic give 40–50 prompts, daily cadence and named engines for the same money. Core can only defend $99 on evidence depth and human review. Raise to 50 questions or offer a trial; I would not lower the price.
- **Signal's 100-question / 3-brand band** competes with Otterly Standard $189 (unlimited workspaces), Writesonic Basic $199 annual, Rankscale Pro+ $229, Peec Pro $245 (150 prompts, 2 projects) and Scrunch Core $250 (125 prompts, 1 brand). The $295–$299 band is held by AthenaHQ and Goodie, who bundle 5–11 native engines, content agents and strategist support, and Goodie openly markets against cheaper tiers. Semrush built to 3 brands and ~100 prompts costs about $99 + 2×$60 (125 prompts) + 2×$99 (2 extra domains) ≈ $417. That is the one comparison Signal wins clearly on brand count.

## Recommendation: Signal at **$249**, not $299

- **It lands inside the self-serve cluster.** $245 (Peec Pro) and $250 (Scrunch Core) are the reference points for ~100–150 prompts. $299 puts Signal above every self-serve tool at that volume and level with AthenaHQ and Goodie, which cover far more native engines and include content and strategist services Foremention doesn't offer.
- **Signal is weaker on the dimensions buyers can see.** It has weekly cadence vs everyone's daily, and no native ChatGPT/Gemini/Perplexity surface yet. A premium price needs a visible premium. Evidence provenance and human review are real advantages but hard to see on a pricing card.
- **It gives a cleaner upgrade path from Core.** $99 → $249 is 2.5× the price for 4× the questions and 3× the brands ($3.96 → $2.49 per question). At $299 the per-question discount is smaller ($2.99).
- **The stage favours lower friction.** Both tiers are "proposed, not yet purchasable", Stage-0 priority is customer proof, and there is no willingness-to-pay data. Starting lower and raising later, with grandfathering, is safer than starting at $299 and discounting.
- **When $299 would be right:** once a native engine surface passes the provider-promotion gate and cadence reaches at least daily-equivalent for Signal. Then the 3-brand bundle and evidence depth justify sitting with AthenaHQ and Goodie. Re-test after the first 3 design-partner conversations.

Note: main's `app/pricing/page.tsx` currently shows Signal at $299. If this recommendation is accepted, that page and the matching Paddle product (Foremention Signal) both need changing. That is out of scope here; no commit was made.

## Sources

All claim-level URLs are in the CSV. Pages fetched 2026-10-13: https://peec.ai/pricing · https://peec.ai/pricing-agencies · https://framerusercontent.com/sites/5pnYXBbLKEPLW9G29DMwhJ/3UaZbEy0CJhuDnUxo0-cyyBGZXm9CRelChl6aebHe-E.CI1Ag8ut.mjs · https://www.semrush.com/kb/1493-ai-toolkit · https://www.semrush.com/kb/1503-prompt-tracking · https://otterly.ai/pricing · https://otterly.ai/ · https://scrunch.com/pricing · https://scrunch.com/agencies/ · https://www.tryprofound.com/pricing · https://www.tryprofound.com/solutions/agencies · https://ahrefs.com/brand-radar · https://www.athenahq.ai/pricing · https://rankscale.ai/pricing · https://higoodie.com/pricing · https://writesonic.com/pricing · https://writesonic.com/pricing/agencies · Foremention: https://raw.githubusercontent.com/injamhaqq/foremention/main/app/pricing/page.tsx · https://raw.githubusercontent.com/injamhaqq/foremention/main/docs/PROVIDER-SURFACE-TRUTH.md · https://raw.githubusercontent.com/injamhaqq/foremention/main/lib/question-suggestions.ts

**Not verified:** authenticated product behaviour, data quality, Scrunch/Profound agency prices, Peec agency prices, Semrush One prices, Writesonic monthly-billed prices, and AthenaHQ/Goodie billing basis. Nothing was blocked; no page needed a retry loop.
