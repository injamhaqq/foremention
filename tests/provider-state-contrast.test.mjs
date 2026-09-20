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

test("rate-limited provider state uses a dark warning foreground on the pale warning badge", async () => {
  const css = await text("app/accessibility-hardening.css");
  assert.match(
    css,
    /\.app-frame \.provider-state--limited\s*\{[^}]*background:\s*#fff0a1 !important;[^}]*color:\s*#493a00 !important;[^}]*\}/s,
  );
});
