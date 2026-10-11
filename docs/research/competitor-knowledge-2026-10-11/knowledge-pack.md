# Foremention competitor knowledge pack
Observed: 2026-10-11 UTC. Research only; no competitor integrations installed, credentials supplied, messages sent, purchases made, or Foremention application changes made.

## Decision
Use these resources as references to improve Foremention's evidence and decision workflow. They do not establish that replacing Foremention with a cloned repository will produce a working paid business. Public SDKs and skills expose interfaces and procedures; they do not provide the vendors' hosted measurement infrastructure, accounts, customer data, distribution, or commercial rights to their branding.

The previously observed Foremention test completed technically but returned irrelevant dictionary sources and an abstaining answer. That is a concrete evidence-quality problem to fix before investing in more automation. This report is a supplementary research pack, not completion of the original 360 audit or a new production readiness certification.

## Coverage and limits
Eight repositories checked individually. Seven nonempty recursive file inventories contain 803 blob entries, with no truncation reported. Peec's official repository returned GitHub 409: repository empty. Retrieved 53 selected files, including all 29 identified SKILL.md paths, READMEs, licenses, selected manifests and API references. Reviewed skill descriptions, structure and selected evidence/safety sections; retrieval of complete bytes is not a claim that every line was analytically reviewed. Most implementation code, linked skill reference documents and runtime behavior remain uninspected. Root and .claude SDK skill variants overlap but differ in bytes; retain both in the source archive.

Official public documentation was read for Profound, Peec, OtterlyAI, Scrunch, AthenaHQ and Goodie. No authenticated competitor accounts or live MCP calls were tested. No customer review corpus, complaints-to-demand validation, GitHub Trending screen, or exhaustive internet inventory was completed in this pass. Attachments and earlier separate-chat work not supplied here cannot be inspected.

## Repository decisions
| Repository | Identity / license | Material inspected | Primary disposition and reason |
|---|---|---|---|
| [Profound TypeScript SDK](https://github.com/cooper-square-technologies/profound-typescript-sdk) | Vendor SDK; Apache-2.0 | README, license, manifest, API reference, 2 SDK skills | REFERENCE ONLY: useful typed API/error/streaming patterns; enterprise vendor API access is outside the $0 plan. |
| [Profound Python SDK](https://github.com/cooper-square-technologies/profound-python-sdk) | Vendor SDK; Apache-2.0 | README, license, manifest, API reference, 2 SDK skills | REFERENCE ONLY: overlaps TypeScript and introduces another runtime without a demonstrated gap. |
| [Profound Rust SDK](https://github.com/cooper-square-technologies/profound-rust-sdk) | Vendor SDK; Apache-2.0 | README, license, manifest, API reference; no skill found | REFERENCE ONLY: no reason to add Rust to Foremention for vendor access. |
| [Peec official skills](https://github.com/peec-ai/peec-mcp-skills) | Official organization; no contents/license verified | Metadata and failing tree request | UNRESOLVED: repository is empty at observation; no usable skills to import. |
| [rebelytics Peec companion](https://github.com/rebelytics/peec-ai-mcp) | Independent; CC BY 4.0 | README, license, companion skill | REFERENCE ONLY: strong metric interpretation and empty-result controls; author assertions need live validation. |
| [AntonioBlago Peec skills](https://github.com/AntonioBlago/peec-ai-skills) | Independent; MIT | README, license, all 9 skill files | REFERENCE ONLY: closed-loop planning patterns; depends on Peec, Visibly and optional SkillMind tools not available merely by reading files. |
| [Voyage GTM skills](https://github.com/onvoyage-ai/gtm-engineer-skills) | Publisher resource; MIT | README, license, AGENTS/manifest where inventoried, all 12 skill files | REFERENCE ONLY: reuse planning, source verification and artifact contracts; reject unvalidated score multipliers and automatic publishing assumptions. |
| [Voyage GEO agent](https://github.com/onvoyage-ai/voyage-geo-agent) | Open-source alternative; MIT | README, license, manifest, all 3 skills | EXPERIMENT after Foremention retrieval fix: compare a small fixture without installation during this audit. Model credentials/inference and hosting remain separate costs. |

No absent dependency is labelled REMOVE. No unrelated repository should be merged wholesale. No exact PR merge is proposed by this supplementary pass.

License observations refer to retrieved root licenses, not legal clearance of every transitive dependency. Preserve MIT notices, Apache license/NOTICE obligations where applicable, and CC BY attribution/change disclosure when adapting or redistributing material. Trademarks and hosted-service terms are separate. Maintenance evidence is a reachable public repository and an exact snapshot, not proof of long-term support.

## Public capability benchmark
| Company | Public evidence | Reusable pattern | Access / verification boundary |
|---|---|---|---|
| Profound | [REST API introduction](https://docs.tryprofound.com/rest-api/introduction) | Raw per-execution answer rows alongside processed reports; user/organization scope; explicit rate-limit headers | API documented for Enterprise plan; hosted calls not tested. |
| Peec | [Official MCP page](https://peec.ai/mcp) | Query visibility, competitors and sources with engine/topic/country/date context | Authenticated vendor project needed; independent skill details are not official guarantees. |
| OtterlyAI | [MCP help, updated Oct 5 2026](https://help.otterly.ai/does-otterlyai-have-an-mcp) and [skill docs](https://docs.otterly.ai/claude-skill) | Raw responses/citations, recommendations, separate write permissions, OAuth | MCP exists in current docs, superseding older coming-soon content. Downloadable skill bundle not inspected. |
| Scrunch | [Developer documentation](https://developers.scrunch.com/) | Query responses, agent traffic and configuration as distinct surfaces | Public docs inspected; source engine and authenticated behavior unknown. |
| AthenaHQ | [Integrations](https://athenahq.ai/integrations) | Connect analysis to content and downstream CMS/analytics workflows | Vendor claims; no verified public core engine repository found in this search. |
| Goodie | [Official MCP](https://higoodie.com/mcp/) | Account-backed conversational access to product data | Correct company is higoodie.com. Active account required; source engine not inspected. |

Public documentation establishes documented interfaces, not measured usability, accuracy, customer satisfaction, pricing fit or superiority. A future full benchmark needs matched prompts, disclosed observation methods, eligibility controls and explicit competitor trial permissions.

## Patterns to use in this conversation and future handoffs
1. **Evidence before recommendation.** Preserve question/version, observation method, model/provider, settings, timestamp, raw answer and source provenance. Separate native citations, independently fetched URLs, brand mentions and human conclusions.
2. **Missing data is a state.** Diagnose no-answer, refusal, incomplete collection, filter mismatch and permission failure before interpreting absence as zero visibility. Use a known-populated positive control.
3. **Metric types travel with the numbers.** Store denominator, units, scale, direction and exclusion rules. A rank is not a higher-is-better score; sentiment is not automatically a percent-positive measure.
4. **One reviewable next decision.** Link evidence → specific opportunity → human decision → change specification → owner/action/date → eligible later cycle. Give the customer a small actionable priority list, not a generic article queue.
5. **Project state is durable and scoped.** Keep brand identity, audience, language, question set and methodology version with org/project identifiers. Avoid silent defaults. Separate retrieval, draft generation, approval and publication permissions.
6. **Reports include uncertainty and subtraction.** Show what changed, what remains unknown and what to stop doing. Before/after movement does not establish causal uplift.
7. **Artifacts have contracts.** Validate researched questions, plans and briefs against schemas. Link to original evidence, preserve provenance and reject fabricated volumes, statistics and testimonials.
8. **Customer learning stays private by default.** Project-local decision history can be useful; cross-project priors need explicit lawful permission, minimization and isolation. Never import a skill's shared-memory assumption into tenant data access.

These are original synthesis points grounded in the catalogued materials. They are research context, not installed skills or persistent changes to the assistant's model.

## Advice to reject or qualify
- Voyage skills use specific GEO score weights and uplift multipliers. They are hypotheses until their underlying studies and transfer conditions are verified; do not turn them into Foremention promises.
- Voyage's consumer-brand model labels can obscure that execution uses model APIs/OpenRouter. Record the actual provider/method rather than calling an API sample a consumer-product observation.
- Blanket permission for every AI crawler is not universally appropriate. Preserve private-page noindex controls and deliberate publisher choices.
- Do not hard-limit all SEO keywords to three words merely because a supplied skill does.
- Do not infer demand from repository stars, self-authored benchmarks or an old issue that newer code may already resolve.
- Outreach templates and community posting advice do not authorize sending messages. User consent, truthful affiliation and community rules still apply.
- Do not paste secrets into chat or embed them permanently in downloaded skills.
- No resource establishes a guaranteed billion-dollar outcome or an autonomous business requiring no founder work.

## Prioritized execution handoff to FM-00
Proposed work below is planning only. Reuse the existing backlog rather than create duplicate implementation workstreams.

| Order | Gap / status | Concrete action | Gate | Effort / cash boundary |
|---|---|---|---|---|
| 1 | Confirmed prior production example: irrelevant retrieval and abstention | Fix relevance validation and reject unrelated fetched pages; preserve abstention as an honest incomplete-evidence result | The exact failed question plus ambiguous-brand and irrelevant-source fixtures return relevant evidence or an explicit failure; never an approved unsupported recommendation | 1–3 days proposed; existing code/resources only |
| 2 | Confirmed code-path concern from prior audit: enrichment bypasses free-only provider guard | Route enrichment through the same server-side provider/budget policy | No configured zero-spend flow can invoke a disallowed paid route, including onboarding | 0.5–2 days proposed; no new spend |
| 3 | Workflow opportunity, not newly verified defect | Walk one project through evidence, saved human decision, action and comparable second cycle; record each actual missing step | Founder and test customer can recover the decision and interpret the later outcome without undocumented assistance | 1–3 days evaluation/manual support; existing resources |
| 4 | Unverified metric completeness | Reconcile report numerators/denominators against raw receipts, including partial/refused runs | Fixture totals and displayed units agree; incomplete runs stay distinct from zero mentions | 1–2 days proposed |
| 5 | Unverified scope/security implications of new AI workflows | Keep assistant tools read-only first, enforce organization/project scope server-side, separate approval from execution | Cross-project and unauthorized mutation tests fail closed | 1–3 days proposed |
| 6 | Growth hypothesis | Deliver one evidence-backed weekly decision report manually to a qualified design partner | Customer can identify one useful decision and explain why its evidence is trustworthy | 1–2 founder hours/customer/week proposed; no contacted customers in this pass |
| 7 | Optional comparison | Evaluate Voyage output-contract and reporting patterns against the same small safe fixture after core repairs | Disclosed APIs, equivalent inputs, reproducible raw artifacts; no unapproved spend/install | 0.5–1 day later; reject if credentials/capacity are unavailable |
| 8 | Unverified commercial outcome | Test paid willingness only after a useful complete cycle; ask voluntary honest reviews after demonstrated value | Actual payment/continuation and consent recorded; no sentiment-conditioned review requests | Founder-led, no outbound action authorized here |

No new editor, vector database, gateway, scheduler, CRM or agent framework is justified by these findings. Manual founder support is a valid first-customer delivery mechanism if capacity is explicit. Public source code is free to read; hosted API access, inference, storage, maintenance and founder time are not thereby free.

## Continuation contract
Use this pack and the source register as a handoff, and re-check sources before time-sensitive claims. Future research should fill the explicit gaps: authenticated competitor journeys; actual current pricing/limits; customer complaints and demand; linked skill references; security of any selected executable code; and the unfinished original 360 audit coverage. Do not report those as completed from this pack.

The source archive preserves the 53 retrieved files with licenses, inventory metadata and snapshot identifiers. It is an inert research archive, not an installation bundle. See the CSV for exact snapshot refs and file-level hashes.

