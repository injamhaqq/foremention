// Fix track "ux" (2026-10-19), item 3: WCAG AA text contrast on the dark
// signed-in shell, and a print-friendly report view. Ratios are computed from
// the colours actually declared in the stylesheets (WCAG 2.x relative
// luminance), not from comments.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function luminance(hex) {
  let value = hex.replace("#", "");
  if (value.length === 3) value = [...value].map((c) => c + c).join("");
  const [r, g, b] = value.match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Last `color:` declared for an exact selector list in a stylesheet. */
function declaredColor(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  const matches = [...stripComments(css).matchAll(new RegExp(`(?:^|[},])\\s*${escaped}\\s*(?:,[^{]*)?\\{([^}]*)\\}`, "g"))];
  assert.ok(matches.length, `missing rule for ${selector}`);
  const body = matches.at(-1)[1];
  const color = body.match(/(?<![-\w])color:\s*(#[0-9a-f]{3,6})\b/i);
  assert.ok(color, `no hex color for ${selector}`);
  return color[1];
}

const SIDEBAR = "#090B0A";
const APP_BG = "#0D0F0E";
const SURFACE = "#151817";

test("signed-in text that failed WCAG AA now meets 4.5:1 against its real background", async () => {
  const [workspace, canonical] = await Promise.all([text("app/app/workspace-accessibility.css"), text("app/canonical-system.css")]);
  // Backgrounds are the canonical tokens these elements sit on.
  assert.match(canonical, /--fm-bg: #0D0F0E;/);
  assert.match(canonical, /--fm-surface: #151817;/);
  assert.match(canonical, /\.registered-workspace-sidebar \{[^}]*background: #090B0A;/);
  const checks = [
    [".workspace .setup-complete > strong", APP_BG],
    [".workspace .setup-complete > span", APP_BG],
    [".app-frame .sidebar-nav a span", SIDEBAR],
    [".app-frame .sidebar-company span", SIDEBAR],
    [".app-frame .app-user small", SURFACE],
    [".app-frame .canonical-contained-evidence .source-inspector__result dt", SURFACE],
    [".app-frame .run-failure .eyebrow", SURFACE],
    [".app-frame .run-failure p", SURFACE],
    [".app-frame .run-row__failure", SURFACE],
  ];
  for (const [selector, background] of checks) {
    const color = declaredColor(workspace, selector);
    const ratio = contrast(color, background);
    // Check against both dark surfaces so the text passes wherever it lands.
    assert.ok(ratio >= 4.5 && contrast(color, APP_BG) >= 4.5, `${selector}: ${color} on ${background} is ${ratio.toFixed(2)}:1`);
  }
  const placeholder = stripComments(workspace).match(/\.app-frame :where\(input, textarea, select\)::placeholder \{ color: (#[0-9A-F]{6});/i);
  assert.ok(placeholder && contrast(placeholder[1], SURFACE) >= 4.5, "placeholder text meets AA on the input surface");
});

test("the regressions being fixed really were below AA (guards the test itself)", () => {
  for (const [old, background] of [["#1f6b49", APP_BG], ["#455a55", APP_BG], ["#59645D", SIDEBAR], ["#69736C", SIDEBAR], ["#68736B", SURFACE], ["#667068", SURFACE], ["#727c74", SURFACE]]) {
    assert.ok(contrast(old, background) < 4.5, `${old} was expected to fail`);
  }
});

test("report document colours meet AA on screen", async () => {
  const css = await text("app/report-print.css");
  const token = (name) => stripComments(css).match(new RegExp(`--${name}: (#[0-9A-F]{6});`, "i"))[1];
  const paper = token("print-paper");
  for (const name of ["print-ink", "print-muted", "print-accent"]) {
    assert.ok(contrast(token(name), paper) >= 4.5, `${name} on paper`);
  }
  // Header band keeps the approved reverse wordmark on graphite.
  assert.match(css, /\.print-record > header \{[^}]*background: #0D0F0E;[^}]*print-color-adjust: exact;/);
  assert.ok(contrast("#D7DBD5", "#0D0F0E") >= 4.5);
});

test("print view strips app/public chrome and prints reports black on white", async () => {
  const [css, appLayout, recordPrint, outcomesPrint, toolbar, publicReport, sharedRecord] = await Promise.all([
    text("app/report-print.css"),
    text("app/app/layout.tsx"),
    text("app/app/runs/[id]/print/page.tsx"),
    text("app/app/outcomes/print/page.tsx"),
    text("components/report-print-toolbar.tsx"),
    text("app/report/[domain]/page.tsx"),
    text("app/share/record/[token]/page.tsx"),
  ]);
  const print = stripComments(css).slice(stripComments(css).indexOf("@media print {"));
  assert.ok(print.length > 100, "an @media print block exists");
  for (const chrome of [".app-sidebar", ".app-topbar", ".app-mobile-nav", ".skip-link", ".public-header", ".public-footer", ".print-record__toolbar", ".retention-record-controls"]) {
    assert.ok(print.includes(chrome), `${chrome} hidden in print`);
  }
  assert.match(print, /display: none !important/);
  assert.match(print, /\.print-record \*,[^{]*\{ color: #000 !important/);
  assert.match(print, /break-inside: avoid/);
  assert.match(print, /a\[href\^="http"\]::after \{ content: " \(" attr\(href\) "\)"/);
  assert.match(appLayout, /import "\.\.\/report-print\.css";/);
  assert.match(publicReport, /import "\.\.\/\.\.\/report-print\.css";/);
  assert.match(sharedRecord, /import "\.\.\/\.\.\/\.\.\/report-print\.css";/);
  for (const page of [recordPrint, outcomesPrint]) {
    assert.match(page, /<ReportPrintToolbar backHref=/);
    assert.match(page, /className="print-record"/);
  }
  assert.match(toolbar, /window\.print\(\)/);
  assert.match(toolbar, /data-print="hide"/);
});
