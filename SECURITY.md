# Foremention Security Policy

Foremention treats tenant isolation, authentication, evidence integrity, source-fetch safety, provider credentials, and release provenance as security boundaries.

## Reporting a vulnerability

Please do not disclose a suspected vulnerability in a public GitHub issue, discussion, social post, or customer-facing channel.

Report security concerns privately to `hello@foremention.com` with `SECURITY` in the subject line. Include only the minimum information needed to reproduce the issue. Do not send passwords, API keys, session tokens, provider secrets, customer evidence, or unrelated personal data.

Useful reports include:

- affected route, component, or workflow;
- the security impact;
- safe reproduction steps;
- whether the issue affects authentication, authorization, tenant isolation, evidence integrity, outbound source fetching, secrets, exports, or deployment provenance;
- any non-sensitive logs or request identifiers that help correlate the report.

## Scope priorities

Highest-priority classes include:

- cross-organization data access or mutation;
- authentication or session bypass;
- RLS or authorization bypass;
- SSRF or access to private/reserved networks through source inspection;
- credential, token, or secret exposure;
- evidence/citation corruption or unsafe cross-tenant relationships;
- unsigned or forged webhook/integration actions;
- release/deployment provenance failures that could serve unreviewed code;
- remote code execution or dependency/supply-chain compromise.

## Safe testing expectations

Do not access another customer's workspace or data, degrade production availability, perform destructive tests, send unsolicited messages, create provider spend beyond a minimal proof, or retain information obtained while validating a report.

Use synthetic data and the smallest non-destructive reproduction possible.

## Response boundary

This repository does not publish a guaranteed response-time or bounty commitment. Foremention will triage reports according to observed severity and the available operating capacity of the controlled/private-beta product.
