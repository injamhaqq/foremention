---
title: "Recommendation Intelligence for B2B Software | Foremention"
description: "An inspectable workflow from buyer-question observations through human-reviewed changes and comparable verification."
canonical: "https://foremention.com/product"
last_updated: "2026-09-26"
---

# Foremention: From Recommendation Evidence to Company Changes

Foremention is a B2B software product for preserving AI buyer-question observations and supporting human-reviewed company decisions. It does not promise AI rankings, citations, sales or causation.

## Current measured provider surface

In the current free-only live collection path, Foremention uses **Cloudflare Workers AI + Bing Search RSS grounded synthesis**. This is a defined hosted-model and independently retrieved-web-evidence observation, **not** direct monitoring of ChatGPT, Gemini, or Perplexity consumer-app responses. A separately configured model-vendor API also does not automatically represent that vendor's consumer application. Each Record preserves the actual provider, exact model, question version, retrieval method and relevant measurement context; other surfaces require their own independent validation before coverage or cross-surface comparison claims.

## Product workflow

1. **Observe.** Version a buyer question and store the provider, exact model, measurement context, returned answer, brand mentions, returned citations where present, failures and collection timestamp.
2. **Understand.** Inspect retrieved-source evidence and review what the company can actually substantiate. Separate a returned reference from proof that a source caused an answer.
3. **Decide.** Document a decision-relevant gap in a customer-owned Change Specification, including supporting evidence, exact proposed change, owner, acceptance criteria and verification plan.
4. **Execute.** The customer's team reviews and implements the change. Foremention records the execution evidence (such as a page, document, ticket or release reference), not an assumed completed action.
5. **Verify.** Repeat the approved question under a comparable measurement contract. Preserve non-comparable measurements, missing citations, contradictory evidence and failures.

## What a Recommendation Record contains

A Recommendation Record keeps a dated question, provider/model identity, the observed response, returned references, source retrieval and human-review state together. A zero-citation response is a valid observation and cannot be silently replaced with invented citations.

## Decision layers

- **Company Truth:** claims that can be supported by actual product and company evidence.
- **Eligibility:** whether a company can genuinely satisfy the particular buyer requirement.
- **Change Specification:** a proposed change backed by reviewed evidence, an accountable owner and verification criteria.
- **Execution:** customer-provided evidence of what was actually shipped.
- **Verification:** observed direction in later comparable measurements with explicit limitations.

## Reporting boundaries

"Observed change" does not establish why a model changed its answer. Differences across providers, models, prompt versions, locations or collection methods are separately marked and never collapsed into a false trend. Results can be inconclusive.

## Learn more

- [Product page](https://foremention.com/product)
- [Measurement methodology](https://foremention.com/methodology)
- [Recommendation Record](https://foremention.com/recommendation-record)
- [Design-partner application](https://foremention.com/contact)
## Sitemap

The full, maintained [Markdown sitemap](https://foremention.com/sitemap.md) covers the public Foremention documentation and product pages.
