import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const [globalCss, workspaceCss, layout, dashboard] = await Promise.all([
  text("app/globals.css"),
  text("app/app/workspace-accessibility.css"),
  text("app/app/layout.tsx"),
  text("app/app/page.tsx"),
]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function declaration(css, selector, property) {
  const block = css.match(new RegExp(`${escapeRegex(selector)}\\s*\\{([^}]*)\\}`));
  assert.ok(block, `Missing CSS rule for ${selector}`);
  const value = block[1].match(new RegExp(`(?:^|;)\\s*${escapeRegex(property)}\\s*:\\s*([^;]+)`));
  assert.ok(value, `Missing ${property} declaration for ${selector}`);
  return value[1].trim();
}

function resolveColor(value) {
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
  assert.match(layout, /import "\.\/workspace-accessibility\.css";/);
  assert.match(dashboard, /<main className="workspace"/);
  assert.match(dashboard, /<section className="setup-complete"/);

  const background = resolveColor(declaration(globalCss, ".app-frame", "background"));
  const selectors = [
    ".workspace .setup-complete > strong",
    ".workspace .setup-complete > span",
  ];
  const failures = selectors.flatMap((selector) => {
    const foreground = resolveColor(declaration(workspaceCss, selector, "color"));
    const ratio = contrastRatio(foreground, background);
    return ratio >= 4.5 ? [] : [{ selector, foreground, background, ratio: Number(ratio.toFixed(2)) }];
  });

  assert.deepEqual(
    failures,
    [],
    `Authenticated setup-complete text must have at least 4.5:1 contrast: ${JSON.stringify(failures)}`,
  );
});
