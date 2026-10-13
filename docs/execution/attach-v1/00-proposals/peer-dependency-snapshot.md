# Peer integration readiness — first live branch snapshot, 2026-10-12 UTC

**Snapshot, not a watch.** Exact refs must be reread before applying patches. Common canonical base at first comparison: `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9`. No main merge, worker branch rebase, production mutation or live billing under FM-00.

| Peer branch | Observed head (may have advanced) | Source patch and gate status |
|---|---|---|
| `01-measurement` | `4c5a6fa8bc1469a7d277cd605785c938d0576283` | Provider retrieval/topic relevance, Cloudflare evidence metadata, fail-closed Groq onboarding; status published. 8/8 local pure helper tests, full head CI/replay pending. |
| `02-security` | `d65659ef813b65e6b6aba66687e8a886c0e39f8a` | Origin hardening and targeted test; no status at check; current replay and two-tenant RLS gates pending. |
| `03-billing` | `1efcd592945ace7f3af1d7332253da4fd7d7bea9` | Paddle identity admission/webhook plus tests; status published. 3/3 local pure helper tests; real sandbox lifecycle and composed entitlement test pending. |
| `04-workflow` | `1372796a1a32c24fd798e1a189ac942a1e9b7e6d` | Onboarding and approved-question controls; no status at check. Full 5-question, decision and later-cycle tests pending. |
| `05-website-ux` | `4646b6863e38113ce1e7f90b572632ca257086d6` | Public contact/hero/CSS and test; no status at check. Browser/responsive/a11y and source-receipt acceptance pending. |
| `06-operations` | `3e7bea6954c9e813dcf03d94171b01c5db73440f` | Notification policy/email paths and test; no status at check. Idempotence and genuine recovery receipts pending. |
| `07-repository-choices` | `e9a7addd43dbaa26545ac48615eea3da8af1b972` | Source occurrence / repository crosswalk docs; no status at check. No new runtime dependency approved. |
| `08-commercial-finance` | `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` | Branch exists at original base, no changes/status at check. No verified payments or pipeline inferred. |
| `09-independent-qa` | `9e8c14d2e7335c89a7e14938b4ff559dc70e9a50` | New independent tests, scenario fixture and source trace; status published; 30 synthetic scenarios explicitly NOT executed. Composed-head acceptance pending. |

## Conflict and integration posture

- Current first-look write sets are distinct; this is not a conflict-free merge certification. Some branches may update shared source/CI/schema after this snapshot; fetch current diffs before deciding.
- Worker fixture tests can demonstrate narrow behavior, not authenticated tenant isolation, production provider receipt, money movement, retry idempotence or true second cycle. Do not advertise release readiness from source-contract assertions.
- FM-00 composes only reviewed stable delivery heads on its branch. With missing workstream status files, missing full exact-head CI, and independent live acceptance absent, **integration is blocked pending peer contracts/receipts**. No cherry-pick or blind union of source blobs from this snapshot.
- Chat09 records a historical observed deployment SHA mismatch (expected `6b93c88c`, deployed `b13e5327`) on its earlier checks. **Current production SHA was not independently obtained here; do not claim drift persists or was resolved.**
- Workers' seven loose-file attachment limitation is real for their individual sessions; FM-00 separately recovered 18 original SHA-verified source documents from a prior stored ZIP and can reconcile references. The archive is **not** silently shared with workers' tools.

## Next gate
Refresh refs, worker `XX-status.md` files and draft PRs; for each finished slice compare full actual patch and check state. Choose stable base, apply ordered patches and reviewed schema proposals, re-run entire composed suite and request Chat09 independent verification before a final manual approval request. Never merge to main or deploy from this snapshot.
