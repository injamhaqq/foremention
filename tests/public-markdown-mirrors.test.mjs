import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("canonical strategic pages expose curated Markdown mirrors and content negotiation", async () => {
  const [worker, headers, llms, sitemap] = await Promise.all([
    read("worker/index.ts"), read("public/_headers"), read("public/llms.txt"), read("public/sitemap.md"),
  ]);
  for (const slug of ["product", "methodology"]) {
    const [page, md] = await Promise.all([read(`app/${slug}/page.tsx`), read(`public/${slug}.md`)]);
    assert.match(page, new RegExp(`markdownPath: "/${slug}\\\\.md"`));
    assert.ok(page.includes(`rel="alternate" type="text/markdown" href="/${slug}.md"`));
    assert.ok(worker.includes(`"/${slug}": "/${slug}.md"`));
    assert.ok(worker.includes(`"/${slug}.md": "/${slug}"`));
    assert.ok(headers.includes(`/${slug}.md\\n  Link: <https://foremention.com/${slug}>; rel="canonical"`));
    assert.ok(md.includes(`canonical: "https://foremention.com/${slug}"`));
    assert.ok(md.includes("last_updated:"));
    assert.ok(md.includes("sitemap.md"));
    assert.ok(llms.includes(`https://foremention.com/${slug}.md`));
    assert.ok(sitemap.includes(`https://foremention.com/${slug}.md`));
  }
  assert.match(worker, /return complete\(new Response\(mirror\.body, mirror\)\)/);
  assert.match(worker, /status: 503/);
});
