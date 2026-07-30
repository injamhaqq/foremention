# Foremention integration boundaries

Foremention adds an integration only when it improves the customer evidence
chain, has an inspectable API contract, can be isolated per organization, and
fits the product's cost and privacy controls. A long connector list is not a
product advantage by itself.

## Production provider path

| Integration | Role | Evidence status |
| --- | --- | --- |
| Gemini | Grounded answer collection | Provider-returned citations only |
| Groq Compound | Grounded answer collection | Structured search results only |
| Cloudflare Workers AI | Low-cost answer comparison | Answer-only; never creates citation evidence |
| OpenRouter with explicit GLM 5.2 | Additional model perspective | Answer-only; low-cost, not free |
| ZenMux | Optional explicit-model gateway | Structured provider URLs only; otherwise answer-only |
| OmniRouters | Optional explicit-model gateway | Structured provider URLs only; otherwise answer-only |
| OpenAI, Anthropic, Perplexity | Optional provider adapters | Available only when privately configured and proven |

Every provider uses the same authenticated, organization-scoped, queued run
path. A configured provider is labelled untested until a real production run
completes. Failed requests remain failures.

## Foremention-owned agent control plane

The hosted product owns six narrow agents: Run Supervisor, Question Scout,
Answer Collector, Evidence Mapper, Brand Observer, and Human Review Gate. They
are stages of the existing cost-capped collection pipeline, not six additional
model calls.

Agent telemetry is written idempotently to the tenant-scoped `jobs` ledger.
Customer dashboards may show either recorded stage telemetry from a new run or
an explicitly labelled view derived from an older persisted run. Demo telemetry
is fictional and remains isolated. Agents never invent a question, answer,
citation, page review, or approval when the preceding evidence is absent.

## Candidates requiring a separate production service

- **Crawl4AI:** useful for page extraction, but it requires a separately hosted
  Python/browser service plus SSRF, robots, redirect, size, timeout, and
  retention controls. It does not belong inside the current Cloudflare Worker.
- **ScrapeGraphAI and Gumloop:** possible workflow or extraction vendors after
  their API terms, data processing, quotas, and webhook verification are
  reviewed. They are not a substitute for provider-returned citations.
- **Cloudflare embeddings and classifiers:** useful later for reviewed-question
  deduplication and source clustering after those calls are added to the cost
  ledger and evaluated against deterministic baselines.
- **Agent Reach:** useful on the founder's local research machine for public
  research. Cookie-dependent social connectors must never receive customer
  credentials or run in Foremention production.

## Development tools, not customer integrations

Ollama, OpenCode, Hermes Agent, OpenCodeZen, local GLM routes, LM Arena, and
similar coding or model-experiment tools may help build Foremention. They do
not become part of the hosted customer product and cannot be reached from the
production Worker through a founder's localhost.

## Outside the product runtime

Founders Inc, LLC-registration offers, BuiltWith, email-marketing tools, clip
generators, and startup accelerators are business-development resources. They
should be evaluated independently rather than injected into the collection
engine.

Unverified proxy gateways such as OmniRoute (distinct from the documented
OmniRouters API), Agent Router, FreeLLM, Aerolink, Odysseus, or other
"unlimited free" routes remain excluded until there is an official API
contract, lawful credential source, privacy policy, reliability record,
explicit model identity, and enforceable cost ceiling.
