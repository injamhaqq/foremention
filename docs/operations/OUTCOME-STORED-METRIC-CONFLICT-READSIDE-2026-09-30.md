# Outcome Ledger — contradicting persisted metrics are not evidence

**Scope:** non-production read-side reporting integrity on top of the independently green staged #358 SHA `734c7c9ec61d5d12122a6d4d19dd34bbee3a6c66`.

## Root cause
`lib/outcome-ledger.ts` first accepted any fully shaped `resolution_follow_ups.outcome` whose run IDs matched. That stored outcome is constructed from source run aggregates during DB finalization, but **the browser read-side preferred it even when both current source runs were independently readable and materially contradicted the saved before/after metrics**. Existing tests explicitly permitted a saved brand after of 99 against a readable run after of 35.

No assertion of actual customer tampering or an observed production incident is made. This is a concrete, reproducible **synthetic display-integrity defect** with direct unit regression coverage. It could inflate or reverse executive directional evidence if underlying persisted fields disagree.

## Fail-closed correction
When both source runs are present, finalized and have complete valid aggregate columns, the ledger independently recomputes the expected metrics and requires a strict match for **all four** before/after/delta fields. Percentage values tolerate <= 0.011 percentage points for normal rounding; counts must agree exactly. A conflicting saved outcome leaves the follow-up measured but **incomparable** and shows an explicit integrity-review limitation. It does not silently pick the more flattering stored number or replace it with the run result.

For legacy historical data where aggregate columns are missing, a strictly shape-validated saved outcome remains eligible **only when both linked finalized source run rows exist** and the independent nine-field context read passes. Completely missing/unfinished source runs cannot be retroactively certified by a saved JSON object. Count fields also reject unsafe JS integers in any stored delta.

Positive regression includes matching numeric-string source aggregates and rejected untrusted saved causal claims. Negative regressions cover conflicting percentage/count baselines, follow-ups and deltas; missing/unfinished source runs. The existing normal empty-legacy JSON + complete aggregate fallback remains intact.

## Gates and limits
Require the standalone branch's **all ten exact-head CI/security/browser/isolated synthetic workflows** before considering a merge **only into #358 nonproduction integration staging**. Following any nonproduction merge, re-run all ten checks on the new **combined** #358 exact head; do not reuse this branch's green run IDs. Do not merge #358 or #356/#357 into auto-deploying main absent owner security/provider license/migration/deployed-stage/rollback approvals in #323/#346/#332/#351/#334. This change is read-side defense in depth, NOT the DB write-side comparator fix on #352 and NOT real external customer proof.