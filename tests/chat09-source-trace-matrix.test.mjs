// Chat09 — integrity of the all-source-item acceptance matrix (71 historical
// index rows). Deterministic, file-only. It checks that every row carries an
// honest disposition; it does not prove any disposition is correct at runtime.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const VERDICTS = new Set(["VERIFIED_PASS_NONPROD", "IMPLEMENTED_PENDING_COMPOSED", "MANUAL_BRIDGE", "DEFERRED_DECISION", "BLOCKED"]);

test("Chat09 matrix preserves all 71 historical rows with source-faithful counts", async () => {
  const rows = parseCsv(await read("docs/execution/attach-v1/09-proposals/source-trace-71.csv"));
  assert.equal(rows.length, 71);
  const keys = new Set(rows.map((r) => `${r.source_file}#${r.source_data_row}`));
  assert.equal(keys.size, 71, "each (source file, row) appears exactly once");
  const perFile = {};
  for (const r of rows) perFile[r.source_file] = (perFile[r.source_file] || 0) + 1;
  assert.deepEqual(perFile, { "Commercial_Backlog_18.csv": 18, "Foremention_Master_Backlog_29.csv": 29, "Foremention_Master_Backlog_24.csv": 24 });
  assert.ok(!rows.some((r) => /Master_Backlog_28_v2/.test(r.source_file)), "the missing _28_v2 source is never fabricated");
});

test("Chat09 matrix gives every row an allowed verdict, evidence and an explicit gate", async () => {
  const rows = parseCsv(await read("docs/execution/attach-v1/09-proposals/source-trace-71.csv"));
  const byId = new Map();
  for (const r of rows) {
    const where = `${r.source_file}#${r.source_data_row} ${r.original_id}`;
    assert.ok(VERDICTS.has(r.chat09_verdict_2026_10_13), `${where}: verdict ${r.chat09_verdict_2026_10_13}`);
    assert.ok(r.chat09_evidence_2026_10_13.length > 10, `${where}: evidence`);
    assert.ok(r.exact_blocker_or_gate_2026_10_13.length > 10, `${where}: remaining gate must be explicit, even for passes`);
    assert.ok(r.owner_exact_head.length >= 7, `${where}: owner head`);
    assert.doesNotMatch(`${r.chat09_verdict_2026_10_13} ${r.chat09_evidence_2026_10_13}`, /\bproduction (pass|verified|proof achieved)|release approved|\bcertified/i, `${where}: no production certification language`);
    if (r.chat09_verdict_2026_10_13 === "VERIFIED_PASS_NONPROD") {
      assert.match(r.chat09_evidence_2026_10_13, /nonproduction only/, `${where}: a pass must declare its nonproduction scope`);
    }
    const prior = byId.get(r.original_id);
    if (prior) assert.equal(r.chat09_verdict_2026_10_13, prior, `${r.original_id}: duplicate source rows must share a verdict`);
    byId.set(r.original_id, r.chat09_verdict_2026_10_13);
  }
  assert.equal(byId.size, 47, "47 distinct historical IDs (FM-00 crosswalk count)");
  const verified = rows.filter((r) => r.chat09_verdict_2026_10_13 === "VERIFIED_PASS_NONPROD").length;
  assert.ok(verified < rows.length / 4, "verified passes stay a narrow, evidenced minority until a composed candidate exists");
});

test("Chat09 scenarios carry component evidence without upgrading end-to-end status", async () => {
  const fixture = JSON.parse(await read("tests/attach-v1-09/scenarios.json"));
  for (const id of ["QA09-33", "QA09-34", "QA09-35"]) assert.ok(fixture.scenarios.some((s) => s.id === id), `missing ${id}`);
  for (const s of fixture.scenarios) {
    assert.equal(s.evidence_status, "NOT_EXECUTED", `${s.id}: component receipts never upgrade end-to-end status`);
    assert.ok(typeof s.component_evidence === "string" && s.component_evidence.length > 3, `${s.id}: component_evidence`);
  }
  assert.match(fixture.component_evidence_policy, /never upgrades evidence_status/);
});
