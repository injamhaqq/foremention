---
title: "Recommendation Record | Foremention"
description: "The canonical, inspectable unit of one AI recommendation observation with returned references, human review and comparability conditions."
canonical: "https://foremention.com/recommendation-record"
last_updated: "2026-09-26"
---

# Recommendation Record

A Foremention Recommendation Record preserves one dated AI buyer-question observation and its supporting and missing evidence in a single inspectable object. It is not a universal AI rank or proof that a cited source caused the model's answer.

## What a Recommendation Record preserves

1. **Record identity:** an immutable record ID, buyer-question identity and version.
2. **Observation context:** exact provider/model metadata and observation timestamp.
3. **Observed answer:** the text returned and the vendors named or recommended.
4. **Returned references:** the references actually returned by the provider, if any. Zero references is a legitimate outcome.
5. **Distinct sources:** deduplicated destination sources and their retrievability at review time.
6. **Review state:** human acceptance, rejection or pending review; the model cannot silently approve its own evidence.
7. **Limitations:** absent, unavailable, contradictory, inconclusive or non-causal evidence states.
8. **Comparison eligibility:** whether a subsequent observation has equivalent question, provider/model and material measurement protocol.

## Evidence inspection inside the Record

- **Returned:** what reference, if any, did the provider actually return with this answer?
- **Retrieved:** could Foremention retrieve the destination at the recorded inspection time?
- **Observed:** what relevant evidence was actually present in the retrievable source?
- **Reviewed:** what did a human inspect, accept, reject or leave pending?
- **Safe conclusion:** what does the inspected evidence support, and what remains unknown?

A returned reference is not proof of source influence. A retrievable page is not proof of an endorsed company claim. An illustrative Record is fictional and is not a real customer success case.

## What happens next

Only reviewed, decision-relevant evidence may inform a customer-owned Change Specification. An approved company change needs its own execution evidence. Remeasure only when the later buyer question, provider/model, geography and material collection conditions meet the exact comparison contract. A changed answer is an observation, not automatically a causal business outcome.

## Sitemap

- [Recommendation Record on the website](https://foremention.com/recommendation-record)
- [Recommendation Intelligence category](https://foremention.com/recommendation-intelligence)
- [Measurement methodology](https://foremention.com/methodology)
- [Product workflow](https://foremention.com/product)
- [Markdown sitemap](https://foremention.com/sitemap.md)
