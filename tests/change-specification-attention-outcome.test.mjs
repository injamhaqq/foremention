import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Attention leads with the next company decisions without a vanity score", async () => {
  const [page, list] = await Promise.all([
    text("app/app/page.tsx"),
    text("components/change-specification-priority-list.tsx"),
  ]);
  assert.match(page, /What should we change next\?/);
  assert.match(list, /DO_NOW/);
  assert.match(list, /TEST_FIRST/);
  assert.match(list, /DO_NOT_DO/);
  assert.match(list, /MONITOR_ONLY/);
  assert.match(list, /INSUFFICIENT_EVIDENCE/);
  assert.doesNotMatch(list, /Leadership Score|Recommendation Engineering Score|\/\s*100/);
  assert.match(list, /Foremention will not manufacture actions without reviewed evidence/i);
});

test("Outcome ledger and print read optional Change Specification links while preserving non-causal wording", async () => {
  const [outcomeLedger, outcomesPage, printPage] = await Promise.all([
    text("lib/outcome-ledger.ts"),
    text("app/app/outcomes/page.tsx"),
    text("app/app/outcomes/print/page.tsx"),
  ]);
  assert.match(outcomeLedger, /changeSpecificationId/);
  assert.match(outcomeLedger, /changeTitle/);
  assert.match(outcomeLedger, /Observed before-and-after association only\. This record does not establish that the applied change caused the result\./);
  assert.match(outcomesPage, /change_execution_assets/);
  assert.match(outcomesPage, /change_specifications/);
  assert.match(printPage, /Change Specification/);
  assert.match(printPage, /does not establish that the applied change caused the result/i);
});
