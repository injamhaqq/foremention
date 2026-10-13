# Proposal (Chat01 -> Chat06 / Chat04): abstentions and unavailable evidence are not zero visibility

Current main (`lib/jobs/inngest.ts`, finalize step): `brand_presence_pct = presenceAnswers / answerCount`, where `answerCount` = successful answers. Failed attempts (incl. the new 403/410/422 evidence-unavailable errors) are already excluded — good. But an answer such as "I can't verify this from the retrieved evidence" is a successful answer with `brand_present=false`, so it lowers visibility as if it were a verified absence (the 2026-10-11 run showed 100% execution coverage with no useful answer).

Patch (Chat06):
```ts
import { summarizeVisibility } from "@/lib/evidence-provenance.mjs";
const summary = summarizeVisibility([
  ...answers.map((a) => ({ status: "complete", answer: a.answer, brandPresent: includesName(a.answer, identity.brand) })),
  ...failures.map((f) => ({ status: "failed", httpStatus: f.status })),
]);
// brand_presence_pct: summary.value (null when withheld), plus persist summary.abstained / evidence_unavailable / failed
```
`runs.brand_presence_pct` is numeric nullable? (verify) — storing `null` instead of 0 may need UI handling (Chat04/05) and a run-level count column for abstentions (FM-00 schema). Until then, at minimum record `error_summary` with the abstained count and never show 0% when `summary.value === null`.

Execution coverage (attempts that returned) and answer usefulness (observed, non-abstaining answers) must be reported as two separate numbers.
