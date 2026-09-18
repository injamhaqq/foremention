import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/browser-acceptance-hardening.css", import.meta.url), "utf8");

function relativeLuminance(hex) {
  const rgb = hex.match(/[0-9a-f]{2}/gi).map((channel) => Number.parseInt(channel, 16) / 255);
  const [red, green, blue] = rgb.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("authenticated light semantic status pills force a dark canonical foreground", () => {
  assert.match(css, /\.app-frame\s+:where\(\s*\.pill--open,\s*\.pill--partial,\s*\.feasibility--high,\s*\.feasibility--medium\s*\)[\s\S]{0,120}color:\s*var\(--fm-bg\)/);
  assert.doesNotMatch(css, /\.pill--partial[\s\S]{0,120}color:\s*var\(--ink\)/);

  const openRatio = contrastRatio("#0D0F0E", "#DCECDF");
  const partialRatio = contrastRatio("#0D0F0E", "#FFF0A1");
  assert.ok(openRatio >= 4.5, `open status contrast ${openRatio.toFixed(2)}:1 must be at least 4.5:1`);
  assert.ok(partialRatio >= 4.5, `partial status contrast ${partialRatio.toFixed(2)}:1 must be at least 4.5:1`);
});

test("blocked and low light semantic pills retain an explicit readable foreground", () => {
  assert.match(css, /\.app-frame\s+:where\(\s*\.pill--blocked,\s*\.feasibility--low\s*\)[\s\S]{0,120}color:\s*#5f2f2a/i);
  const ratio = contrastRatio("#5F2F2A", "#F2D9D3");
  assert.ok(ratio >= 4.5, `blocked status contrast ${ratio.toFixed(2)}:1 must be at least 4.5:1`);
});
