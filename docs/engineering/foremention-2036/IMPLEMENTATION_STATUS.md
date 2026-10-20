# Measurement protocol implementation — 2026-10-20

The previous comparison projection discarded actual retrieval-provider and observation-method fields. Equal legacy version labels could therefore permit a comparison across materially different collection protocols. A generic `unreported` model revision also counted as a stable known identity.

This branch extends the existing shared comparison boundary, without adding a dependency, schema migration, provider call or second workflow authority.

1. Exact comparability now requires recorded model revision, observation method and retrieval provider, alongside the existing question/provider/model/context matrix.
2. Comparison and customer-cycle readers retain recorded adapter method/retrieval metadata from existing `raw_json`. PostgREST reads select only the two required JSON subfields with their original JSON types. They return only the selected normalized context, not full raw provider bodies.
3. Conflicting context/adapter identity and conflicting customer-cycle method fields withhold movement. Unknown/sentinel/malformed metadata cannot establish a known protocol.
4. Structured JSON identities remove delimiter ambiguity. Malformed context values withhold instead of throwing.
5. Existing positive fixtures now declare explicit **synthetic** protocol values. No historical or customer observation was backfilled.

**Deliberate behavior change:** legacy observations, including current records stamped `modelVersion: unreported`, cannot support strict movement. Standalone evidence remains available. Actual model revision recording and release acceptance are still required; do not manufacture a revision or copy a model alias into that field merely to make comparison pass.

This is a **partial FTR-02/FTR-03 implementation**, not a complete protocol registry or complete product. It does not establish sampling independence, SQL cohort-view parity, real tenant isolation, browser acceptance, current production identity, account quota or customer value.

Validation on the implementation tree: Node 22.13.0 full suite **1779 passed / 0 failed / 0 skipped** across 415 test files; typecheck passed; production build passed; lint 0 errors with 14 inherited warnings; deterministic evaluation gate 15/15 synthetic cases. See the handoff receipts for exact commands and runtime distinctions. Ten new protocol tests include changed/unknown/conflicting identity, both comparison consumers and separator collision. Seven initial regressions failed on unchanged baseline source before the fix.

Relevant unmerged PRs: #607 mention matching, #613 UX, #614 evidence, #615 capacity, #616 operations, #617 claims. No files in this implementation's current source/test write-set overlap their enumerated paths. This does not prove semantic compatibility: especially reconcile #614's retrieval-version stamping and #616's SQL comparison trigger.

All production/customer changes remain unperformed. The branch is for review; default branch and production are not modified by this work.
