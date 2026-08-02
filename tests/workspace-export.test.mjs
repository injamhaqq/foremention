import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createZipArchive } from "../lib/zip-archive.ts";
import { rowsToCsv } from "../lib/export-format.ts";

test("workspace export creates a ZIP with safe CSV cells", () => {
  const csv = rowsToCsv([{ title: "=WEBSERVICE(\"https://example.test\")", count: -2, tags: ["real", "reviewed"] }]);
  assert.match(csv, /"'=WEBSERVICE/);
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
  assert.match(route, /role !== "owner"/);
  assert.match(route, /organizationId: context\.organizationId/);
  assert.match(exporter, /organization_id=eq\.\$\{organizationId\}/);
  for (const dataset of ["runs", "run_answers", "citations", "source_map_entries", "evidence_items", "placements"]) assert.match(exporter, new RegExp(`"${dataset}"`));
  for (const forbidden of ["integration_credentials", "workspace_webhook_endpoints", "invitations"]) assert.doesNotMatch(exporter, new RegExp(`"${forbidden}"`));
  assert.match(exporter, /Provider observations remain distinct from human-reviewed conclusions/);
});
