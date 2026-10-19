// Claims track (FM-24): pricing indexable, sitemap covers public pages,
// robots stays correct, llms.txt accurate, og:image present and resolving.
import "./attach-v1-03-support/register.mjs";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const { default: sitemap } = await import("../app/sitemap.ts");
const { default: robots } = await import("../app/robots.ts");
const { OG_IMAGE, OG_IMAGE_PATH, pageMetadata } = await import("../lib/seo.ts");

const KEY_PUBLIC_PAGES = ["", "/product", "/pricing", "/methodology", "/use-cases", "/contact", "/trust", "/privacy", "/terms", "/refund-policy", "/subprocessors", "/dpa"];

test("sitemap lists every key public page with absolute URLs and valid dates", () => {
  const entries = sitemap();
  const urls = entries.map((entry) => entry.url);
  for (const path of KEY_PUBLIC_PAGES) assert.ok(urls.includes(`https://foremention.com${path}`), `sitemap is missing ${path || "/"}`);
  assert.equal(new Set(urls).size, urls.length, "no duplicate sitemap URLs");
  for (const entry of entries) {
    assert.ok(Number.isFinite(entry.lastModified.getTime()), `${entry.url} has an invalid lastModified`);
    assert.match(entry.url, /^https:\/\/foremention\.com(\/|$)/);
  }
  for (const privatePath of ["/pay", "/app", "/login", "/signup", "/share", "/api", "/sample-report"]) {
    assert.ok(!urls.some((url) => url === `https://foremention.com${privatePath}` || url.startsWith(`https://foremention.com${privatePath}/`)), `${privatePath} must stay out`);
  }
});

test("every page in the sitemap is indexable (no noindex on a listed page)", async () => {
  for (const entry of sitemap()) {
    const path = new URL(entry.url).pathname;
    const file = path === "/" ? "app/page.tsx" : `app${path}/page.tsx`;
    const source = await text(file);
    assert.doesNotMatch(source, /noIndex: true|index: false/, `${file} is in the sitemap but noindex`);
  }
});

test("robots allows the public site, blocks private routes, and points to the sitemap", () => {
  const rules = robots();
  const star = rules.rules.find((rule) => rule.userAgent === "*");
  assert.equal(star.allow, "/");
  for (const path of ["/app/", "/api/", "/auth/", "/login", "/signup", "/share/"]) assert.ok(star.disallow.includes(path), path);
  assert.ok(!star.disallow.includes("/pricing"));
  assert.equal(rules.sitemap, "https://foremention.com/sitemap.xml");
});

test("pricing page metadata is indexable and carries the share image", async () => {
  const pricing = await text("app/pricing/page.tsx");
  assert.doesNotMatch(pricing, /noIndex/);
  const meta = pageMetadata({ title: "Recommendation Intelligence Plans", description: "d", path: "/pricing" });
  assert.match(String(meta.robots), /^index, follow/);
  assert.deepEqual(meta.openGraph.images, [OG_IMAGE]);
  assert.equal(meta.twitter.card, "summary_large_image");
  assert.deepEqual(meta.twitter.images, [OG_IMAGE.url]);
});

test("og:image resolves to a real 1200x630 PNG in public/ and the root layout uses it", async () => {
  assert.equal(OG_IMAGE.url, `https://foremention.com${OG_IMAGE_PATH}`);
  const file = new URL(`public${OG_IMAGE_PATH}`, root);
  assert.ok((await stat(file)).size > 1000);
  const png = await readFile(file);
  assert.equal(png.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.equal(OG_IMAGE.width, 1200);
  assert.equal(OG_IMAGE.height, 630);
  const layout = await text("app/layout.tsx");
  assert.match(layout, /openGraph: \{[^}]*images: \[OG_IMAGE\]/);
  assert.match(layout, /card: "summary_large_image"/);
});

test("llms.txt and the markdown sitemap list pricing, legal pages and the accurate method", async () => {
  const [llms, sitemapMd, full] = await Promise.all([text("public/llms.txt"), text("public/sitemap.md"), text("public/llms-full.txt")]);
  for (const path of ["/pricing", "/refund-policy", "/dpa", "/terms", "/privacy", "/subprocessors", "/methodology"]) {
    assert.ok(llms.includes(`https://foremention.com${path}`), `llms.txt missing ${path}`);
  }
  for (const path of ["/pricing", "/refund-policy", "/dpa"]) {
    assert.ok(sitemapMd.includes(`https://foremention.com${path}`), `sitemap.md missing ${path}`);
    assert.ok(full.includes(`https://foremention.com${path}`), `llms-full.txt missing ${path}`);
  }
  // Every llms.txt link points at a real route or public file.
  for (const [, url] of llms.matchAll(/\]\((https:\/\/foremention\.com[^)]*)\)/g)) {
    const path = new URL(url).pathname;
    const candidates = path === "/" ? ["app/page.tsx"] : [`public${path}`, `app${path}/page.tsx`];
    let found = false;
    for (const candidate of candidates) {
      try { await stat(new URL(candidate, root)); found = true; break; } catch { /* try next */ }
    }
    assert.ok(found, `llms.txt links to ${path}, which has no page or file`);
  }
});
