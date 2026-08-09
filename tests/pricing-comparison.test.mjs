import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("pricing comparison uses dated, first-party plan facts and honest activation language", async () => {
  const pricing = await text("app/pricing/page.tsx");
  assert.match(pricing, /August 9, 2026/);
  assert.match(pricing, /Peec AI[\s\S]*Starter[\s\S]*\$95 \/ month[\s\S]*https:\/\/peec\.ai\/pricing/);
  assert.match(pricing, /Scrunch[\s\S]*Starter[\s\S]*\$250 \/ month[\s\S]*https:\/\/scrunch\.com\/pricing\//);
  assert.match(pricing, /Profound[\s\S]*Growth[\s\S]*\$399 \/ month[\s\S]*https:\/\/www\.tryprofound\.com\/pricing/);
  assert.match(pricing, /Prices can change/);
  assert.match(pricing, /not a working checkout until its payment integration is verified/);
});
