import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("untested provider state keeps readable contrast on the authenticated dark workspace", async () => {
  const css = await text("app/accessibility-hardening.css");
  assert.match(
    css,
    /\.app-frame \.review-action \.provider-state--untested\s*\{[^}]*background:\s*#111412 !important;[^}]*color:\s*#aeb6af !important;[^}]*\}/s,
  );
});
