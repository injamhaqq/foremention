// Chat07 namespaced integrity checks for the repository/source crosswalk.
// Run: node --test docs/execution/attach-v1/07-proposals/crosswalk-integrity.test.mjs
// Standard library only; reads repository files, makes no network calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const here = fileURLToPath(new URL("./", import.meta.url));
const root = join(here, "../../../../");
const read = (p) => readFileSync(join(root, p), "utf8");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [header, ...data] = rows.filter((r) => r.length > 1 || r[0] !== "");
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const crosswalk = parseCsv(read("docs/execution/attach-v1/07-proposals/canonical-repository-crosswalk.csv"));
const occurrences = parseCsv(read("docs/execution/attach-v1/07-proposals/source-occurrences.csv"));
const register124 = parseCsv(read("docs/repository-register/register-2026-10.csv"));
const norm = (u) => u.trim().toLowerCase().replace(/\/+$/, "").replace(/\.git$/, "");

const EXPECTED = { KEEP: 16, DEFER: 78, "REFERENCE ONLY": 38, REJECT: 18, UNRESOLVED: 4 };

test("crosswalk has 154 unique canonical identities with exactly one allowed disposition each", () => {
  assert.equal(crosswalk.length, 154);
  assert.equal(new Set(crosswalk.map((r) => norm(r.canonical_url))).size, 154);
  const counts = {};
  for (const r of crosswalk) {
    assert.ok(Object.hasOwn(EXPECTED, r.selected_disposition), `${r.canonical_url}: ${r.selected_disposition}`);
    assert.ok(r.justification.trim().length > 20, `${r.canonical_url} needs a justification`);
    assert.ok(r.current_use_2026_10_13.trim(), `${r.canonical_url} needs current-use evidence`);
    assert.ok(r.identity_api_2026_10_13.trim(), `${r.canonical_url} needs identity evidence`);
    counts[r.selected_disposition] = (counts[r.selected_disposition] ?? 0) + 1;
  }
  assert.deepEqual(counts, EXPECTED);
  assert.ok(!crosswalk.some((r) => /\bREMOVE\b/.test(r.selected_disposition)), "absent dependencies are never labelled REMOVE");
});

test("source occurrences preserve 67 + 124 + 54 = 245 rows and every occurrence maps to a canonical row", () => {
  assert.equal(occurrences.length, 245);
  const by = {};
  for (const o of occurrences) by[o.source_register] = (by[o.source_register] ?? 0) + 1;
  assert.deepEqual(by, { R67: 67, R124: 124, COMP: 54 });
  assert.equal(new Set(occurrences.map((o) => `${o.source_register}:${o.source_row}`)).size, 245);
  const canon = new Set(crosswalk.map((r) => norm(r.canonical_url)));
  for (const o of occurrences) assert.ok(canon.has(norm(o.canonical_url)), `orphan occurrence ${o.source_register}:${o.source_row}`);
  const seen = new Set(occurrences.map((o) => norm(o.canonical_url)));
  for (const r of crosswalk) assert.ok(seen.has(norm(r.canonical_url)), `canonical row without source ${r.canonical_url}`);
});

test("committed R124 register on main is byte-identical (CRLF) to the checklist source and reconciles row-for-row", () => {
  const lf = readFileSync(join(root, "docs/repository-register/register-2026-10.csv"));
  const crlf = Buffer.from(lf.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
  assert.equal(createHash("sha256").update(crlf).digest("hex"), "67df3c6aa76795f61dfc7a9da8b78e28a2ca5234df0d01f356a9ca581acc3ada");
  assert.equal(register124.length, 124);
  const byUrl = new Map(crosswalk.map((r) => [norm(r.canonical_url), r]));
  register124.forEach((reg, i) => {
    const row = byUrl.get(norm(reg.Canonical));
    assert.ok(row, `R124 row ${i + 1} ${reg.Canonical} missing from crosswalk`);
    assert.equal(row.R124_row, String(i + 1));
    assert.equal(row.R124_original_disposition, reg.Disposition);
  });
});

test("KEEP rows cite present usage; REJECT/UNRESOLVED identities are not direct packages", () => {
  const manifest = JSON.parse(read("package.json"));
  const direct = new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }));
  const lock = read("pnpm-lock.yaml");
  const lockKeys = new Set([...lock.matchAll(/^ {2}'?(@?[^@\s':]+)@/gm)].map((m) => m[1].toLowerCase()));
  for (const r of crosswalk) {
    if (r.selected_disposition === "KEEP") assert.doesNotMatch(r.current_use_2026_10_13, /^Absent/, `${r.canonical_url} KEEP but absent`);
    if (r.selected_disposition === "REJECT" || r.selected_disposition === "UNRESOLVED") {
      const [owner, repo] = new URL(r.canonical_url).pathname.split("/").filter(Boolean).map((s) => s.toLowerCase());
      for (const name of [repo, `@${owner}/${repo}`]) {
        assert.ok(!direct.has(name), `${r.canonical_url} must not be a direct dependency`);
        assert.ok(!lockKeys.has(name), `${r.canonical_url} must not be a lockfile package`);
      }
    }
  }
});

test("changed dispositions carry an explicit revision reason", () => {
  for (const r of crosswalk) {
    assert.ok(r.disposition_revision_2026_10_13.trim(), r.canonical_url);
    if (!r.disposition_revision_2026_10_13.startsWith("unchanged")) {
      assert.match(r.disposition_revision_2026_10_13, new RegExp(`-> ${r.selected_disposition}:`), r.canonical_url);
    }
  }
});
