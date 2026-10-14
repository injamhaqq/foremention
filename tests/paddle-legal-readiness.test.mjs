import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Paddle refund page, footer link and terms give buyers a discoverable support path", () => {
  const page = readFileSync(new URL("../app/refund-policy/page.tsx", import.meta.url), "utf8");
  const footer = readFileSync(new URL("../components/public-shell.tsx", import.meta.url), "utf8");
  const terms = readFileSync(new URL("../app/terms/page.tsx", import.meta.url), "utf8");
  assert.match(page, /path: "\/refund-policy"/);
  assert.match(page, /https:\/\/www\.paddle\.com\/legal\/refund-policy/);
  assert.match(page, /https:\/\/paddle\.net/);
  assert.match(page, /Merchant of Record/);
  assert.match(footer, /<Link href="\/refund-policy">Refund policy<\/Link>/);
  assert.match(terms, /Paddle, which is the Merchant of Record/);
  assert.match(terms, /href="\/refund-policy"/);
});
