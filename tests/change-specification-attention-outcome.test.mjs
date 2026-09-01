import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Attention is the single post-activation H1 and loads at most five active Change Specifications", async () => {
  const [page, loader, list, detailPage, detail] = await Promise.all([
    text("app/app/page.tsx"),
    text("lib/change-specification-data.ts"),
    text("components/change-specification-priority-list.tsx"),
    text("app/app/change-specifications/[id]/page.tsx"),
    text("components/change-specification-detail.tsx"),
  ]);

  assert.equal((page.match(/<h1>/g) || []).length, 1, "dashboard must render one primary h1");
  assert.match(page, /activationComplete \? "What should we change next\?"/);
  assert.match(page, /Five steps to useful evidence/);
  assert.match(loader, /status=in\.\(draft,in_review,approved,in_execution\)/);
  assert.doesNotMatch(loader, /status=in\.\([^)]*completed/);
  assert.match(loader, /order=priority_rank\.asc\.nullslast,created_at\.desc&limit=5/);
  assert.match(list, /item\.decisionState/);
  assert.match(list, /item\.controlClass/);
  assert.match(list, /item\.eligibilityState/);
  assert.match(list, /item\.confidenceState/);
  assert.match(list, /item\.effort/);
  assert.match(list, /item\.ownerRole/);
  assert.match(list, /item\.evidenceCount/);
  assert.match(list, /item\.acceptanceCriteriaCount/);
  assert.match(list, /item\.hasVerificationPlan/);
  assert.doesNotMatch(list, /Leadership Score|Recommendation Engineering Score|\/\s*100/);
  assert.match(list, /Foremention will not manufacture actions without reviewed evidence/i);
  assert.match(list, /\/app\/change-specifications\/\$\{encodeURIComponent\(item\.id\)\}/);
  assert.match(detailPage, /ChangeSpecificationDetail/);
  assert.match(detail, /action: "update_draft"/);
  assert.match(detail, /action: "submit"/);
  assert.match(detail, /action: "decision"/);
});

test("Outcome Ledger is decision-aware only for real execution links and preserves legacy recommendation semantics", async () => {
  const [outcomeLedger, outcomesPage, printPage] = await Promise.all([
    text("lib/outcome-ledger.ts"),
    text("app/app/outcomes/page.tsx"),
    text("app/app/outcomes/print/page.tsx"),
  ]);
  assert.match(outcomeLedger, /changeSpecificationId/);
  assert.match(outcomeLedger, /changeTitle/);
  assert.match(outcomeLedger, /label: linkedChange \? "Execution asset" : "Recommendation"/);
  assert.match(outcomeLedger, /The reviewed recommendation was approved as an action\./);
  assert.match(outcomeLedger, /Observed before-and-after association only\. This record does not establish that the applied change caused the result\./);
  assert.match(outcomesPage, /change_execution_assets/);
  assert.match(outcomesPage, /change_specifications/);
  assert.match(outcomesPage, /record\.changeSpecificationId &&/);
  assert.match(printPage, /record\.changeSpecificationId \?/);
  assert.match(printPage, /Legacy recommendation/);
  assert.match(printPage, /does not establish that the applied change caused the result/i);
});
