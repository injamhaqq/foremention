// Claims track: mobile layout fixes for the public marketing pages.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const css = await text("app/claims-public-fixes.css");

function block(query) {
  const start = css.indexOf(`@media (${query})`);
  assert.ok(start >= 0, `missing @media (${query})`);
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index++) {
    if (css[index] === "{") depth++;
    if (css[index] === "}" && --depth === 0) return css.slice(start, index + 1);
  }
  throw new Error("unterminated media block");
}

test("the fix layer is loaded globally, before the contrast repair layer", async () => {
  const layout = await text("app/layout.tsx");
  const imports = [...layout.matchAll(/^import "\.\/([^"]+\.css)";$/gm)].map((match) => match[1]);
  assert.equal(imports.at(-1), "public-contrast-repair.css");
  assert.equal(imports.at(-2), "claims-public-fixes.css");
});

test("at 780px pricing cards drop their desktop height and CTAs become full-width tap targets", () => {
  const mobile = block("max-width: 780px");
  assert.match(mobile, /\.pricing-card \{ min-height: 0; \}/);
  assert.match(mobile, /\.intake-form button\[type="submit"\] \{ width: 100%; min-height: 48px;/);
  assert.match(mobile, /\.page-hero__actions \.button,[\s\S]*min-height: 48px/);
  assert.match(mobile, /\.legal-copy \{ padding-top: 48px; padding-bottom: 72px; \}/);
  assert.match(mobile, /\.contact-grid article \{ padding: 26px 20px; \}/);
});

test("at 420px long headline words wrap instead of overflowing a 290px shell", () => {
  const small = block("max-width: 420px");
  assert.match(small, /\.page-hero h1,[\s\S]*\.narrow-heading h1,[\s\S]*overflow-wrap: anywhere;/);
  assert.match(small, /\.intake-form \{ padding: 18px;/);
});

test("the pricing comparison table scrolls inside its own region and legal text wraps long tokens", () => {
  assert.match(css, /\.claims-table-scroll \{ max-width: 100%; overflow-x: auto;/);
  assert.match(css, /\.claims-compare-table \{ width: 100%; min-width: 640px;/);
  assert.match(css, /\.legal-copy a,\n\.legal-copy code,\n\.legal-copy li,\n\.legal-copy p \{ overflow-wrap: anywhere; \}/);
  assert.doesNotMatch(css, /(?:^|[\s,])(?:body|html|:root)\s*\{/, "stays scoped to public page classes");
});
