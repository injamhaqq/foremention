import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const value = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((offset) => channel(Number.parseInt(value.slice(offset, offset + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test("question-intelligence status chips stay on the dark workspace palette with AA small-text contrast", async () => {
  const css = await readFile(new URL("app/accessibility-hardening.css", root), "utf8");
  const rule = css.match(/\.app-frame \.chip-row > \.status-chip\s*\{([^}]+)\}/)?.[1] || "";
  assert.ok(rule, "expected a scoped question-intelligence chip rule");
  assert.match(rule, /background:\s*#151817/i);
  assert.match(rule, /color:\s*#65B58E/i);
  assert.ok(contrast("#65B58E", "#151817") >= 4.5, "question-intelligence chips must meet WCAG AA contrast");
});
