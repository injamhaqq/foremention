---
name: funding-application-pack
description: Assemble a reviewable internal funding application pack from verified fact references, preserving missing answers, source evidence, character limits, and submission blockers. Use after bounded eligibility preparation, before a founder reviews an application.
---

# Funding application pack

This repository package is version 0.1.0 and draft only. Its handler is
`prepareFundingDraft` in `lib/company-os/funding-draft.ts`. The current implementation
returns JSON; it does not generate PDFs, upload documents, or submit portal forms.

1. Confirm the correct organization, active project, company profile revision,
   program source, and closing timestamp. The offline handler validates shape;
   the integrating service must authenticate scope and independently verify facts.
2. Bind short factual questions to approved fact keys. The deterministic handler
   copies only verified, current scalar values with evidence references. Narrative
   answers without a fact key remain pending manual drafting and review.
3. Preserve required questions and character limits exactly. Do not invent revenue,
   customers, incorporation, partner commitments, founder credentials, or impact.
   Do not silently truncate an oversized answer to make it appear acceptable.
4. Review eligibility and every blocker. Missing facts, stale sources, unresolved
   deadlines, expired programs, required unanswered questions, and oversized
   answers prevent `review_ready`. Optional unanswered questions remain visible.
5. Return the JSON review pack with its fact and evidence rows, input digest,
   per-opportunity review digest, and package instruction hashes from the CLI.
   Digests detect changes; they are not signatures, approvals, truth proofs, or
   permission to execute an action.
6. Ask a later submission workflow to refresh program rules and deadlines and
   review the exact destination and exact final content. Changing the content,
   scope, recipient, deadline, package, or company facts requires renewed review.

Never attach confidential documents to an unverified portal or email recipient.
Never mark an application submitted, accepted, funded, or complete without a real
provider receipt or independently observed outcome. Native ledger persistence,
submission approval binding, portal execution, and receipt reconciliation remain
separate implementation work.
