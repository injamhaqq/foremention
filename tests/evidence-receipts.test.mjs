// Evidence receipts: every saved AI answer keeps its text plus a reproducible
// SHA-256 content hash. Golden vectors below were computed by the production
// Postgres 17 expression in private.answer_text_sha256 (read-only query,
// 2026-10-14), so runtime and database normalization are pinned together.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  ANSWER_TEXT_HASH_VERSION,
  answerEvidenceReceipt,
  normalizeAnswerTextForHash,
} from "../lib/evidence-receipt.ts";

const root = new URL("../", import.meta.url);
const MIGRATION = "supabase/migrations/20261014120000_run_answer_evidence_receipts.sql";

const POSTGRES_GOLDEN = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["616263", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ["202048656c6c6f0d0a576f726c640d0a0920", "35c6b9f66dceb6cf8f733d08689564e420e18eb40250d9435352617c027f36d6"],
  ["43616665cc81206175206c616974", "793e7643ce558259f6fe71f9ecaaf268acbcd011a2bb4c7f561df05a133d4d08"],
  ["6c696e65310d6c696e65320b0c", "683376e290829b482c2655745caffa7a1dccfa10afaa62dac2b42dd6c68d0f83"],
  ["c2a06e627370206b657074c2a0", "d939b37dec3320e60d6663862ed114cbbb7c0b61e4ef6ac925a58bd72065c50a"],
  ["f09f9a8020466f72656d656e74696f6e20e2809420e2809c71756f746573e2809d", "f6b483e279f4a48b668170120525fce54b43db604787967ed840f13eae22f242"],
];

test("runtime receipt matches the production Postgres normalization byte for byte", async () => {
  for (const [inputHex, expected] of POSTGRES_GOLDEN) {
    const text = Buffer.from(inputHex, "hex").toString("utf8");
    const receipt = await answerEvidenceReceipt(text);
    assert.equal(receipt.answer_text_sha256, expected, `vector ${inputHex}`);
    assert.equal(receipt.answer_text_hash_version, ANSWER_TEXT_HASH_VERSION);
    assert.equal(receipt.answer_text_sha256, createHash("sha256").update(normalizeAnswerTextForHash(text), "utf8").digest("hex"));
  }
});

test("normalization is NFC, CRLF/CR to LF, ASCII edge trim only", () => {
  assert.equal(normalizeAnswerTextForHash("  a\r\nb\rc \t\v\f"), "a\nb\nc");
  assert.equal(normalizeAnswerTextForHash("Cafe\u0301"), "Caf\u00e9");
  assert.equal(normalizeAnswerTextForHash("\u00a0kept\u00a0"), "\u00a0kept\u00a0", "NBSP is content");
  assert.equal(normalizeAnswerTextForHash("inner  \n\n spaces"), "inner  \n\n spaces", "inner whitespace is preserved");
});

test("receipts are deterministic and sensitive to content", async () => {
  const a = await answerEvidenceReceipt("Acme is recommended.");
  const b = await answerEvidenceReceipt("Acme is recommended.\r\n");
  const c = await answerEvidenceReceipt("Acme is not recommended.");
  assert.equal(a.answer_text_sha256, b.answer_text_sha256);
  assert.notEqual(a.answer_text_sha256, c.answer_text_sha256);
  await assert.rejects(() => answerEvidenceReceipt(undefined), TypeError);
});

test("migration is additive, stamps at write time, backfills, and pins the same normalization", async () => {
  const sql = (await readFile(new URL(MIGRATION, root), "utf8")).toLowerCase();
  const code = sql.replace(/--.*$/gm, "");
  assert.doesNotMatch(code, /\bdrop\s+(table|column|function|trigger|view|index|constraint|policy|schema)\b/);
  assert.doesNotMatch(code, /\btruncate\b|\bdelete\s+from\b|alter\s+column\s+\w+\s+(set\s+data\s+)?type\b/);
  assert.match(code, /add column if not exists answer_text_sha256 text/);
  assert.match(code, /add column if not exists answer_text_hash_version text/);
  assert.match(code, /'\^\[0-9a-f\]\{64\}\$'/);
  assert.match(code, /create or replace trigger stamp_run_answer_evidence_receipt\s+before insert or update on public\.run_answers/);
  assert.match(code, /normalize\(p_text, nfc\)/);
  assert.match(code, /chr\(13\) \|\| chr\(10\), chr\(10\)\), chr\(13\), chr\(10\)/);
  assert.match(code, /' ' \|\| chr\(9\) \|\| chr\(10\) \|\| chr\(11\) \|\| chr\(12\)/);
  assert.match(code, /sha256\(/);
  assert.match(code, new RegExp(`'${ANSWER_TEXT_HASH_VERSION.replace(/\./g, "\\.")}'`));
  assert.match(code, /update public\.run_answers\s+set answer_text_sha256 = private\.answer_text_sha256\(answer_text\)/);
  assert.match(code, /revoke all on function private\.answer_text_sha256\(text\) from public, anon, authenticated/);
  assert.match(code, /revoke all on function private\.stamp_run_answer_evidence_receipt\(\) from public, anon, authenticated/);
});

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(new URL(dir, root), { withFileTypes: true })) {
    const rel = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...await sourceFiles(`${rel}/`));
    else if (/\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(rel);
  }
  return out;
}

test("every application write path to run_answers carries the evidence receipt", async () => {
  const files = [...await sourceFiles("app/"), ...await sourceFiles("lib/"), ...await sourceFiles("worker/")];
  const writers = [];
  for (const file of files) {
    const source = await readFile(new URL(file, root), "utf8");
    // A run_answers insert/upsert is a REST call on run_answers whose options declare method "POST".
    for (const match of source.matchAll(/[`"']run_answers[?`"']/g)) {
      const window = source.slice(match.index, match.index + 2500);
      if (/^[^\n]*\{\s*\n\s*method:\s*"POST"/.test(window)) writers.push({ file, body: window });
    }
  }
  assert.deepEqual(writers.map((w) => w.file), ["lib/jobs/inngest.ts"], "the collection job is the only answer writer; a new writer must add a receipt");
  for (const writer of writers) {
    assert.match(writer.body, /answer_text:\s*answer\.answer/);
    assert.match(writer.body, /answer_text_sha256:\s*receipt\.answer_text_sha256/);
    assert.match(writer.body, /answer_text_hash_version:\s*receipt\.answer_text_hash_version/);
  }
  const inngest = await readFile(new URL("lib/jobs/inngest.ts", root), "utf8");
  assert.match(inngest, /const receipt = await answerEvidenceReceipt\(answer\.answer\);/);
});
