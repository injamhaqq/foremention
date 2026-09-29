# Foremention — Public Competitive Radar and Agent Reach Research Runbook
**As of:** 2026-09-30 · **Classification:** Internal public-source research; NOT first-party customer evidence
**Execution status:** Public official sources were read through independent web search and TinyFish public-page extraction. **Agent Reach CLI was NOT run**: it is not installed in the current execution runtime and that runtime cannot access external package hosts. No credentialed social channel was touched. The separate `COMPETITIVE-PUBLIC-SIGNALS-2026-09-30.json` contains nine short source-bound observations, not republished articles or private data.

## Stage-0 strategic decision

Stay focused on **reviewable evidence-to-decision-to-repeat-measurement** for English-language B2B SaaS teams with competitive evaluation questions. This is a **commercial hypothesis**, NOT a unique-functionality or category-leadership claim. Other companies now explicitly market insight-to-action: Profound embeds AI Marketer in its insights, Scrunch serves approved content to agents, and Peec connects AI visibility to downstream referrals. Merely shipping an "action center", tracking more models or promising a closed loop will not establish differentiation.

The narrower hypothesis to test is that accountable growth leaders will **pay for an admissible, inspection-ready decision record**: original versioned buyer question and response; source and commercial-use rights; independent source support and declared missing evidence; signed human review; a customer-controlled change and owner; exact-version repeat measurement; transparent noncausal uncertainty. This is already consistent with #356–#358, not a new product line. Do not claim no competitor has similar auditing; test the buyer's current actual workaround and measurable willingness to change.

## What dated public competitors are moving toward (claims, not independently verified customer success)

| Competitor | Publisher-announced move | Dated public source | Foremention strategy response **to test** |
| --- | --- | --- | --- |
| Profound | Citation Decay ranks cited pages by how citation share changes. | 2026-09-29: https://www.tryprofound.com/blog/citation-decay | Preserve exact comparable evidence; do not copy a chart without measured buyer need. |
| Profound | AI Marketer investigation directly from Answer Engine Insights. | 2026-09-25: https://product.tryprofound.com/changelog | "Insight to action" is not sufficient alone; test traceable approved-decision differentiation. |
| Profound | Dynamic Bot Rendering for selected hosted sites. | 2026-09-18: https://product.tryprofound.com/changelog | Don't build infrastructure delivery before customer proof. |
| Scrunch | Agent Pages general availability for brand-approved agent-targeted pages. | 2026-09-22: https://scrunch.com/blog/agent-pages-deliver-a-first-class-site-experience-to-ai-agents | Test source-to-company-change evidence handoff, not duplicate edge page delivery. |
| Peec AI | GA4-linked AI Referrals. | 2026-09-11: https://peec.ai/blog/introducing-ai-referrals | Separate observed referral data from *causally* attributed revenue. |
| Peec AI | Brand Perception with sources behind AI descriptions. | 2026-09-16: https://peec.ai/blog/introducing-brand-perception | Test if decision/audit documentation beats more dashboards for a specific buyer. |
| Evertune | Google Cloud Marketplace availability. | 2026-09-17: https://www.evertune.ai/resources/insights-on-ai/evertune-brings-generative-engine-optimization-solution-to-google-cloud-marketplace | Do not enter costly enterprise distribution without paid-pilot proof. |
| OtterlyAI | Agent Analytics based on server-side crawler logs. | 2026-08-13: https://otterly.ai/blog/agent-analytics/ | Defer bot-log infrastructure until retention and source integrity. |
| OtterlyAI | Published a company-run answer-stability analysis using 252,407 responses in a defined sample. | 2026-09-11: https://otterly.ai/blog/ai-search-visibility-stability/ | A 5-question design-partner case is **not** a statistically stable category visibility index. Require exact comparability and disclose sample limits. |

Market/context checks: Profound *reported* a 2026-09-15 $180m financing at $1.8bn valuation (company press release: https://www.tryprofound.com/newsroom/profound-raises-usd180m-series-d-at-usd1-8b-valuation-to-build-the-ai-platform-for-marketing-teams). This says nothing about Foremention valuation or attainable founder wealth. A 2026-09-21 Reddit post says one SEO practitioner distrusts visibility numbers and struggles to identify actionable decisions: https://www.reddit.com/r/SEO/comments/1wmcqst/how_are_people_actually_handling_aisearch/ . Treat it as **one unverified anecdote**, not verified market demand, a representative sample, a qualified lead or buyer approval. Never convert vendor-funded studies, supplier press releases, anonymous forum statements or hypothetical willingness to pay into first-party proof.

## Responsible Agent Reach workflow — no hidden scraping or account credentials

Agent Reach is an **upstream tool installer/router and health checker**, not a data license, dataset or direct crawler. The official repository and safety-first install guide are:
- https://github.com/Panniantong/agent-reach
- https://github.com/Panniantong/agent-reach/blob/main/docs/install.md

On an **operator-controlled, network-enabled** separate research machine, inspect the project's pinned version, dependency and install guide first. Install to a dedicated virtual environment or pipx; do not run downloaded installer commands blindly. The guide's `agent-reach install --env=auto --safe` is check-only; `agent-reach doctor` reports available channels. Do not enable `--system`, supply cookies, extract social-session tokens, bypass access restrictions, change system protections or pay for extra infrastructure through this plan. Record tool version and doctor output **locally, without secrets**.

Use the tool's available **public web, RSS and GitHub upstream readers** only when each site permits the access and the relevant usage. Favor official company press/blog/changelog pages. The researcher (not an autonomous classifier) records a short *original paraphrase* (≤230 characters), page title, named company, actual publication date, actual observation date and exact public source URL. Do not retain full article text, login walls, private profiles, user comments containing contact data, API returns with redistribution restrictions or customer records.

An operator can hand-curate each approved observation into one NDJSON line with exactly:
```json
{"competitor":"Peec AI","url":"https://peec.ai/blog/introducing-ai-referrals","title":"Public release of AI referral analytics","summary":"The company describes new GA4-connected AI referral reporting.","published_on":"2026-09-11","observed_on":"2026-09-30","source_kind":"OFFICIAL_COMPANY_ANNOUNCEMENT"}
```

Then from the cloned Foremention project run:
```sh
node scripts/competitive-signal-intake.mjs --input /path/to/approved-public.ndjson --as-of 2026-09-30 > /path/to/private-review-queue.json
```

The **offline fail-closed intake** enforces exact named official HTTPS domains, restricts fields and text sizes, rejects URL credentials/tracking query/host spoofs, checks date ordering, detects duplicates, screens common PII/secret strings and marks **every** newly ingested item `NEEDS_HUMAN_SOURCE_VERIFICATION`. It never fetches sites, executes Agent Reach, contacts a prospect, overwrites the versioned reviewed dataset or changes production. If the public source conflicts with an announcement date or has unknown rights, reject or annotate; do not "correct" by guessing. Expand official hostlists or permitted research classes only by reviewed code change and tests.

**Commercial rights boundary:** Source accessibility is not storage/grounding/citation redistribution permission. Current public Bing RSS rights issue #346 remains P0; neither Agent Reach, a research extraction service nor published competitor announcements grant Foremention commercial-source rights. These internal short metadata paraphrases must not feed paying-customer retrieval, model-grounding, Source Map or externally distributed content without applicable licensing/permission.

## Trigger-based competitor interpretation, without reactive feature copying

1. Classify each new announcement as measurement, source evidence, attribution, content delivery, workflow, distribution, integration, enterprise trust or capital. Verify the dated primary source and whether it is actually generally available or a promise.
2. Ask: Does this change a current design partner's **observed purchasing or operating decision**? Interview a real eligible owner without leading them. No interview = market relevance unknown.
3. Record replacement current workaround, specific buyer role, adopted consequence, time/data commitment, switching criterion, evidence trace and exact question rather than inferred market share.
4. Advance product changes **only** for repeated paid/repeated-cycle customer proof, a P0 security/legality requirement, or a clear isolated evidence-integrity defect. Otherwise log the signal, update the competitive talk track and freeze scope.
5. Each weekly founder review selects ONE bottleneck, ONE accountable owner and ONE next externally testable decision. Use canonical first-party evidence tables for actual buyer answers; keep public vendor facts separate.

## Initial founder-controlled commercial proof sequence

**Days 1–14 (after independent owner safety/legal gates permit collection):** Confirm credential handling (#323), commercial retrieval legality (#346), protected migration backup/restore (#332), and actual research access. Run **10 targeted discovery conversations as an operating goal, not claimed results** from the existing 7-account prepared outreach shortlist and adjacent ICP accounts. The founder must independently approve the exact recipient list, personalized messages and send volume before any contact. Do not manufacture contacts or bulk-scrape. Begin with the buyer's *last observed* incident and current workaround, not a demo or the phrase "billion-dollar company."

**Days 15–30:** Target 15–20 genuinely qualified interviews in total and recruit **3–5 real design partners** if authentic urgency and actionability emerge. Pilot scope hypothesis: one brand, five frozen buyer questions, 3–5 competitors, reviewed source support, one customer-owned approved change and explicitly comparable second run. Five prompts are useful as a **workflow proof only**, never a robust industry-share statistic. Price is a test hypothesis (approximately $500 for a four-week paid pilot after a 14-day free design cycle), NOT accepted or collected revenue.

**Days 31–60:** Seek one **independently verified paid commitment**, at least two independently eligible comparable repeat cycles, one documented decision a customer actually took, explicit rejection and lost-reason records, no causal improvement guarantee. Track source license cost, AI/provider and Worker/Supabase costs, hands-on support and customer-visible decision value per completed reviewed change; unknown costs stay unknown.

**Days 61–90:** Decide KEEP / REFINE / PIVOT / KILL using linked first-party customer and payment proof as defined by `ICP-EVIDENCE.md`, `CATEGORY-EVIDENCE.md`, `RESEARCH-OPERATIONS.md`, `STAGE-0-CUSTOMER-PROOF-90-DAY.md` and open issue #283. Do not launch a broad model matrix, marketing agent, self-serve marketplace, funding valuation claims or expansion countries before these constraints. A competitor's feature is not a roadmap vote.

## Explicit execution and release gates

| Gate | State and competent authority |
| --- | --- |
| #323 synthetic acceptance credential revocation, session/secret rotation, artifact audit | OWNER-only secure Auth/GitHub action; no credential pasted into public issues. |
| #346 commercial retrieval/grounding/persistent evidence/client display contract | Written vendor/legal permission or approved redesign; no new uncontrolled live RSS runs. |
| #332/#354 exact production migration history + independent production backup/staged restore | Owner DBA/security sign-off; no production `db push`, destructive ledger repair or guessed equivalence. |
| #351/#352 all-nine-context DB trigger forward-only correction | After production migration provenance/rehearsal and explicit separate owner authorization. |
| #334 actual deployed staging, human form-level and full rollback acceptance | Distinct from local 17-stage API+browser hybrid green test; exact-release proof. |
| #345/#324 official source *factual* relevance and genuine provider fidelity | Only after permissions and safe synthetic identity; source-domain presence is not factual support. |
| #283 customer/user/paid second-cycle evidence | Actual externally eligible accounts and money; public website traffic and synthetic tests are not customer proof. |

**Release discipline:** #358's combined local integration passes ten exact-SHA gates but remains unmerged to protected `main`; this independent research branch is docs/offline tooling only. Neither branch changes production, obtains legal rights, performs live customer outreach or earns revenue. No agent may auto-merge to `main` while gates remain open.

## Weekly founder scoreboard — actual rows only

Report separate counts with last-observed dates: *eligible contacted* (only founder-approved genuine sends), *replies*, *qualified conversations*, *qualified interviews*, *accepted design partners*, *first reviewed Recommendation Record*, *customer-approved execution*, *eligible second cycles*, *independently collected payments*, *renewals* and *actual cost per reviewed customer decision*. Never turn candidate account research or applicant submissions into funnel conversions. Preserve negative results and objections verbatim only inside authorized first-party protected stores, never PostHog/public radar.
