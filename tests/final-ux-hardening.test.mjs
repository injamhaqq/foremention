import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appShell = await readFile(new URL("../components/app-shell.tsx", import.meta.url), "utf8");
const productPolish = await readFile(new URL("../app/product-polish.css", import.meta.url), "utf8");
const sitemap = await readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8");

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

function compositeHex(foreground, background, opacity) {
  const fg = foreground.match(/[0-9a-f]{2}/gi).map((channel) => Number.parseInt(channel, 16));
  const bg = background.match(/[0-9a-f]{2}/gi).map((channel) => Number.parseInt(channel, 16));
  const channels = fg.map((channel, index) => Math.round((channel * opacity) + (bg[index] * (1 - opacity))));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

test("authenticated workspace exposes a keyboard skip target", () => {
  assert.match(appShell, /href="#app-content"/);
  assert.match(appShell, /id="app-content"/);
  assert.match(appShell, /tabIndex=\{-1\}/);
});

test("desktop workspace navigation arrows retain WCAG AA text contrast", () => {
  const match = productPolish.match(/\.app-sidebar__navigation \.sidebar-nav a span \{ opacity: ([0-9.]+); \}/);
  assert.ok(match, "workspace navigation arrow opacity rule must remain explicit");
  const opacity = Number(match[1]);
  const renderedArrow = compositeHex("#cfc8be", "#041514", opacity);
  const ratio = contrastRatio(renderedArrow, "#041514");
  assert.ok(ratio >= 4.5, `workspace navigation arrow contrast ${ratio.toFixed(2)}:1 must be at least 4.5:1`);
});

test("inverse workspace wordmark text owns its dark contrast backdrop", () => {
  assert.match(productPolish, /\.app-sidebar > \.wordmark > \.wordmark__name \{ background: var\(--ink\); \}/);
  const ratio = contrastRatio("#f3fff9", "#041514");
  assert.ok(ratio >= 4.5, `inverse workspace wordmark contrast ${ratio.toFixed(2)}:1 must be at least 4.5:1`);
});

test("getting-started helper text stays readable on the mint hover state", () => {
  assert.match(productPolish, /\.getting-started li a:hover small \{ color: var\(--ink\); \}/);
  const ratio = contrastRatio("#041514", "#70f0c6");
  assert.ok(ratio >= 4.5, `getting-started hover helper contrast ${ratio.toFixed(2)}:1 must be at least 4.5:1`);
});

test("public ROI scenario tool is discoverable in the sitemap", () => {
  assert.match(sitemap, /path: "\/roi"/);
  assert.match(sitemap, /const updated = new Date\("\d{4}-\d{2}-\d{2}T00:00:00Z"\)/);
});
