import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("pricing sells Foremention outcomes without turning the page into a stale vendor directory", async () => {
  const pricing = await text("app/pricing/page.tsx");

  assert.match(pricing, /Know what AI says about your brand/i);
  assert.match(pricing, /planned paid packaging/i);
  assert.match(pricing, /\$149/);
  assert.match(pricing, /\$499/);
  assert.match(pricing, /Custom/);
  assert.match(pricing, /Join private beta/i);
  assert.match(pricing, /does not charge a card/i);
  assert.match(pricing, /does not.*activate.*Core, Signal, or Intelligence/is);

  assert.doesNotMatch(pricing, /pricingComparison\s*=/);
  assert.doesNotMatch(pricing, /peec\.ai\/pricing/i);
  assert.doesNotMatch(pricing, /scrunch\.com\/pricing/i);
  assert.doesNotMatch(pricing, /tryprofound\.com\/pricing/i);
});
