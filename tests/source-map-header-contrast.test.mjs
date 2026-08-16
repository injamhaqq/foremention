import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const [css, sourceMapTable] = await Promise.all([
  text("app/globals.css"),
  text("components/source-map-table.tsx"),
]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function declaration(stylesheet, selector, property) {
  const block = stylesheet.match(new RegExp(`${escapeRegex(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `Missing CSS rule for ${selector}`);
  const value = block[1].match(new RegExp(`(?:^|;)\\s*${escapeRegex(property)}\\s*:\\s*([^;]+)`));
  assert.ok(value, `Missing ${property} declaration for ${selector}`);
  return value[1].trim();
}

function resolveColor(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const variable = value.match(/^var\((--[a-z0-9-]+)\)$/i)?.[1];
  assert.ok(variable, `Expected a six-digit CSS color or variable, received ${value}`);
  const resolved = css.match(new RegExp(`${escapeRegex(variable)}\\s*:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(resolved, `Could not resolve ${variable}`);
  return resolved.toLowerCase();
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test("Source Map table headers meet WCAG AA contrast on their rendered background", () => {
  assert.match(sourceMapTable, /className="data-row data-row--head"/);
  assert.match(sourceMapTable, /# \/ source/);
  assert.match(sourceMapTable, /Evidence/);
  assert.match(sourceMapTable, /Brand review/);
  assert.match(sourceMapTable, /Crawler/);
  assert.match(sourceMapTable, /Entry route/);
  assert.match(sourceMapTable, /Next step/);

  const foreground = resolveColor(declaration(css, ".data-row--head", "color"));
  const background = resolveColor(declaration(css, ".data-row--head", "background"));
  const ratio = contrastRatio(foreground, background);

  assert.ok(
    ratio >= 4.5,
    `Source Map table headers must have at least 4.5:1 contrast; observed ${ratio.toFixed(2)}:1 (${foreground} on ${background})`,
  );
});
