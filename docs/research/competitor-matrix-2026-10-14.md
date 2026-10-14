# Foremention competitor matrix (2026-10-14)

**Status:** public desk research. Each rival claim comes from that rival's own pricing page, docs or help centre, fetched on **2026-10-14**. No sign-ups, logins or paid plans were used. The Foremention rows come from the code on `main` (commit `4a133e10`) and the live pricing page, not from marketing copy. This document completes the competitor work in `rea-competitive-investigation-2026-10-13.md` and `rea-public-competitor-observations-2026-10-13.csv`, and uses the same 10 rivals.

**Rivals (10):** Peec AI, Semrush AI Visibility Toolkit, Otterly.AI, Scrunch, Profound, Ahrefs Brand Radar, AthenaHQ, Rankscale, Goodie, Writesonic GEO.

### How to read a cell (always from Foremention's side)

- **Ahead**: Foremention ships it, and the rival's checked pages do not document an equivalent, or document a clearly weaker one. When the only evidence is that a page does not mention the feature, the cell says "Not documented". That means it is absent from public docs, not proven absent from the product.
- **Parity**: both offer a comparable capability. In the rival-capability rows (B1 to B4), Parity can also mean neither side documents the feature.
- **Behind**: both have it, but the rival's version is clearly broader, deeper or more frequent.
- **Absent**: Foremention does not have the capability and the rival does.
- **Unverified**: the rival's public pages did not settle the question. The cell gives the reason.

Source keys such as `[PE1]` and `[FM-limits]` resolve in the **Sources** section at the end. Every source shows its URL and the date accessed (2026-10-14).

### Important baseline facts (from the code, not the pricing page)

- **What actually ships today is "Foundation access":** 10 buyer questions, 1 brand, 1 provider per run, 1 team member, a $2/month AI spend cap and 90-day history [FM-limits]. Core and Signal are labelled "Proposed · not yet purchasable" [FM-pricing-repo, FM-pricing-live].
- **Observation surface:** Cloudflare Workers AI hosted model plus independent Bing Search RSS retrieval. The repo explicitly says this is not a native ChatGPT, Gemini or Perplexity observation [FM-surface].

## At a glance

Status is from Foremention's side. Evidence for every cell is in the detailed tables further down.

| Capability | Peec | Semrush | Otterly | Scrunch | Profound | Ahrefs | AthenaHQ | Rankscale | Goodie | Writesonic |
|---|---|---|---|---|---|---|---|---|---|---|
| Answer-engine coverage (observation surface) | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind |
| Measurement cadence | Behind | Behind | Behind | Unverified | Behind | Behind | Unverified | Behind | Behind | Behind |
| Question (prompt) capacity per price | Behind | Parity | Behind | Behind | Unverified | Unverified | Unverified | Behind | Parity | Behind |
| Question discovery & demand data | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind |
| Competitor tracking & benchmarking | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity |
| "Rival instead of you" per buyer question | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity | Parity |
| Citation / returned-reference capture | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Behind | Unverified |
| Per-observation evidence provenance + human review | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead |
| Comparability-gated change tracking | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead | Ahead |
| Decision & action workflow | Parity | Parity | Parity | Parity | Parity | Unverified | Parity | Ahead | Parity | Parity |
| Exports & sharing | Parity | Parity | Parity | Unverified | Parity | Unverified | Parity | Parity | Unverified | Parity |
| Integrations & data access | Behind | Unverified | Behind | Behind | Behind | Unverified | Behind | Behind | Behind | Behind |
| Team roles & SSO | Behind | Parity | Behind | Behind | Behind | Unverified | Behind | Behind | Behind | Parity |
| Multi-brand / agency | Behind | Parity | Behind | Behind | Behind | Unverified | Behind | Behind | Parity | Behind |
| Locale / market | Behind | Behind | Behind | Parity | Behind | Behind | Parity | Behind | Behind | Parity |
| Alerts | Unverified | Unverified | Parity | Parity | Unverified | Parity | Unverified | Parity | Parity | Parity |
| Free entry | Parity | Ahead | Parity | Parity | Parity | Ahead | Parity | Parity | Parity | Parity |

Rival capabilities Foremention does not have:

| Capability | Peec | Semrush | Otterly | Scrunch | Profound | Ahrefs | AthenaHQ | Rankscale | Goodie | Writesonic |
|---|---|---|---|---|---|---|---|---|---|---|
| Sentiment analysis | Absent | Absent | Absent | Absent | Absent | Absent | Absent | Absent | Absent | Absent |
| AI crawler / agent traffic analytics | Absent | Absent | Absent | Absent | Absent | Absent | Absent | Parity | Absent | Absent |
| Content generation / optimization agents | Behind | Unverified | Behind | Absent | Absent | Behind | Absent | Parity | Absent | Absent |
| Share-of-voice metric | Absent | Absent | Absent | Unverified | Absent | Absent | Absent | Parity | Absent | Unverified |

Cell totals: {'Behind': 74, 'Unverified': 21, 'Parity': 61, 'Ahead': 23, 'Absent': 31} across 210 cells.

## Pricing row (USD, published list prices, accessed 2026-10-14)

| Vendor | Published tiers | Source |
|---|---|---|
| **Foremention** | Core $99/mo (25 questions, monthly, 1 brand); Signal **$299/mo on the live site** but **$249 in `main`** (see note); Intelligence custom. Both paid tiers are "Proposed · not yet purchasable". | [FM-pricing-live, FM-pricing-repo] |
| Peec AI | Starter $95 / Pro $245 / Advanced $495 (monthly; $80/$205/$420 annual); Enterprise custom | [PE2] |
| Semrush AI Visibility Toolkit | $99/mo; +50 prompts $60; extra user $99; extra domain $99; no trial | [SE1] |
| Otterly.AI | Lite $29 / Standard $189 / Premium $489 (annual $25/$160/$422); Enterprise custom | [OT1] |
| Scrunch | Core $250/mo; Enterprise custom | [SC1] |
| Profound | Free 7-day trial; Enterprise custom (no public price) | [PR1] |
| Ahrefs Brand Radar | Custom Prompts from $50/mo ($699 all models); AI Visibility Index $199/mo | [AH1] |
| AthenaHQ | Essential free; Starter $295/mo; Enterprise custom | [AT1] |
| Rankscale | Essentials $20 (yearly) / Pro $99 / Pro+ $229 / Growth $385 / Enterprise $780 | [RS1] |
| Goodie | Core $295 / Pro $999; Enterprise demo; Agency Growth $275 | [GO1] |
| Writesonic GEO | Starter $79 / Basic $199 / Growth $399 (annual billing); Enterprise custom | [WS1] |


**Pricing discrepancy to fix:** the live site shows Signal at **$299/month** [FM-pricing-live], but `app/pricing/page.tsx` on `main` still says **$249/month** [FM-pricing-repo]. Commit `4a133e10` ("Revert #579: keep Signal at $299…", #580) contains **no file changes**, so the #579 change to $249 is still on `main`. The next deploy from `main` would publish $249 unless this is fixed.

**Price position, in brief:** Core at $99 sits in the most crowded price band. Semrush is $99 [SE1], Rankscale Pro $99 [RS1], Peec Starter $95 [PE2], and Writesonic Starter $79 billed annually [WS1]. Of these, only Semrush matches Core's 25 prompts [SE1]; Peec gives 50 [PE1] and Writesonic 50 [WS1]. Signal at $249 to $299 for 100 questions and 3 brands sits beside Peec Pro at $245 with 150 prompts [PE2], Scrunch Core at $250 with 125 prompts [SC1], and AthenaHQ and Goodie at $295 [AT1, GO1].

## Where Foremention is ahead (top 5)

Only two areas are clear wins against all 10 rivals. Items 3 to 5 are narrow.

1. **Evidence provenance and human review for each observation (A8, Ahead 10/10).** Each Recommendation Record keeps the question version, exact provider/model, answer, returned reference, retrievability, observed evidence, review state and limitations. Missing evidence stays "unknown" [FM-truth, FM-brief]. No rival documents human review of observations. Profound's "human-in-the-loop checkpoints" cover content output only [PR4], and AthenaHQ's discrepancy detection is automated [AT1].
2. **Change tracking gated on comparability (A9, Ahead 10/10).** A change is only reported when question version, locale/market and provider/model match between runs [FM-manifest, FM-compar]. Rivals show daily trend lines without a documented equivalence check (e.g. [PR3], [SE2]).
3. **Free entry against the two SEO suites (A17).** Semrush's toolkit has no free trial [SE1], and Ahrefs Custom Prompts come only inside paid Ahrefs plans [AH1]. Foremention offers free 10-question access with no card [FM-readme, FM-limits]. The other 8 rivals offer trials or free tiers, so this is parity with them.
4. **A decision record, not just a recommendation list (A10).** A human-approved Change Specification starts at "insufficient evidence" until review supports something stronger [FM-truth, FM-change]. Rivals do have action and recommendation features (Parity in 8 of 10 cells), so the difference is in how decisions are governed, not in having actions at all. It counts as Ahead only against Rankscale, whose pricing page lists no action feature [RS1].
5. **CRM and docs integrations: HubSpot, Notion, Google Sheets, signed webhooks [FM-integr, FM-webhooks].** No rival page fetched for this matrix mentions HubSpot or Notion (text search of all fetched pages). This is a narrow edge: rivals are ahead on API, MCP and BI access (A12, Behind 8/10).

## Biggest gaps (top 5)

1. **Native answer-engine coverage (A1, Behind 10/10).** Every rival tracks ChatGPT natively, along with 3 to 13 engines [PE1, SE2, OT1, SC1, PR1, AH1, AT1, RS1, GO1, WS1]. Foremention has one non-native hosted-model surface [FM-surface].
2. **Paid tiers can't be bought, and the shipped tier is small (A3, A13, pricing).** Paid plans are "not yet purchasable" [FM-pricing-repo]. What ships is 10 questions and 1 seat [FM-limits]. Every rival except Profound publishes a self-serve price (pricing table), and most include unlimited seats [PE1, OT1, PR1, AT1, RS1, GO1].
3. **Cadence (A2, Behind 8/10, 2 Unverified).** Rivals run daily (Rankscale hourly to monthly) [PE1, SE2, OT1, PR1, AH1, RS1, GO1, WS1]. Foremention offers weekly, biweekly or monthly [FM-sched].
4. **Prompt demand / discovery data (A4, Behind 10/10).** Every rival sells prompt volume or prompt research [PE1, SE1, OT1, SC1, PR4, AH1, AT1, RS1, GO1, WS1]. Foremention suggests questions from Source Map evidence and has no demand signal [FM-qs].
5. **Sentiment and AI-crawler analytics (B1 Absent 10/10; B2 Absent 9/10, Rankscale doesn't document it either).** Runners-up: API/MCP/BI data access (A12), agency pitch and white-label workspaces (A14), and content-generation agents (B3).

**What does not differentiate:** the "rival shows up instead of you" view (merged in #578) is now standard. All 10 rivals document a version of it (A6, Parity 10/10). Its edge is only that it is built from reviewed evidence from the same run [FM-brief].

## Positioning wedge, sales talking points, investor summary

*Founder goal (stated 2026-10-14): land the first 20 paying customers and become investor-ready. The points below stick to what the sources support. Lines marked "inferred" are judgment calls, not sourced facts.*

### Positioning wedge

- **Where we clearly win:** evidence a buyer can audit, for each buyer question. Each answer is a Record with provenance and human review [FM-truth]; changes are only claimed between comparable runs [FM-compar]; the output is a human-approved Change Specification [FM-change]. No rival's public docs describe human review of observations or a comparability gate (A8, A9: 10/10 Ahead).
- **Who it matters to:** the working ICP hypothesis is English-language, growth-stage B2B software companies, with a CMO, VP Marketing/Growth, SEO/organic lead or product marketing lead as buyer. This is labelled **HYPOTHESIS, not proven** [FM-icp]. *Inferred:* the wedge fits best where a team has to defend an AI-search change to leadership or legal, so a sourced, reviewed record is worth more to them than a daily trend line.
- **Where not to compete (yet):** engine breadth, cadence, prompt volume, sentiment and crawler analytics (A1, A2, A4, B1, B2). Rivals are far ahead on all of them.

### Three sales talking points against the strongest rivals

1. **Against Semrush AI Visibility Toolkit (same $99, same 25 prompts):** "Same price and question count, but you can start free (Semrush has no trial), and every answer is a reviewable record, not just a position number." Sources: Semrush $99, 25 prompts, no free trial [SE1]; Foremention free 10-question access [FM-readme, FM-limits], Record with review state [FM-truth]. *Guardrail:* Semrush tracks ChatGPT Search, AI Mode and Gemini natively [SE2]. Do not claim engine parity.
2. **Against Peec AI / Otterly.AI (share-of-voice dashboards, $95 to $245 and $29 to $489):** "They give you share of voice and sentiment. We give you the exact answer, the sources it returned, who reviewed it, and we won't call something a change unless the two runs are actually comparable." Sources: Peec SOV and sentiment [PE1], Otterly Share of AI Voice [OT2]; Foremention review and provenance [FM-truth], comparability gate [FM-compar, FM-manifest]. *Guardrail:* both run daily on 3 to 4+ engines [PE1, OT1].
3. **Against Profound (category leader at the enterprise end):** "Profound is custom-priced enterprise software with a 7-day trial. We publish a $99 entry price, and our 'rival instead of you' view only uses reviewed evidence from the same run." Sources: Profound trial plus custom Enterprise pricing [PR1]; Foremention $99 Core [FM-pricing-live], same-run reviewed packet [FM-brief]. *Guardrails:* Profound captures answers from the browser [PR5] and covers up to 9 engines [PR1]. Also, Foremention paid checkout is not live yet [FM-pricing-repo], so sell this as a design-partner offer.

**Global guardrail:** until a native engine passes the repo's promotion gate, never say "we track ChatGPT/Gemini/Perplexity" [FM-surface].

### Investor-facing competitive summary (one paragraph)

AI-visibility tracking is crowded and commoditising fast. All 10 vendors we checked publish a price or a free trial, with self-serve list prices from $20 to $999/month (pricing table). All 10 track ChatGPT natively [A1 sources], and all 10 now sell a "competitor shows up instead of you" view [A6 sources]. Foremention does not compete on engine breadth or measurement frequency, where it is behind: it has one hosted-model observation surface and weekly/monthly cadence [FM-surface, FM-sched]. Its wedge is an evidence layer that no rival's public documentation describes. That layer has three parts: per-buyer-question Recommendation Records with source provenance and human review, change claims only between comparable runs, and a human-approved Change Specification as the output [FM-truth, FM-compar, FM-change]. The next steps are to certify one native engine under the repo's documented 20-question / 10-reviewed-observation gate [FM-surface], open paid checkout (Core and Signal are not yet purchasable [FM-pricing-repo]), and test the wedge with the first 20 paying customers. The ICP and willingness to pay are still explicitly hypotheses [FM-icp].

## Detailed matrix: Foremention capabilities (derived from code at `main@4a133e10`)

### A1. Answer-engine coverage (observation surface)

Foremention: Production: 1 hosted model (Cloudflare Workers AI) + independent Bing Search RSS retrieval; explicitly *not* a native ChatGPT/Gemini/Perplexity observation. Adapters for OpenAI, Gemini, Anthropic, Perplexity exist in code but are not certified. Shipped tier = 1 provider per run. [FM-surface, FM-limits, FM-providers]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Choose 3 of 8 incl. ChatGPT, AI Overviews, Perplexity; Enterprise up to 13 [PE1] |
| Semrush AI Visibility Toolkit | **Behind** | ChatGPT Search, Google AI Mode, Gemini [SE2] |
| Otterly.AI | **Behind** | 4 base (ChatGPT, AIO, Perplexity, Copilot) + AI Mode/Gemini/Claude add-ons [OT1] |
| Scrunch | **Behind** | Core 4; Enterprise 9 [SC1] |
| Profound | **Behind** | Trial 3, Enterprise up to 9; says it captures from the browser, not API [PR1, PR5] |
| Ahrefs Brand Radar | **Behind** | AIO, AI Mode, ChatGPT, Perplexity, Gemini, Copilot (+Claude for Custom Prompts) [AH1] |
| AthenaHQ | **Behind** | Free 5, Starter 11 models [AT1] |
| Rankscale | **Behind** | ChatGPT, Perplexity, AI Mode, AIO, Gemini, DeepSeek, Mistral, Claude, Copilot, Grok, Meta [RS1] |
| Goodie | **Behind** | Core 5 / Pro 8 / Enterprise 13 [GO1] |
| Writesonic GEO | **Behind** | Starter–Growth 3 (ChatGPT, Gemini, AIO); Enterprise 8 [WS1] |

### A2. Measurement cadence

Foremention: Schedules support weekly / biweekly / monthly only. Planned Core = monthly, Signal = weekly. [FM-sched, FM-pricing-repo]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Daily tracking [PE1] |
| Semrush AI Visibility Toolkit | **Behind** | Daily [SE2] |
| Otterly.AI | **Behind** | Daily [OT1] |
| Scrunch | **Unverified** | Pricing page lists 5,000 responses/mo but no cadence [SC1] |
| Profound | **Behind** | Daily [PR1] |
| Ahrefs Brand Radar | **Behind** | Daily, weekly or monthly [AH1] |
| AthenaHQ | **Unverified** | Credit-based (1 credit = 1 response); cadence not stated [AT1] |
| Rankscale | **Behind** | Hourly to monthly [RS1] |
| Goodie | **Behind** | Daily collection [GO1] |
| Writesonic GEO | **Behind** | Daily [WS1] |

### A3. Question (prompt) capacity per price

Foremention: Shipped today (Foundation access): 10 buyer questions, 1 brand, 1 provider/run, 1 team member, $2/mo AI spend cap, 90-day history. Planned: Core 25 questions/$99; Signal 100 questions + 3 brands. [FM-limits, FM-pricing-repo]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Starter 50 prompts at $95 [PE1, PE2] |
| Semrush AI Visibility Toolkit | **Parity** | 25 prompts at $99 (same count as Core) [SE1] |
| Otterly.AI | **Behind** | 15 at $29; 100 at $189 [OT1] |
| Scrunch | **Behind** | 125 prompts at $250 (1 brand) [SC1] |
| Profound | **Unverified** | Enterprise prompt plans are custom; no public price [PR1] |
| Ahrefs Brand Radar | **Unverified** | 5/10/20 prompts bundled with Ahrefs Lite/Std/Adv; base Ahrefs plan prices not on this page [AH1] |
| AthenaHQ | **Unverified** | Credit-based (3,600 responses at $295); not convertible to questions without engine count [AT1] |
| Rankscale | **Behind** | 1,200 credits at $99 ≈ 0.25 credit/engine/prompt [RS1] |
| Goodie | **Parity** | 110 prompts at $295 for 1 brand vs Signal 100 prompts / 3 brands [GO1] |
| Writesonic GEO | **Behind** | 50 prompts at $79 (annual billing) [WS1] |

### A4. Question discovery & demand data

Foremention: Suggestions generated from Source Map evidence; no prompt-volume/demand signal. [FM-qs]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Prompt volume (1–5) + prompt suggestions [PE1] |
| Semrush AI Visibility Toolkit | **Behind** | Prompt Research report [SE1] |
| Otterly.AI | **Behind** | AI Prompt Research Tool [OT1] |
| Scrunch | **Behind** | AI Search Trends (3 topics on Core) [SC1] |
| Profound | **Behind** | Prompt Volumes from real-user panel [PR4] |
| Ahrefs Brand Radar | **Behind** | 475M+ prompt database [AH1] |
| AthenaHQ | **Behind** | Prompt Volume Estimation & Analysis [AT1] |
| Rankscale | **Behind** | Prompt research (Pro+) [RS1] |
| Goodie | **Behind** | Prompt Research [GO1] |
| Writesonic GEO | **Behind** | AI search volume & trends [WS1] |

### A5. Competitor tracking & benchmarking

Foremention: Competitors workspace, competitor-vs-brand diagnosis on persisted Records, `competitor_overtook` alert. [FM-gap, FM-alerts]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Parity** | SOV/position tracked daily vs competitors [PE1] |
| Semrush AI Visibility Toolkit | **Parity** | Competitor Research report [SE1] |
| Otterly.AI | **Parity** | Competitive benchmarking reports [OT2] |
| Scrunch | **Parity** | 5 competitors on Core; benchmarking [SC1] |
| Profound | **Parity** | Competitive presence [PR1] |
| Ahrefs Brand Radar | **Parity** | AI Share of Voice vs competitors [AH1] |
| AthenaHQ | **Parity** | Unlimited competitor tracking & benchmarking [AT1] |
| Rankscale | **Parity** | Competitor benchmarking [RS1] |
| Goodie | **Parity** | Competitor & industry benchmarking [GO1] |
| Writesonic GEO | **Parity** | Competitor recommendation view [WS1] |

### A6. "Rival instead of you" per buyer question

Foremention: Merged in #578: per-question packet showing where a competitor appeared and the brand did not, built only from finalized, reviewed answers and same-run reviewed sources; fail-closed when evidence is incomplete. [FM-brief, FM-gap]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Parity** | Gap analysis: sources that name competitors but not you [PE1] |
| Semrush AI Visibility Toolkit | **Parity** | Prompts "where others are getting cited but you aren't" [SE1] |
| Otterly.AI | **Parity** | Content gaps "where competitors get cited but they don't" [OT2] |
| Scrunch | **Parity** | Shows where competitors outperform you; automated gap notifications [SC3] |
| Profound | **Parity** | Prompts that "return competitor citations but not yours" [PR3] |
| Ahrefs Brand Radar | **Parity** | "AI Mention Gap Analysis" offered as an Ahrefs-built Letaido skill (not a core report) [AH1] |
| AthenaHQ | **Parity** | Mention Gap / Citation Gap columns; "Where [Competitor] leads" [AT2, AT3] |
| Rankscale | **Parity** | Query fanout "wins and losses" per prompt [RS1] |
| Goodie | **Parity** | "which prompts cite them but not you" [GO2] |
| Writesonic GEO | **Parity** | Pricing headline: prompts that recommend competitors instead of you [WS1] |

### A7. Citation / returned-reference capture

Foremention: Stores returned references per answer and separates them from independently retrieved (Bing RSS) URLs; source numbers checked against the retrieved set. Not native engine citations. [FM-surface, FM-brief]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | URL/domain citation share, source classification [PE1] |
| Semrush AI Visibility Toolkit | **Behind** | Sources report + AI answer snapshots [SE2] |
| Otterly.AI | **Behind** | Link Citations Analysis [OT1] |
| Scrunch | **Behind** | Citations / Sources [SC1] |
| Profound | **Behind** | Every cited URL per prompt, citation share [PR3] |
| Ahrefs Brand Radar | **Behind** | Citations, cited pages, fanout [AH1] |
| AthenaHQ | **Behind** | Citation intelligence [AT1] |
| Rankscale | **Behind** | Citations + sources-box analysis [RS1] |
| Goodie | **Behind** | Deep Citation Analysis [GO1] |
| Writesonic GEO | **Unverified** | Only "citation opportunities" mentioned; no source-level view itemized [WS1] |

### A8. Per-observation evidence provenance + human review

Foremention: Each Record keeps question version, exact provider/model, answer, returned reference, retrievability, observed evidence, human review state, limitations, comparison eligibility; absent/incomplete answers stay unknown, never a win. [FM-truth, FM-brief, FM-surface]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Ahead** | No human review/approval of observations documented [PE1] |
| Semrush AI Visibility Toolkit | **Ahead** | No human review of observations documented [SE1, SE2] |
| Otterly.AI | **Ahead** | Not documented [OT1] |
| Scrunch | **Ahead** | Not documented [SC1] |
| Profound | **Ahead** | "Human-in-the-loop checkpoints" documented only for content output, not for evidence [PR4] |
| Ahrefs Brand Radar | **Ahead** | Not documented [AH1] |
| AthenaHQ | **Ahead** | Automated claim-discrepancy detection is listed, not human review [AT1] |
| Rankscale | **Ahead** | Not documented [RS1] |
| Goodie | **Ahead** | Not documented [GO1] |
| Writesonic GEO | **Ahead** | Not documented [WS1] |

### A9. Comparability-gated change tracking

Foremention: Run comparison only when question version, locale/market, provider/model and method match; otherwise marked not comparable. [FM-manifest, FM-compar]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Ahead** | Daily trend tracking; no comparability gate documented [PE1] |
| Semrush AI Visibility Toolkit | **Ahead** | Daily position changes; no gate documented [SE2] |
| Otterly.AI | **Ahead** | Not documented [OT1] |
| Scrunch | **Ahead** | Not documented [SC1] |
| Profound | **Ahead** | Day-over-day charts; no gate documented [PR3] |
| Ahrefs Brand Radar | **Ahead** | Not documented [AH1] |
| AthenaHQ | **Ahead** | Not documented [AT1] |
| Rankscale | **Ahead** | Trends over time; no gate documented [RS1] |
| Goodie | **Ahead** | Historical trends; no gate documented [GO2] |
| Writesonic GEO | **Ahead** | Not documented [WS1] |

### A10. Decision & action workflow

Foremention: Opportunities → Change Specification (human decision; safe defaults Eligibility UNKNOWN / Decision INSUFFICIENT_EVIDENCE) → evidence-bound brief templates (comparison, FAQ, source page) that a person drafts. [FM-truth, FM-change, FM-resolution]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Parity** | Agent actions: ranked opportunities from your data [PE1] |
| Semrush AI Visibility Toolkit | **Parity** | AI-generated strategic recommendations (Brand Performance) [SE1] |
| Otterly.AI | **Parity** | Recommendations (3/week on Lite; unlimited Standard+) [OT1] |
| Scrunch | **Parity** | Insights & Recommendations [SC1] |
| Profound | **Parity** | Agents act on gaps [PR4] |
| Ahrefs Brand Radar | **Unverified** | Brand Radar page lists automations via Letaido, no recommendation feature itemized [AH1] |
| AthenaHQ | **Parity** | Content recommendations, Action Center [AT1] |
| Rankscale | **Ahead** | No recommendation/action feature on pricing page (page audits only) [RS1] |
| Goodie | **Parity** | Optimization Actions [GO1] |
| Writesonic GEO | **Parity** | Action Center (Enterprise) [WS1] |

### A11. Exports & sharing

Foremention: CSV exports (Record, Source Map), full workspace ZIP export, print views, expiring revocable Record share links (14-day default, 90 max). [FM-export, FM-share]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Parity** | CSV exports, shareable dashboards [PE1] |
| Semrush AI Visibility Toolkit | **Parity** | CSV exports, scheduled email exports [SE1, SE2] |
| Otterly.AI | **Parity** | Detailed reports & export [OT1] |
| Scrunch | **Unverified** | Exports not itemized on pricing page [SC1] |
| Profound | **Parity** | CSV/JSON exports (Enterprise; none on trial) [PR1] |
| Ahrefs Brand Radar | **Unverified** | Export only mentioned in a testimonial [AH1] |
| AthenaHQ | **Parity** | CSV export [AT1] |
| Rankscale | **Parity** | CSV/Sheets export, shareable links [RS1] |
| Goodie | **Unverified** | Export access rows render ambiguously by tier [GO1] |
| Writesonic GEO | **Parity** | Shareable audit reports, Looker Studio [WS1, WS2] |

### A12. Integrations & data access

Foremention: HubSpot, Notion, Google Sheets (OAuth) and signed outbound webhooks. No public read API, MCP server or BI connector. [FM-integr, FM-webhooks]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | API, MCP, Looker Studio, log-source webhooks [PE1] |
| Semrush AI Visibility Toolkit | **Unverified** | Semrush API/MCP exist suite-wide; AI Toolkit data access not stated [SE1] |
| Otterly.AI | **Behind** | API, MCP, Looker Studio connector [OT1] |
| Scrunch | **Behind** | Looker Studio, Query API, MCP [SC1] |
| Profound | **Behind** | API (Enterprise) [PR1] |
| Ahrefs Brand Radar | **Unverified** | Ahrefs API/MCP/Data Studio exist; Brand Radar coverage not stated [AH1] |
| AthenaHQ | **Behind** | API add-on, GA4/GSC, BI tools, Shopify/Webflow [AT1] |
| Rankscale | **Behind** | REST API, MCP, Sheets, Looker Studio [RS1] |
| Goodie | **Behind** | MCP + API [GO1] |
| Writesonic GEO | **Behind** | Looker Studio & other integrations, MCP [WS1] |

### A13. Team roles & SSO

Foremention: 6 roles (owner, admin, analyst, reviewer, viewer, stakeholder), invitations, domain SSO when configured. Shipped tier = 1 team member. [FM-roles, FM-sso, FM-limits]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Unlimited users; RBAC; SSO (Enterprise) [PE1] |
| Semrush AI Visibility Toolkit | **Parity** | Extra users $99 each [SE1] |
| Otterly.AI | **Behind** | Unlimited team members; SSO Enterprise [OT1] |
| Scrunch | **Behind** | 5 licenses + Google SSO on Core [SC1] |
| Profound | **Behind** | Unlimited seats; SSO Enterprise [PR1] |
| Ahrefs Brand Radar | **Unverified** | Seat terms not on Brand Radar page [AH1] |
| AthenaHQ | **Behind** | Unlimited RBAC; SAML SSO [AT1] |
| Rankscale | **Behind** | Unlimited seats [RS1] |
| Goodie | **Behind** | Unlimited seats [GO1] |
| Writesonic GEO | **Parity** | 1/2/3 users self-serve; SSO Enterprise [WS1] |

### A14. Multi-brand / agency

Foremention: Planned Signal: up to 3 brand workspaces. Shipped: 1 brand. No pitch workspaces or white-label. [FM-pricing-repo, FM-limits]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | 1/2/5 projects; agency pricing with white-label reporting [PE1, PE3] |
| Semrush AI Visibility Toolkit | **Parity** | Each extra domain $99/mo [SE1] |
| Otterly.AI | **Behind** | Unlimited workspaces (Standard+), pitch workspaces [OT1] |
| Scrunch | **Behind** | Multi-client, prospecting environments, white-label [SC2] |
| Profound | **Behind** | Centralized client management [PR2] |
| Ahrefs Brand Radar | **Unverified** | No agency plan stated [AH1] |
| AthenaHQ | **Behind** | Enterprise for agencies [AT1] |
| Rankscale | **Behind** | 10–100 brand dashboards; white-label (Growth+) [RS1] |
| Goodie | **Parity** | Core/Pro 1 brand (Signal plans 3) but agency pitch workspaces from $275 [GO1] |
| Writesonic GEO | **Behind** | Agency plan: 20 pitch projects, white-label [WS2] |

### A15. Locale / market

Foremention: Locale + market recorded per question version and enforced in comparisons; multi-market only in custom Intelligence scope. [FM-manifest, FM-pricing-repo]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Multi-country (Advanced) [PE1] |
| Semrush AI Visibility Toolkit | **Behind** | Location + language per prompt [SE2] |
| Otterly.AI | **Behind** | 50+ countries [OT1] |
| Scrunch | **Parity** | 1 country on Core [SC1] |
| Profound | **Behind** | 30+ languages, 150+ regions [PR5] |
| Ahrefs Brand Radar | **Behind** | Per-location checks [AH1] |
| AthenaHQ | **Parity** | Multi-region Enterprise-only [AT1] |
| Rankscale | **Behind** | All regions [RS1] |
| Goodie | **Behind** | 2 countries/languages on Core [GO1] |
| Writesonic GEO | **Parity** | Custom regions on Enterprise [WS1] |

### A16. Alerts

Foremention: Email alerts: first run completed, new source, lost source, competitor overtook, mention, weekly digest. [FM-alerts]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Unverified** | Automated reporting listed; alerts not stated [PE1] |
| Semrush AI Visibility Toolkit | **Unverified** | Scheduled email exports only [SE2] |
| Otterly.AI | **Parity** | Alerts when brand mentions change [OT2] |
| Scrunch | **Parity** | Automatic notification when competitors gain [SC3] |
| Profound | **Unverified** | Only usage-limit notifications stated [PR1] |
| Ahrefs Brand Radar | **Parity** | Alerts via Letaido automations [AH1] |
| AthenaHQ | **Unverified** | Not on pricing page [AT1] |
| Rankscale | **Parity** | Notifications [RS1] |
| Goodie | **Parity** | Spot sudden drops / shifts [GO2] |
| Writesonic GEO | **Parity** | Alerts [WS1] |

### A17. Free entry

Foremention: Free Foundation/beta access (10 questions, no card). Paid tiers shown as "Proposed · not yet purchasable". [FM-readme, FM-pricing-repo, FM-limits]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Parity** | Free trial [PE1] |
| Semrush AI Visibility Toolkit | **Ahead** | "does not offer a free trial" [SE1] |
| Otterly.AI | **Parity** | 7-day free trial [OT2] |
| Scrunch | **Parity** | 7-day free trial [SC1] |
| Profound | **Parity** | 7-day free trial [PR1] |
| Ahrefs Brand Radar | **Ahead** | Custom Prompts only inside paid Ahrefs plans [AH1] |
| AthenaHQ | **Parity** | Free Essential tier [AT1] |
| Rankscale | **Parity** | 7-day Pro trial [RS1] |
| Goodie | **Parity** | 7-day trial (Core) [GO1] |
| Writesonic GEO | **Parity** | Start free, no card [WS1] |

## Detailed matrix: rival capabilities Foremention lacks

### B1. Sentiment analysis

Foremention: None in code (no sentiment field or module). [FM-providers]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Absent** | Sentiment tracked [PE1] |
| Semrush AI Visibility Toolkit | **Absent** | Brand Performance sentiment [SE1] |
| Otterly.AI | **Absent** | Sentiment analysis [OT2] |
| Scrunch | **Absent** | Sentiment Analysis [SC1] |
| Profound | **Absent** | Sentiment [PR1] |
| Ahrefs Brand Radar | **Absent** | AI Brand Sentiment skill [AH1] |
| AthenaHQ | **Absent** | Real-time sentiment (Enterprise) [AT1] |
| Rankscale | **Absent** | Sentiment analysis [RS1] |
| Goodie | **Absent** | Brand sentiment tracking [GO1] |
| Writesonic GEO | **Absent** | Sentiment (Growth) [WS1] |

### B2. AI crawler / agent traffic analytics

Foremention: None; only robots rules for Foremention's own site. [FM-robots]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Absent** | Agent analytics, crawlability audit [PE1] |
| Semrush AI Visibility Toolkit | **Absent** | Site audit for AI-crawler blockers [SE1] |
| Otterly.AI | **Absent** | Agent Analytics (Standard+) [OT1] |
| Scrunch | **Absent** | AI Agent / Bot Traffic [SC1] |
| Profound | **Absent** | Agent Analytics [PR1] |
| Ahrefs Brand Radar | **Absent** | AI traffic & bot analytics [AH1] |
| AthenaHQ | **Absent** | Smart robots.txt / llms.txt management [AT1] |
| Rankscale | **Parity** | Neither documents it (page audits only) [RS1] |
| Goodie | **Absent** | AI Agent Analytics [GO1] |
| Writesonic GEO | **Absent** | AI Agent Analytics [WS1] |

### B3. Content generation / optimization agents

Foremention: Brief templates only, drafted by a person from linked evidence; no generated content. [FM-resolution]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Behind** | Agent actions and skills [PE1] |
| Semrush AI Visibility Toolkit | **Unverified** | Content tools are suite-level, not part of the Toolkit [SE1] |
| Otterly.AI | **Behind** | Content Audit and Content Briefs [OT2] |
| Scrunch | **Absent** | Page Optimizations, Agent Experience Platform [SC1] |
| Profound | **Absent** | Agents create and publish content [PR4] |
| Ahrefs Brand Radar | **Behind** | AI Content Helper / Letaido [AH1] |
| AthenaHQ | **Absent** | Content optimization agent [AT1] |
| Rankscale | **Parity** | Neither documents it [RS1] |
| Goodie | **Absent** | Content Studio [GO1] |
| Writesonic GEO | **Absent** | 15 AI articles/mo + agents [WS1] |

### B4. Share-of-voice metric

Foremention: Deliberately none (no market-share estimates); a methodology choice. [FM-prior]

| Rival | Status | Evidence |
|---|---|---|
| Peec AI | **Absent** | Share of voice [PE1] |
| Semrush AI Visibility Toolkit | **Absent** | SOV in Brand Performance (not in Prompt Tracking) [SE1] |
| Otterly.AI | **Absent** | Share of AI Voice [OT2] |
| Scrunch | **Unverified** | Not on pricing page [SC1] |
| Profound | **Absent** | Citation share vs competitors [PR3] |
| Ahrefs Brand Radar | **Absent** | AI Share of Voice [AH1] |
| AthenaHQ | **Absent** | SOV in head-to-head view [AT3] |
| Rankscale | **Parity** | SOV only for sponsored ads [RS1] |
| Goodie | **Absent** | Share of voice vs competitors [GO1] |
| Writesonic GEO | **Unverified** | Not stated [WS1] |


## Caveats

- Vendor pages show advertised capability, not verified product quality. Nothing was tested behind a login.
- "Not documented" cells mean a feature is missing from public pages. Rivals may have it in the product.
- Peec renders prices with JavaScript. Prices were read from the pricing component bundle that peec.ai/pricing loads [PE2]; the figures match the 2026-10-13 capture.
- Writesonic prices are billed annually. AthenaHQ ($295) and Goodie ($295/$999) have a monthly/annual toggle, and the static fetch could not confirm which basis is shown.
- Otterly states both a 7-day and a 14-day trial on the same homepage [OT2].
- Rivals' AI-shopping and ads tracking (e.g. Otterly ChatGPT Ads [OT1], Goodie Agentic Commerce [GO1]) were left out as not relevant to the B2B-software ICP.

## Sources

Every rival page was fetched on **2026-10-14** (accessed date). Foremention sources are pinned to commit `4a133e10` on `main` (accessed 2026-10-14).

- **[AH1]** https://ahrefs.com/brand-radar: accessed 2026-10-14
- **[AT1]** https://www.athenahq.ai/pricing: accessed 2026-10-14
- **[AT2]** https://docs.athenahq.ai/guides/prompts: accessed 2026-10-14
- **[AT3]** https://docs.athenahq.ai/guides/competitors: accessed 2026-10-14
- **[GO1]** https://higoodie.com/pricing: accessed 2026-10-14
- **[GO2]** https://higoodie.com/features/ai-visibility-monitoring/: accessed 2026-10-14
- **[OT1]** https://otterly.ai/pricing: accessed 2026-10-14
- **[OT2]** https://otterly.ai/: accessed 2026-10-14
- **[PE1]** https://peec.ai/pricing: accessed 2026-10-14
- **[PE2]** https://framerusercontent.com/sites/5pnYXBbLKEPLW9G29DMwhJ/3UaZbEy0CJhuDnUxo0-cyyBGZXm9CRelChl6aebHe-E.CI1Ag8ut.mjs (pricing component bundle loaded by peec.ai/pricing; prices render client-side): accessed 2026-10-14
- **[PE3]** https://peec.ai/pricing-agencies: accessed 2026-10-14
- **[PR1]** https://www.tryprofound.com/pricing: accessed 2026-10-14
- **[PR2]** https://www.tryprofound.com/solutions/agencies: accessed 2026-10-14
- **[PR3]** https://www.tryprofound.com/features/answer-engine-insights/citations: accessed 2026-10-14
- **[PR4]** https://www.tryprofound.com/features: accessed 2026-10-14
- **[PR5]** https://www.tryprofound.com/features/answer-engine-insights: accessed 2026-10-14
- **[RS1]** https://rankscale.ai/pricing: accessed 2026-10-14
- **[SC1]** https://scrunch.com/pricing: accessed 2026-10-14
- **[SC2]** https://scrunch.com/agencies/: accessed 2026-10-14
- **[SC3]** https://scrunch.com/faqs/can-scrunch-identify-where-competitors-are-gaining-visibility-in-ai-search: accessed 2026-10-14
- **[SE1]** https://www.semrush.com/kb/1493-ai-visibility-toolkit: accessed 2026-10-14
- **[SE2]** https://www.semrush.com/kb/1503-prompt-tracking: accessed 2026-10-14
- **[WS1]** https://writesonic.com/pricing: accessed 2026-10-14
- **[WS2]** https://writesonic.com/pricing/agencies: accessed 2026-10-14
- **[FM-alerts]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/workspace-email-alerts.ts: accessed 2026-10-14
- **[FM-brief]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/buyer-question-brief-core.ts: accessed 2026-10-14
- **[FM-change]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/change-specification.ts: accessed 2026-10-14
- **[FM-compar]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/run-pair-comparability.ts: accessed 2026-10-14
- **[FM-export]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/workspace-export.ts: accessed 2026-10-14
- **[FM-gap]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/recommendation-gap.ts: accessed 2026-10-14
- **[FM-icp]** https://github.com/injamhaqq/foremention/blob/4a133e10/docs/company-evidence/ICP-EVIDENCE.md: accessed 2026-10-14
- **[FM-integr]** https://github.com/injamhaqq/foremention/blob/4a133e10/app/api/integrations: accessed 2026-10-14
- **[FM-limits]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/product-limits.ts: accessed 2026-10-14
- **[FM-manifest]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/run-manifest.ts: accessed 2026-10-14
- **[FM-pricing-live]** https://foremention.com/pricing: accessed 2026-10-14
- **[FM-pricing-repo]** https://github.com/injamhaqq/foremention/blob/4a133e10/app/pricing/page.tsx: accessed 2026-10-14
- **[FM-prior]** https://github.com/injamhaqq/foremention/blob/4a133e10/docs/research/rea-competitive-investigation-2026-10-13.md: accessed 2026-10-14
- **[FM-providers]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/providers: accessed 2026-10-14
- **[FM-qs]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/question-suggestions.ts: accessed 2026-10-14
- **[FM-readme]** https://github.com/injamhaqq/foremention/blob/4a133e10/README.md: accessed 2026-10-14
- **[FM-resolution]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/resolution-engine.ts: accessed 2026-10-14
- **[FM-robots]** https://github.com/injamhaqq/foremention/blob/4a133e10/app/robots.ts: accessed 2026-10-14
- **[FM-roles]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/enterprise-governance.ts: accessed 2026-10-14
- **[FM-sched]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/measurement-schedules.ts: accessed 2026-10-14
- **[FM-share]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/record-sharing.ts: accessed 2026-10-14
- **[FM-sso]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/enterprise-sso.ts: accessed 2026-10-14
- **[FM-surface]** https://github.com/injamhaqq/foremention/blob/4a133e10/docs/PROVIDER-SURFACE-TRUTH.md: accessed 2026-10-14
- **[FM-truth]** https://github.com/injamhaqq/foremention/blob/4a133e10/.claude/skills/foremention-product-truth/SKILL.md: accessed 2026-10-14
- **[FM-webhooks]** https://github.com/injamhaqq/foremention/blob/4a133e10/lib/workspace-webhooks.ts: accessed 2026-10-14
