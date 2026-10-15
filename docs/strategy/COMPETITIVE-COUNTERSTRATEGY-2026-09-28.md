# Foremention Competitive Counter-Strategy — 28 September 2026

**Stage-0 operating strategy. This document is not evidence of market leadership, product-market fit, customer outcomes, or future financial results.**

## Public competitor moves reviewed

This review uses competitors' own public product/update pages as directional market evidence. Marketing claims remain the competitors' claims unless independently verified.

| Company | Recent public move | Strategic implication for Foremention | Source |
| --- | --- | --- | --- |
| Profound | AI Marketer/Aim, agentic workflows, richer Answer Engine Insights, Dynamic Bot Rendering, site-wide Pages, GA4 and Shopping nodes; announced a $180M Series D at a $1.8B valuation on 15 Sep 2026 | Do not compete on capital-intensive breadth, giant prompt datasets, agent count, or generic enterprise marketing-suite scope | https://product.tryprofound.com/changelog ; https://www.tryprofound.com/newsroom/profound-launches-aim-to-transform-ai-search-data-into-marketing-execution ; https://www.tryprofound.com/newsroom/profound-raises-usd180m-series-d-at-usd1-8b-valuation-to-build-the-ai-platform-for-marketing-teams |
| Scrunch | Agent Pages / Agent Experience Platform serves agent-optimized site content at the edge | Agent-readable delivery is becoming execution infrastructure; Foremention should stay evidence/decision-first rather than recreate an edge-rendering platform | https://origin.scrunchai.com/blog/agent-pages-deliver-a-first-class-site-experience-to-ai-agents ; https://helpcenter.scrunchai.com/en/articles/13656392-agent-experience-platform-axp |
| Peec AI | Brand Perception, shopping visibility, and GA4-linked AI referrals/conversions/revenue | Basic visibility is commoditizing and competitors are moving toward downstream business analytics | https://peec.ai/changelog ; https://peec.ai/blog/introducing-ai-referrals |
| OtterlyAI | Recommendations, API/MCP, Query Fan-Out, ads/shopping tracking, Claude support, broader geography | API access, model breadth and prompt expansion are becoming table stakes; they are not a defensible Stage-0 wedge | https://help.otterly.ai/changelog |
| Goodie | Goodie 2.0 positions itself as moving beyond monitoring into agents, actions and outcome measurement; Goodie also publishes large public visibility benchmarks | “We take action” is no longer differentiated. Foremention needs a more exact unit of trust and proof | https://higoodie.com/blog/introducing-goodie-2-0/ ; https://higoodie.com/ai-visibility-index/e-commerce-platforms/ |
| Evertune | Connects organic visibility gaps to AI advertising; shopping intelligence; enterprise distribution through Google Cloud Marketplace | Competitors are expanding across organic, paid, shopping and procurement channels. Foremention should avoid channel sprawl until customer proof exists | https://www.evertune.ai/resources/insights-on-ai/evertune-launches-visibility-boost-ad-agent ; https://www.evertune.ai/resources/insights-on-ai/introducing-evertune-shopping-intelligence ; https://www.evertune.ai/resources/insights-on-ai/evertune-brings-generative-engine-optimization-solution-to-google-cloud-marketplace |

## Market convergence

The category is converging toward:

1. broader model and geography coverage;
2. visibility/sentiment/perception analytics;
3. recommendations and agents;
4. content or agent-site execution;
5. GA4 / referral / conversion attribution;
6. shopping and paid AI advertising;
7. APIs, MCP and workflow integrations;
8. public benchmarks and very large prompt datasets.

Foremention should assume that feature breadth in these areas can be copied or outspent.

## Foremention's wedge: Decision Evidence, not dashboard breadth

The product should win a narrower high-trust job for growth-stage B2B software:

> **When a meaningful buyer question exposes a recommendation gap, show exactly what evidence supports it, what the company can truthfully change, who approved the change, what was actually executed, whether a later measurement is genuinely comparable, and what changed afterward — without manufacturing causality or ROI.**

The unit of differentiation is the **inspectable decision-evidence chain**, using existing product objects:

`Buyer question → Recommendation Record → reviewed evidence → Company Truth → eligibility → Change Specification → human decision → execution reference → comparable later measurement → observed outcome + limitations`.

This is not a new top-level product object and must not bypass the Stage-0 roadmap freeze.

## What Foremention should deliberately NOT chase now

- Largest prompt corpus.
- Most countries.
- Most AI engines.
- Public visibility index.
- Generic marketing agent suite.
- Agent-specific website rendering infrastructure.
- Shopping intelligence.
- Paid AI media buying.
- Marketplace breadth.
- Unsupported ROI prediction.
- Broad autonomous execution.

Those may become relevant later, but copying them now would spread engineering and evidence quality too thin.

## Product strategy: make the decision chain visibly stronger than competitors' aggregate output

### 1. Make comparison eligibility a first-class customer-visible fact

The product must show *why* a later measurement is comparable or incomparable. Missing material context must fail closed. PR #352/#351 are therefore strategic differentiation work, not merely database cleanup.

### 2. Make execution evidence inspectable

An approved recommendation is not enough. Keep the exact customer-owned page, PR, ticket, document, policy, release or other execution reference attached to the decision chain.

### 3. Export a board-readable evidence packet

The existing Outcome Ledger / board export should make these states obvious:

- reviewed issue;
- approved decision;
- recorded execution;
- later measurement status;
- comparison eligibility;
- observed direction when eligible;
- unresolved/incomparable state;
- causal/economic limitations.

Do not collapse these into one opaque “impact score.”

### 4. Turn “insufficient evidence” into a product advantage

If no valid source exists, a provider failed, a context field changed, or a comparison is invalid, Foremention should visibly withhold the conclusion. The trust moat is partly the set of conclusions the product refuses to fake.

### 5. Sell one expensive decision loop, not cheap monitoring seats

Stage-0 design-partner demos should center on one buyer question and one real company decision. A design partner should understand the workflow in ~20 minutes:

`question → observation → evidence review → change decision → implementation record → scheduled comparable follow-up`.

The sales proof is completion of the loop, not dashboard activity.

## Technical priorities that directly support the wedge

1. **#351 / PR #352:** full nine-field material-context parity for persisted Resolution comparisons.
2. **#332 / PR #354:** trustworthy migration lineage before production schema release.
3. **#346:** commercially permitted retrieval/data-retention path.
4. **#345:** source relevance for domain-constrained evidence.
5. **#323:** synthetic credential rotation/artifact cleanup before another live acceptance canary.
6. **#324:** provider fidelity/reliability only on authorized surfaces.
7. **#325:** first-evidence latency attribution without confusing orchestration delay with provider latency.
8. **#334 / PR #353:** full isolated authenticated decision loop.

These are more strategically valuable than adding another model logo or generic dashboard.

## Distribution strategy

### Category position

Use **Recommendation Intelligence** as the category, but explain the sharper product promise in plain language:

**From AI recommendation evidence to an approved company change and a defensible later verification.**

Avoid “AI visibility platform” as the primary category label; that places Foremention directly inside the best-funded feature arms race.

### Design-partner proof

Before broad acquisition, prove:

- 3–5 qualified B2B SaaS design partners actively use the full workflow;
- at least one paid pilot / signed paid commitment;
- at least two companies complete a second comparable reviewed cycle.

Until then, competitor feature launches should change sequencing only when they threaten this core workflow.

### Content moat

Publish evidence-first material around questions competitors have less incentive to emphasize:

- when an AI-visibility comparison is invalid;
- why provider APIs and consumer apps are different surfaces;
- why citations do not establish causality;
- how to record an AI-search intervention;
- how to distinguish an observed outcome from ROI;
- how a CMO can audit an AI-search recommendation before approving work.

## Competitive response rule

For every competitor launch, ask four questions before changing the roadmap:

1. Does it materially weaken Foremention's ability to complete the Stage-0 decision loop?
2. Is it now an expected table-stakes capability for the current ICP?
3. Can the requirement be satisfied by strengthening an existing object/workflow rather than creating a new top-level product?
4. Is there verified customer evidence that the capability blocks a design-partner decision or paid pilot?

If the answers do not justify work, **record the move and do not react**.

## 90-day strategic objective

Foremention should aim to become the most defensible product for **B2B SaaS teams that need to decide what to change after an AI recommendation observation**, rather than trying to become the broadest AI-marketing suite.

Success evidence for this strategy is not valuation or feature count. It is:

- completed customer decision chains;
- comparable second cycles;
- paid pilot evidence;
- decision-maker trust in the evidence packet;
- repeated use of the workflow for another buyer question.

No claim of leadership should be made until external evidence exists.
