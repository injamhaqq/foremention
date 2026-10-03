---
name: funding-eligibility
description: Prepare an internal eligibility review for a grant, accelerator, fellowship, or startup credit from explicit company facts and official program evidence. Use for bounded draft preparation, including missing-fact and stale-source checks.
---

# Funding eligibility

This is a repository instruction package, version 0.1.0. Its only handler is
`prepareFundingDraft` in `lib/company-os/funding-draft.ts`. It is not an installed
ChatGPT plugin, a native Agent OS identity, or permission to submit an application.

1. Establish the authenticated organization and active project outside this
   offline handler before using real company data. Never infer authority from
   caller-supplied UUIDs or from this document.
2. Gather the official program rules and closing time, including timezone. Record
   their source URL, observation timestamp, and an appropriate freshness limit.
   Independently verify the source; the parser cannot establish that a URL is
   official. It never fetches the URL.
3. Use approved company records for country, incorporation, stage, traction,
   revenue, funding history, and other eligibility facts. Preserve unknown values
   as null or absent; do not infer them from marketing copy. Include no secrets.
4. Translate only simple, faithfully represented rules into `eq`, `in`, `gte`, or
   `lte`. Do not flatten complex exceptions into a misleading automatic pass.
   Unrepresented conditions need human review before any submission decision.
5. Run the offline command documented in
   `docs/company-os/FUNDING-DRAFT-RUNTIME-2026-10-02.md`. Review its facts, criteria,
   evidence, blockers, and digests against the original sources.
6. Treat `eligible` as support for the supplied criteria at the supplied `asOf`
   time, not a program acceptance guarantee. Treat `unknown` as unresolved. A
   verified failed criterion may establish `ineligible` while other facts remain
   unknown. `review_ready` still requires review and submission approval.

Return the review pack and the exact missing or stale facts. Keep uncertain closing
times, unsupported claims, and expired opportunities blocked. Do not browse a
portal, upload documents, contact a program, spend credits, or modify the native
action ledger from this package. Any later execution needs a separately reviewed
scope, action policy, approval, executor, and receipt.
