---
title: "Recommendation Intelligence Methodology | Foremention"
description: "Public methodology for question versions, model observations, citation provenance, review boundaries and comparable remeasurement."
canonical: "https://foremention.com/methodology"
last_updated: "2026-09-26"
---

# Every Conclusion Should Survive Inspection

This page describes Foremention's product methodology and evidence boundaries; it is not a report of verified customer results.

## Provider-surface measurement boundary

The current free-only live collection path is **Cloudflare Workers AI with independently retrieved Bing Search RSS sources and grounded synthesis**. It is **not a native ChatGPT, Gemini, or Perplexity consumer-app observation**. A model-vendor API is also not presumed equivalent to its consumer app. When a separately authorized direct API is used, record and verify the exact API surface, model, retrieval and citation metadata, locale, versioned buyer question and measurement protocol; preserve unavailable and uncertified surfaces as unknown rather than implying coverage. Do not merge differing surface families into one comparable cohort.

## The recorded evidence sequence

Buyer question → provider observation → returned reference → distinct source → retrievability → evidence → human review → decision → comparable later measurement.

1. **Define and version the question.** Set the buyer question, category, stage, geography and relevant brand context before collecting answers. Material wording changes create new versions.
2. **Record the provider observation.** Preserve provider, exact model label when available, collection timestamp, response and any provider-returned citations. Preserve partial errors and zero-citation responses.
3. **Distinguish returned references from sources.** Normalize destinations carefully, deduplicate distinct sources and preserve provenance. No citation can be inferred solely from the answer text.
4. **Measure retrievability.** Capture whether a returned destination was obtainable and when it was inspected. Retrieval is neither endorsement nor proof of causal influence.
5. **Inspect inside the Recommendation Record.** Human reviewers can see returned, retrieved, observed, human-reviewed and still-unknown evidence states without losing the original observation.
6. **Avoid source-to-answer causal claims.** A source returned by a provider may accompany an answer; that alone cannot prove the source determined the recommendation.
7. **Require human review before decision.** Accept, reject or leave the evidence pending. Missing, contradictory or unavailable data cannot become a confident aggregate score.
8. **Compare only equivalent later observations.** Question version, provider/model, methodology and material measurement conditions must match the recorded comparison contract; otherwise withhold a directional comparison.
9. **Separate recommendation movement from business outcomes.** A later change is an observation. Business impact and causal attribution require independent evidence.

## Valid uncertainty

A run may yield no citation, no retrievable source, partial failure, an inconclusive gap or a non-comparable follow-up. These are legitimate outcomes and remain visible.

## Discovery

- [Methodology page](https://foremention.com/methodology)
- [Product workflow](https://foremention.com/product)
- [Trust center](https://foremention.com/trust)
## Sitemap

See the complete [Markdown sitemap](https://foremention.com/sitemap.md) for linked product, methodology, trust and reference pages.
