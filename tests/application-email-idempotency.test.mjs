import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../lib/application-email.ts", import.meta.url), "utf8");

test("application email supports a provider idempotency key", () => {
  assert.match(source, /idempotencyKey\?: string/);
  assert.match(source, /"Idempotency-Key": idempotencyKey/);
});

test("ambiguous provider receipt handling is fail-closed", () => {
  assert.match(source, /class ApplicationEmailSendUncertainError/);
  assert.match(source, /returned an unreadable receipt/);
  assert.match(source, /returned no delivery identifier/);
});
