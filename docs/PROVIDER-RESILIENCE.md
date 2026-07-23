# Provider resilience

foremention depends on external answer systems whose models, APIs, retrieval behavior, and citation formats can change. The application treats that dependency as an observable constraint, not a hidden implementation detail.

## Invariants

- Every answer records provider, model label when available, prompt version, collection time, raw payload, answer text, and cited URLs.
- A provider response is never rewritten in place.
- Partial provider failure never becomes a complete run.
- Cross-provider comparisons use the same prompt version and declared locale.
- Customer reports show the evidence window.
- A source's crawler status is dated and may become stale.

## Adapter boundary

All providers implement `AnswerProviderAdapter` in `lib/providers/types.ts`:

- `configured()` prevents accidental calls without credentials.
- `run()` returns one normalized `ProviderAnswer`.
- Provider-specific payloads remain in `raw` for later audit.
- Citation extraction is provider-specific and must be tested before customer use.
- When an answer is displayed, provider-supplied inline citations must remain visible and clickable rather than being reduced to an unlinked source count.

No dashboard component calls a provider directly. `/api/runs` emits one background event, and the Inngest job owns retries and collection.

## Failure modes and responses

| Failure | Product response |
| --- | --- |
| Provider timeout or rate limit | Retry within job policy; keep the run incomplete if retries fail |
| Model label changes | Store the new label; do not compare silently across model cohorts |
| Citation field disappears | Preserve raw answer; flag citation parsing for review |
| Retrieval becomes unavailable | Report answer evidence without claiming source completeness |
| Provider output becomes inconsistent | Increase sample size only with a documented methodology change |
| API is discontinued | Disable adapter, preserve prior records, add a new adapter behind the same interface |
| One provider dominates a score | Expose per-provider results; do not hide the weighting |

## Production gate for an adapter

An adapter is customer-ready only after:

1. Twenty representative prompts have run successfully.
2. Raw payloads and normalized answers match.
3. Citation URLs have been checked manually on at least ten cited answers.
4. Missing citations and refusals are represented without fabricated placeholders.
5. Rate-limit and timeout behavior has been exercised.
6. The model label and collection time are visible in the audit trail.

## Change procedure

When a provider contract changes:

1. Freeze new customer runs for that adapter.
2. Capture one failing payload and one current documentation reference.
3. Update only the adapter and its tests.
4. Run the adapter production gate again.
5. Start a new evidence cohort if the response behavior changed materially.
6. Explain the cohort break in customer reporting.

This design does not eliminate model risk. It makes the risk visible, contained, and reversible.
