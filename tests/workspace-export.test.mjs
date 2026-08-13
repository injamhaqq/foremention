import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createZipArchive } from "../lib/zip-archive.ts";
import { rowsToCsv } from "../lib/export-format.ts";

test("workspace export creates a ZIP with spreadsheet-safe CSV cells", () => {
  const csv = rowsToCsv([
    { title: "=WEBSERVICE(\"https://example.test\")", count: -2, tags: ["real", "reviewed"] },
    { title: "   =HYPERLINK(\"https://example.test\")", count: 3, tags: ["bounded"] },
    { title: "\t=CMD|'/C calc'!A0", count: 4, tags: ["bounded"] },
  ]);
  assert.match(csv, /"'=WEBSERVICE/);
  assert.match(csv, /"'   =HYPERLINK/);
  assert.match(csv, /"'\t=CMD/);
  assert.match(csv, /"-2"/);
  assert.match(csv, /real/);
  const archive = createZipArchive([{ name: "manifest.json", content: "{}" }, { name: "csv/runs.csv", content: csv }]);
  const bytes = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  assert.equal(bytes.getUint32(0, true), 0x04034b50);
  assert.equal(bytes.getUint32(archive.byteLength - 22, true), 0x06054b50);
});

test("full export is owner-only, tenant-filtered, and excludes secret-bearing tables", () => {
  const route = readFileSync("app/api/export/workspace/route.ts", "utf8");
  const exporter = readFileSync("lib/workspace-export.ts", "utf8");
  const format = readFileSync("lib/export-format.ts", "utf8");
  assert.match(route, /role !== "owner"/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(exporter, /organization_id=eq\.\$\{organizationId\}/);
  assert.match(format, /csvCell/);
  for (const dataset of ["runs", "run_answers", "citations", "source_map_entries", "evidence_items", "placements"]) assert.match(exporter, new RegExp(`"${dataset}"`));
  for (const forbidden of ["integration_credentials", "workspace_webhook_endpoints", "invitations"]) assert.doesNotMatch(exporter, new RegExp(`"${forbidden}"`));
  assert.match(exporter, /Provider observations remain distinct from human-reviewed conclusions/);
});

test("full export uses real composite keys instead of ordering every dataset by id", () => {
  const exporter = readFileSync("lib/workspace-export.ts", "utf8");
  assert.match(exporter, /run_prompt_selections:\s*"run_id\.asc,prompt_id\.asc"/);
  assert.match(exporter, /verified_claim_evidence:\s*"claim_id\.asc,evidence_item_id\.asc"/);
  assert.match(exporter, /datasetOrder\[table\]\s*\|\|\s*"id\.asc"/);
  assert.match(exporter, /order=\$\{order\}/);
});
