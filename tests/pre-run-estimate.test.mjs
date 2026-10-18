import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("run launcher shows bounded usage and cost before dispatch", async () => {
  const [data, launcher, route, accessibility] = await Promise.all([
    text("lib/data.ts"),
    text("components/run-launcher.tsx"),
    text("app/api/runs/route.ts"),
    text("app/app/workspace-accessibility.css"),
  ]);

  assert.match(data, /estimateReservedRunCost/);
  assert.match(data, /estimatedMaxCostPerQuestionUsd/);
  assert.match(launcher, /Estimated usage/);
  assert.match(launcher, /Reserved maximum cost/);
  assert.match(launcher, /Estimate only/);
  assert.match(launcher, /selectedProvider\.estimatedMaxCostPerQuestionUsd \* selectedPrompts\.length/);
  assert.match(route, /estimatedMaximumCost = estimateReservedRunCost/);
  assert.match(route, /exceeds the configured per-run spending ceiling/);
  assert.match(accessibility, /\.app-frame \.run-estimate \{[\s\S]*--muted: #455a55;[\s\S]*color: #10110f;/);
  assert.match(accessibility, /\.app-frame \.run-estimate strong \{[\s\S]*color: #10110f;/);
  assert.match(accessibility, /\.app-frame \.run-estimate span,[\s\S]*\.app-frame \.run-estimate p \{[\s\S]*color: #455a55;/);
});


function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const [r, g, b] = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function colorToken(css, token) {
  const match = css.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6})`, "i"));
  assert.ok(match, `${token} must remain a concrete canonical color token`);
  return match[1];
}

test("run estimate inherits the canonical signed-in surface with WCAG AA contrast", async () => {
  const [css, canonical] = await Promise.all([
    text("app/globals.css"),
    text("app/canonical-system.css"),
  ]);

  assert.match(css, /\.run-estimate \{[^}]*background: var\(--paper\);/);
  assert.doesNotMatch(css, /\.run-estimate \{[^}]*background: #fbfbf6;/i);
  assert.match(canonical, /\.app-frame \{[\s\S]*?--paper: var\(--fm-bg\);[\s\S]*?--muted: var\(--fm-muted\);/);

  const background = colorToken(canonical, "fm-bg");
  const muted = colorToken(canonical, "fm-muted");
  const primary = colorToken(canonical, "fm-clean");

  assert.ok(contrastRatio(muted, background) >= 4.5, "muted estimate copy must meet WCAG AA contrast");
  assert.ok(contrastRatio(primary, background) >= 4.5, "primary estimate values must meet WCAG AA contrast");
});
