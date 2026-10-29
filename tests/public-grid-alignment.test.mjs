// Public grid alignment guard.
//
// A 360 audit reported the hero sitting ~210px to the right of the content grid
// on several public pages. The structural cause of that class of bug is a hero
// whose inner block is not the shared .shell container, so its left edge is set
// by something other than the one canonical grid. This test pins the invariant:
// every public page hero wraps its content in .shell, and the header CTA keeps a
// real horizontal inset.
//
// Scope / honesty: static source analysis. It does not render the page and does
// not measure pixels; it prevents the structural regression that produces the
// misalignment, and a rendered/visual check is still required to confirm offsets.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const fromRoot = (relative) => new URL(relative, root);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = new URL(entry + (statSync(new URL(entry, dir)).isDirectory() ? "/" : ""), dir);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function publicPages() {
  return walk(fromRoot("app/"))
    .map((url) => url.pathname.slice(root.pathname.length))
    .filter((path) => path.endsWith("/page.tsx"))
    // The /app product area has its own signed-in chrome, not the public grid.
    .filter((path) => !path.startsWith("app/app/"))
    .map((path) => ({ path, text: readFileSync(fromRoot(path), "utf8") }))
    .filter(({ text }) => text.includes("page-hero"));
}

test("every public page hero wraps its content in the shared .shell container", () => {
  const offenders = [];
  for (const { path, text } of publicPages()) {
    for (const match of text.matchAll(/<section[^>]*className="page-hero[^"]*"[^>]*>/g)) {
      const after = text.slice(match.index + match[0].length, match.index + match[0].length + 160);
      if (!/className="shell\b/.test(after)) offenders.push(path);
    }
  }
  assert.deepEqual(offenders, [], `hero without a .shell container: ${offenders.join(", ")}`);
});

test("the shared .shell defines one grid width, not page-specific variants", () => {
  const system = readFileSync(fromRoot("app/canonical-system.css"), "utf8");
  assert.match(system, /\.shell \{[^}]*width: min\(var\(--fm-shell\)[^}]*\}/);
  assert.match(system, /--fm-shell:\s*\d+px/);
});

test("the header CTA keeps a non-zero horizontal inset", () => {
  const css = readFileSync(fromRoot("app/outreach-site.css"), "utf8");
  const block = css.match(/\.canonical-public-header \.canonical-header__demo,[^{]*\{([^}]*)\}/s);
  assert.ok(block, "header CTA rule must exist");
  const padding = block[1].match(/padding:\s*0\s+(\d+)px/);
  assert.ok(padding, "header CTA must set an explicit horizontal padding");
  assert.ok(Number(padding[1]) >= 12, `header CTA padding ${padding[1]}px is too small to read as a button`);
});
