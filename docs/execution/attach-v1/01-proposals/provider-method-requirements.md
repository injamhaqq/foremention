# FM-01 provider/method activation contract (2026-10-12)

Owner: Chat01; coordinator approval/integration: FM-00. No live provider call was made.

## A07 — independently retrieved search rights
`lib/free-web-retrieval.ts` previously called `https://www.bing.com/search?format=rss` automatically whenever `BRAVE_SEARCH_API_KEY` was missing. The repo itself documents the unverified commercial-use boundary. Microsoft commercial **Bing Search APIs** legal terms do not establish authorization to use the distinct public RSS endpoint or persist its output. No commercial RSS grant was supplied in this package. Source: https://www.microsoft.com/en-us/bing/apis/llm-legal

The provider gate now requires either a configured Brave Search key (subject to independent confirmation of its paid/free quota/entitlement) or `FOREMENTION_BING_RSS_COLLECTION_AUTHORIZED=1` **after operator has documented actual applicable RSS collection rights**. The latter is an attestation switch, **not a license grant**. Without either, provider measurement fails closed before external retrieval and before the platform admission counter. Never add this switch to production solely to make a test green.

If no rights exist, keep commercial measurement unavailable and choose a permitted provider/method through FM-00. Existing source descriptions hardcoded to `Cloudflare Workers AI + Bing RSS` need a truthful release-wide copy/acceptance update by their owners; this branch does not touch worker, customer UI, pricing, global CI or migrations.

## CV-03 — Perplexity Sonar contract retirement
Perplexity's September 10, 2026 vendor support reply confirms Sonar chat-completions retirement September 27, 2026. Sources: https://community.perplexity.ai/t/sonar-moving-to-agents-api/6061 and https://github.com/perplexityai/api-platform-developers/blob/main/skills/migrate-sonar-to-agent-api/SKILL.md

`lib/providers/perplexity.ts` now reports `configured() = false` and its `run()` throws before fetch. To re-enable, separately implement approved Agent API `/v1/agent` request/response parsing, native citations, exact model identity, query/method version and usage; verify available account billing/quota without unapproved live calls. Changes to a model/method invalidate direct historic comparability.

## CV-07/A29 — internal enrichment
Onboarding no longer makes direct Groq calls or accepts a hard-coded pseudo-budget. Metadata-only/manual editing remains available. Re-enable only after an atomic per-organization admission/receipt/retry/ledger interface is integrated and tested by FM-00 and Chat06.

## Cross-owner contracts
- Failure due to retrieval rights is **unavailable**, not a zero-visibility buyer answer.
- `422` topical/source evidence insufficiency is **unavailable for conclusion**, not a verified negative finding.
- Never classify Bing/Brave independent search references as provider-native citations or consumer product monitoring.
- No new services, paid calls, production flags, migrations or deployments were authorized.
