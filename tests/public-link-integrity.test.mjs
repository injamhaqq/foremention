// Public-link and named-anchor integrity guard.
//
// Why this exists: a 360 audit reported dead links whose href resolved to a
// literal "…" URL, and named links that "link nowhere". A stale or truncated
// href is a customer-facing 404 and a trust defect. This test reads the real
// source tree and fails if any static internal link no longer resolves to a
// real route, a real public asset, or a real named anchor.
//
// Scope / honesty: deterministic static analysis of the repo. It is NOT a
// rendered-DOM, browser or production check. It cannot see links built from
// runtime data (those are covered by the tenant/route suites), and it does not
// prove the linked page renders.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
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

function sourceFiles(subdirs, extensions) {
  return subdirs
    .flatMap((dir) => walk(fromRoot(`${dir}/`)))
    .filter((url) => extensions.some((ext) => url.pathname.endsWith(ext)))
    .map((url) => ({ path: url.pathname.slice(root.pathname.length), text: readFileSync(url, "utf8") }));
}

// Every routable path the app can serve statically, including dynamic segments.
function routablePaths() {
  const routes = new Set();
  for (const file of walk(fromRoot("app/"))) {
    const path = file.pathname.slice(root.pathname.length);
    if (path.endsWith("/page.tsx")) routes.add("/" + path.slice(4, -"/page.tsx".length));
    if (path.endsWith("/route.ts")) routes.add("/" + path.slice(4, -"/route.ts".length));
  }
  for (const file of walk(fromRoot("public/"))) {
    routes.add("/" + file.pathname.slice((root.pathname + "public/").length));
  }
  return routes;
}

const STATIC_ROUTE = /^\/[a-zA-Z0-9/_?=&%.-]*$/;

function resolves(href, routes) {
  if (routes.has(href)) return true;
  const parts = href.replace(/^\/|\/$/g, "").split("/");
  for (const route of routes) {
    const routeParts = route.replace(/^\/|\/$/g, "").split("/");
    if (routeParts.length !== parts.length) continue;
    if (routeParts.every((segment, i) => segment.startsWith("[") || segment === parts[i])) return true;
  }
  return false;
}

function staticHrefs() {
  const files = sourceFiles(["app", "components"], [".tsx", ".ts"]);
  const hrefs = new Map();
  for (const { path, text } of files) {
    for (const match of text.matchAll(/href="(\/[^"]*)"/g)) hrefs.set(match[1], path);
    for (const match of text.matchAll(/href=\{`(\/[^`$]*)`\}/g)) hrefs.set(match[1], path);
  }
  return hrefs;
}

function namedAnchors() {
  const files = sourceFiles(["app", "components"], [".tsx"]);
  const anchors = new Set();
  for (const { text } of files) {
    for (const match of text.matchAll(/id="([a-zA-Z0-9_-]+)"/g)) anchors.add(match[1]);
  }
  return anchors;
}

test("every static internal href resolves to a real route or public asset", () => {
  const routes = routablePaths();
  const unresolved = [];
  for (const [href, file] of staticHrefs()) {
    const path = href.split("#")[0].split("?")[0];
    if (path === "" || path === "/") continue;
    if (!STATIC_ROUTE.test(path)) continue;
    if (!resolves(path, routes)) unresolved.push(`${href} (${file})`);
  }
  assert.deepEqual(unresolved, [], `unresolved internal links: ${unresolved.join(", ")}`);
});

test("no static href is a truncated placeholder containing an ellipsis", () => {
  const offenders = [];
  for (const [href, file] of staticHrefs()) {
    if (href.includes("…") || href.includes("...")) offenders.push(`${href} (${file})`);
  }
  assert.deepEqual(offenders, [], `placeholder hrefs: ${offenders.join(", ")}`);
});

test("every named anchor used by an internal href exists in the source", () => {
  const anchors = namedAnchors();
  const missing = [];
  for (const [href, file] of staticHrefs()) {
    const [, anchor] = href.split("#");
    if (!anchor) continue;
    if (!anchors.has(anchor)) missing.push(`${href} (${file})`);
  }
  assert.deepEqual(missing, [], `href targets a missing anchor id: ${missing.join(", ")}`);
});

test("the specific links named in the 360 audit all resolve", () => {
  const routes = routablePaths();
  const anchors = namedAnchors();
  const audited = [
    "/app/source-map#source-table",
    "/app/source-map#source-review-queue",
    "/app/settings#integrations",
    "/contact?plan=intelligence",
    "/api/auth/sso?next=/app",
  ];
  for (const href of audited) {
    const [path, anchor] = href.split("#");
    const route = path.split("?")[0];
    assert.ok(resolves(route, routes), `${href} must resolve to a route`);
    if (anchor) assert.ok(anchors.has(anchor), `${href} anchor must exist`);
  }
});

test("the favicon, apple touch icon and manifest are declared and present", () => {
  const layout = readFileSync(fromRoot("app/layout.tsx"), "utf8");
  for (const asset of ["/favicon.ico", "/icon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png"]) {
    assert.ok(existsSync(fromRoot("public" + asset)), `public${asset} must exist`);
    assert.match(layout, new RegExp(asset.replace(/[.]/g, "\\.")), `layout must declare ${asset}`);
  }
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  const manifest = JSON.parse(readFileSync(fromRoot("public/manifest.webmanifest"), "utf8"));
  assert.equal(manifest.name, "Foremention");
  assert.ok(manifest.icons.length >= 2);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(fromRoot("public" + icon.src)), `manifest icon ${icon.src} must exist`);
  }
});
