import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const css = await readFile(new URL("app/globals.css", root), "utf8");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function declaration(selector, property) {
  const block = css.match(new RegExp(`${escapeRegex(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `Missing CSS rule for ${selector}`);
  const value = block[1].match(new RegExp(`(?:^|;)\\s*${escapeRegex(property)}\\s*:\\s*([^;]+)`));
  assert.ok(value, `Missing ${property} declaration for ${selector}`);
  return value[1].trim();
}

function resolveColor(value) {
  const variable = value.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (variable) {
    const match = css.match(new RegExp(`${escapeRegex(variable[1])}\\s*:\\s*(#[0-9a-f]{6})`, "i"));
    assert.ok(match, `Missing color variable ${variable[1]}`);
    return match[1].toLowerCase();
  }
  assert.match(value, /^#[0-9a-f]{6}$/i, `Expected a six-digit CSS color, received ${value}`);
  return value.toLowerCase();
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
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

test("completed dashboard setup text meets WCAG AA contrast on the authenticated app background", () => {
  const background = resolveColor(declaration(".app-frame", "background"));
  const selectors = [".setup-complete > strong", ".setup-complete > span"];
  const failures = selectors.flatMap((selector) => {
    const foreground = resolveColor(declaration(selector, "color"));
    const ratio = contrastRatio(foreground, background);
    return ratio >= 4.5 ? [] : [{ selector, foreground, background, ratio: Number(ratio.toFixed(2)) }];
  });

  assert.deepEqual(
    failures,
    [],
    `Authenticated setup-complete text must have at least 4.5:1 contrast: ${JSON.stringify(failures)}`,
  );
});
