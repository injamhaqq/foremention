import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { csvCell } from "../lib/csv.ts";

const root = new URL("../", import.meta.url);

const dangerous = [
  "=2+2",
  "+SUM(A1:A2)",
  "-10+20",
  "@SUM(1,1)",
  "   =HYPERLINK(\"https://example.com\")",
  "\t=CMD|'/C calc'!A0",
  "\r=1+1",
  "\n=1+1",
];

test("CSV text cells neutralize spreadsheet formula prefixes", () => {
  for (const value of dangerous) {
    const encoded = csvCell(value);
    assert.ok(encoded.startsWith("\"'"), `expected neutralized CSV cell for ${JSON.stringify(value)}`);
  }
});

test("CSV encoding preserves ordinary values and escapes quotes", () => {
  assert.equal(csvCell("https://example.com/path"), '"https://example.com/path"');
  assert.equal(csvCell("Normal title"), '"Normal title"');
  assert.equal(csvCell('He said "hello"'), '"He said ""hello"""');
  assert.equal(csvCell(12), '"12"');
  assert.equal(csvCell(-12), '"-12"');
  assert.equal(csvCell(true), '"true"');
  assert.equal(csvCell(null), '""');
});

test("source map export is viewer-bound and cannot accept a caller organization selector", async () => {
  const route = await readFile(new URL("app/api/export/source-map/route.ts", root), "utf8");
  assert.match(route, /const viewer = await getViewer\(\)/);
  assert.match(route, /if \(!viewer\).*status: 401/s);
  assert.match(route, /const rows = await loadTruthfulSourceMap\(viewer\)/);
  assert.match(route, /\.map\(csvCell\)/);
  assert.match(route, /"cache-control": "no-store"/);
  assert.match(route, /"x-content-type-options": "nosniff"/);
  assert.doesNotMatch(route, /searchParams|organizationId|organization_id|projectId|project_id|serviceRole/);
});
