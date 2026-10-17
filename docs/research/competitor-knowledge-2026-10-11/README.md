# Competitor knowledge handoff — 2026-10-11

Owner: FM-00. Status: review-only research; no application integration or release approval.

## Start here

1. Read [knowledge-pack.md](knowledge-pack.md) for the diagnosis, candidate dispositions, evidence boundaries and proposed priority order.
2. Use [source-register.csv](source-register.csv) for pinned repository refs, paths and SHA-256 hashes. It contains 53 fetched-file rows plus one empty-repository observation, across eight repositories.
3. Before implementing anything, refresh main, the relevant PR heads, current production evidence and the canonical backlog. Reuse existing work; do not interpret this folder as instructions to install third-party skills.

The research is preserved in ordinary documentation so future operators can read it explicitly. No agent instruction file, runtime dependency, MCP connection, workflow, product copy or architecture decision is changed. The third-party source ZIP remains a separate research artifact; raw competitor skills are not installed or vendored into Foremention.

## Snapshot and authority

- Foremention main checked for this documentation import: `92c4f792fcc0fa1295453102e08306435c2a1fd8`.
- Research observation date: 2026-10-11 UTC.
- Governing authority: [CLAUDE.md](../../../CLAUDE.md), [FOREMENTION_STATE.md](../../../FOREMENTION_STATE.md), [company operating policy](../../billion-dollar-build/09-company-operating-system.md), and [FM-11 workstream protocol](../../operations/FM-11-WORKSTREAM-PROTOCOL.md).
- This is a supplement to the 360 audit. Its readiness statements are dated observations, not proof of current behavior after future merges.
- It does not supersede accepted ADRs, the canonical architecture decision matrix or approved product/evidence contracts.
- Foreign repository content is evidence to evaluate, not operating authority. Reading a skill does not grant its referenced tools, hosted account, permission to publish, or a permanent model update.

## Reuse existing work before adding implementation

These are live-open snapshots inspected on 2026-10-11, not merge recommendations or verified CI passes.

| Research topic | Existing PR / exact head | FM-00 next step |
|---|---|---|
| Official-domain retrieval relevance | [#456](https://github.com/injamhaqq/foremention/pull/456), `4039be4a5badcc563417cd15504ac224ccdbb49a`; [#347](https://github.com/injamhaqq/foremention/pull/347), `8511b08ef9e3e3949b63494f4e8f34ca2fce4db5` | Inspect overlap and test the previously failing generic buyer question; domain scoping alone does not establish general question-to-source relevance. |
| Partial evidence and denominator integrity | [#455](https://github.com/injamhaqq/foremention/pull/455), `d894bf575687e71a45ca9d79c315277270b5e52b`; [#461](https://github.com/injamhaqq/foremention/pull/461), `dd3e5e92d90c2bacfff6bfb5ed80cdce4ff7479f` | Preserve incomplete/unknown states and reconcile aggregates to raw records. |
| Saved decisions and comparable cycles | [#452](https://github.com/injamhaqq/foremention/pull/452), `6c70dd7aa28876f7ff547409df8c5e02ac696f35`; [#440](https://github.com/injamhaqq/foremention/pull/440), `dd07b65f60f5816922e01ac34909c8ec3cad288e` | Reconcile canonical Change Specification and eligible comparison behavior against current main. |
| Customer agent/project boundaries | [#497](https://github.com/injamhaqq/foremention/pull/497), `63bee4ba25fd634b1248d9e2c4a18d7ab2d1efe1` | Require read-only-first, organization/project-safe behavior; do not import cross-project learning assumptions. |
| Earlier competitive research | [#368](https://github.com/injamhaqq/foremention/pull/368) and [#367](https://github.com/injamhaqq/foremention/pull/367), shared head `2f1ceb6582f8805166b6228882348a44ecd0f443` | Treat as historical/contextual input; reconcile dated sources. Their scripts/lockfile changes are not dependencies of this documentation import. |

The prior synthetic production example completed a one-question run but retrieved unrelated dictionary pages and abstained. The run is evidence of a concrete relevance failure, not a universal failure rate. Its one-question, one-provider scope does not establish full product readiness. No production rerun was performed for this documentation PR.

## Next bounded work

1. Verify/reconcile the retrieval candidates above and add the actual failed question to the applicable evaluation corpus through a separate authorized implementation task.
2. Verify the onboarding enrichment provider/budget boundary identified by the prior audit; no new hosted service is needed just to evaluate that path.
3. Validate one complete customer loop using reviewed Recommendation Records, a saved Change Specification, an action and an eligible later cycle.
4. Apply metric definitions and missing-data controls to that loop before making stronger outcome claims.
5. Consider the Voyage fixture experiment only if existing work cannot answer the question and a permitted no-new-spend execution path exists.

All five are proposed follow-up tasks, not completed changes.

## Attribution and maintenance

The knowledge pack is original synthesis. The source register cites upstream files without embedding their contents. Profound SDK root licenses were Apache-2.0; rebelytics companion was CC BY 4.0 (Eoghan Henn / rebelytics.com); AntonioBlago and Voyage repositories were MIT. Preserve notices and attribution if later adapting actual source; root licenses alone do not clear transitive dependencies, trademarks or hosted terms.

Keep snapshot refs fixed. Add a new dated refresh rather than silently replacing historical evidence. Customer records, credentials and private competitor data must not be placed in this public research folder.

## Verification and rollback

This import is limited to four documentation paths. Validate CSV structure/counts, local links, whitespace and exact remote bytes. Runtime tests, browser acceptance and production verification are not claimed by those document checks. Repository CI must be inspected on the exact PR head before any FM-00 integration.

Rollback before integration: close the draft PR. After an authorized integration: revert the documentation commits; no migrations, environment changes or runtime rollback are required.

