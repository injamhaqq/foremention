import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20261013180000_run_answer_text_sha256.sql", "utf8");

test("answer receipts carry a database-computed SHA-256 of the exact UTF-8 text", () => {
  assert.match(sql, /add column if not exists answer_text_sha256 text\s+generated always as \(private\.utf8_sha256\(answer_text\)\) stored/);
  assert.match(sql, /convert_to\(p_text, 'UTF8'\)/);
  assert.doesNotMatch(sql, /::bytea/, "text::bytea parses backslash escapes and must not be used for hashing");
  assert.match(sql, /revoke all on function private\.utf8_sha256\(text\) from public, anon, authenticated/);
});
