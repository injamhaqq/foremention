import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Paddle refund page and footer provide a discoverable support path without activating payments", () => {
  const page = readFileSync(new URL("../app/refund-policy/page.tsx", import.meta.url), "utf8");
  const footer = readFileSync(new URL("../components/public-shell.tsx", import.meta.url), "utf8");
  const terms = readFileSync(new URL("../app/terms/page.tsx", import.meta.url), "utf8");

  assert.match(page, /path: "\/refund-policy"/);
  assert.match(page, /https:\/\/www\.paddle\.com\/legal\/refund-policy/);
  assert.match(page, /https:\/\/paddle\.net/);
  assert.match(page, /Self-serve payment activation is not currently enabled/);
  assert.match(footer, /<Link href="\/refund-policy">Refund policy<\/Link>/);
  assert.match(terms, /Paddle is the Merchant of Record/);
  assert.match(terms, /href="\/refund-policy"/);
});
