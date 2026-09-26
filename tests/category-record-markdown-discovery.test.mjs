import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
test("category and Record pages publish discoverable, exact-match Markdown mirrors", async () => {
  const [recordPage, intelligencePage, worker, headers, sitemap, llms] = await Promise.all([
    read("app/recommendation-record/page.tsx"), read("app/recommendation-intelligence/page.tsx"),
    read("worker/index.ts"), read("public/_headers"), read("public/sitemap.md"), read("public/llms.txt")
  ]);
  for (const [path, page] of [
    ["/recommendation-record", recordPage],
    ["/recommendation-intelligence", intelligencePage],
  ]) {
    const name = path.slice(1);
    assert.ok(page.includes('markdownPath: "'+path+'.md"'), name+" metadata must advertise Markdown");
    assert.ok(page.includes('<link rel="alternate" type="text/markdown" href="'+path+'.md" />'), name+" must have explicit alternate link");
    assert.ok(worker.includes('"'+path+'": "'+path+'.md"'));
    assert.ok(worker.includes('"'+path+'.md": "'+path+'"'));
    assert.ok(headers.includes('<https://foremention.com'+path+'>; rel="canonical"'));
    assert.ok(sitemap.includes("https://foremention.com"+path+".md"));
    assert.ok(llms.includes("https://foremention.com"+path+".md"));
  }
  assert.match(worker, /Declared Markdown mirror unavailable/);
  assert.match(worker, /Content-Type", "text\/markdown; charset=utf-8"/);
});
test("each mirror has precise canonical provenance and no fabricated customer claims", async () => {
  for (const name of ["recommendation-record", "recommendation-intelligence"]) {
    const body = await read("public/"+name+".md");
    assert.match(body, /^---\ntitle: /);
    assert.ok(body.includes('canonical: "https://foremention.com/'+name+'"'));
    assert.ok(body.includes('last_updated: "2026-09-26"'));
    assert.match(body, /^## Sitemap$/m);
    assert.ok(body.includes("https://foremention.com/sitemap.md"));
    assert.doesNotMatch(body, /we guarantee|our customers achieved|proven market leader|100% accuracy/i);
  }
});
