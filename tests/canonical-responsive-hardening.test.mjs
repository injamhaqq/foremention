import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const [layout, css] = await Promise.all([
  text("app/layout.tsx"),
  text("app/canonical-responsive-hardening.css"),
]);

test("final responsive layer is loaded after identity retirement", () => {
  assert.match(layout, /import "\.\/canonical-responsive-hardening\.css";/);
  assert.ok(layout.indexOf('import "./canonical-responsive-hardening.css";') > layout.indexOf('import "./identity-retirement.css";'));
});

test("shell gutters are fluid and tiny product microcopy has a readable floor", () => {
  assert.match(css, /--fm-shell-gutter:\s*clamp\(/);
  assert.match(css, /\.shell[\s\S]{0,180}var\(--fm-shell-gutter\)/);
  assert.match(css, /font-size:\s*max\(12px,/);
  assert.match(css, /canonical-signal__caption/);
  assert.match(css, /color:\s*#8da196/i);
});

test("interactive product controls meet the shared 44px target", () => {
  assert.match(css, /--fm-touch-target:\s*44px/);
  assert.match(css, /min-height:\s*var\(--fm-touch-target\)/);
  assert.match(css, /sidebar-nav a/);
  assert.match(css, /button/);
  assert.match(css, /input/);
  assert.match(css, /select/);
  assert.match(css, /summary/);
});

test("workspace shell collapses before topbar content can collide", () => {
  assert.match(css, /@media \(max-width:\s*1100px\)/);
  assert.match(css, /\.app-user\s*>\s*div[\s\S]{0,80}display:\s*none/);
  assert.match(css, /\.app-topbar__brand-label[\s\S]{0,80}display:\s*none/);
  assert.match(css, /min-width:\s*0/);
});

test("mobile shell respects safe areas and wide evidence remains intentionally scrollable", () => {
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /env\(safe-area-inset-right\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.table-wrap[\s\S]{0,160}overflow-x:\s*auto/);
  assert.match(css, /-webkit-overflow-scrolling:\s*touch/);
});

test("high zoom and small screens remove fragile minimum column widths", () => {
  assert.match(css, /@media \(max-width:\s*900px\)/);
  assert.match(css, /canonical-record__meta[\s\S]{0,120}min-width:\s*0/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.doesNotMatch(css, /background:\s*(?:#fff|#fffdf9|#f4f0e8|white)\b/i);
});
