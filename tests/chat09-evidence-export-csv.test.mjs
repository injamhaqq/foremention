import assert from "node:assert/strict";
import test from "node:test";
import { csvCell } from "../lib/csv.ts";

// QA09-32: synthetic, deterministic CSV safety checks. These validate only
// the reusable cell encoder, not an authenticated export HTTP transaction.
test("QA09-32 neutralizes formula-capable prefixes in untrusted evidence", () => {
  const inputs = [
    "=1+2",
    " +SUM(A1:A2)",
    "-1+2",
    "@HYPERLINK(A1)",
    "\t=WEBSERVICE(A1)",
    "\r=1+2",
    "\n=1+2",
    "  =1+2",
  ];
  for (const input of inputs) {
    const encoded = csvCell(input);
    assert.equal(encoded, `"\'${input.replaceAll('"', '""')}"`, "untrusted formula prefix was not neutralized");
  }
});

test("QA09-32 preserves literal quoted evidence and non-string scalar values", () => {
  assert.equal(csvCell('An answer with "quotes", commas'), '"An answer with ""quotes"", commas"');
  assert.equal(csvCell('=HYPERLINK("https://example.org","go")'), '"\'=HYPERLINK(""https://example.org"",""go"")"');
  assert.equal(csvCell(7), '"7"');
  assert.equal(csvCell(false), '"false"');
  assert.equal(csvCell(null), '""');
});
