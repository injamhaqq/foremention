import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("www host permanently redirects safe navigations to the canonical apex domain", async () => {
  const worker = await read("worker/index.ts");
  assert.match(worker, /url\.hostname === "www\.foremention\.com" && \(request\.method === "GET" \|\| request\.method === "HEAD"\)/);
  assert.match(worker, /status: 301, headers: \{ Location: apex\.toString\(\)/);
  assert.ok(worker.indexOf('url.hostname === "www.foremention.com"') < worker.indexOf('url.pathname === "/api/health"'));
});

test("a favicon is shipped and declared so /favicon.ico no longer 404s", async () => {
  assert.ok((await stat(new URL("../public/favicon.ico", import.meta.url))).size > 0);
  assert.match(await read("public/icon.svg"), /<svg[^>]+viewBox="0 0 32 32"/);
  assert.match(await read("app/layout.tsx"), /icons: \{ icon: \[\{ url: "\/icon\.svg"/);
});

test("contrast repair layer loads last and covers every light surface axe flagged on production", async () => {
  const layout = await read("app/layout.tsx");
  const imports = [...layout.matchAll(/^import "\.\/([^"]+\.css)";$/gm)].map((match) => match[1]);
  assert.equal(imports.at(-1), "public-contrast-repair.css");
  const css = await read("app/public-contrast-repair.css");
  for (const selector of [".longform", ".longform-index", ".market-evidence__index", ".report-score", ".legal-summary", ".audit-provenance", ".site-audit-card", ".insight-card", ".roi-calculator", ".honesty-grid > article:nth-child(n)", ".checklist-grid > article", ".honesty-note p", ".comparison-row--head > span:nth-child(3)", "#limits.report-limit > .eyebrow"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.doesNotMatch(css, /(?:^|[\s,])(?:body|html|:root)\s*\{/, "repair stays scoped to the affected surfaces");
});

test("home evidence inspector exposes its visible text as its accessible name", async () => {
  const home = await read("components/goat-home-experience.tsx");
  assert.doesNotMatch(home, /aria-label="Inspect the illustrative Recommendation Record"/);
});
