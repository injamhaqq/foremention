import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const shell = await text("components/public-shell.tsx");
const sitemap = await text("app/sitemap.ts");
const sourceMap = await text("app/source-map/page.tsx");
const comparison = await text("app/monitoring-vs-execution/page.tsx");

test("outreach navigation stays focused while canonical evidence and research routes remain reachable", () => {
  assert.match(shell, /\["\/product",\s*"Product"\]/);
  assert.match(shell, /\["\/#how-it-works",\s*"How it works"\]/);
  assert.match(shell, /\["\/methodology",\s*"Methodology"\]/);
  assert.match(shell, /\["\/trust",\s*"Trust"\]/);
  assert.match(shell, /href="\/recommendation-record">Recommendation Record<\/Link>/);
  assert.match(shell, /href="\/insights">Research &amp; evidence<\/Link>/);
  assert.match(shell, /href="\/recommendation-intelligence">Category definition<\/Link>/);
  assert.match(sitemap, /\/recommendation-intelligence/);
  assert.doesNotMatch(shell, /href="\/source-map">Evidence<\/Link>|Source X-Ray|source-xray/i);
  assert.match(sourceMap, /Website evidence/);
  assert.match(sourceMap, /Foremention\.com/i);
});

test("monitoring comparison qualifies citation-dependent source intelligence", () => {
  assert.match(comparison, /Provider-returned citation URL map/i);
  assert.match(comparison, /When provider returns citations/i);
  assert.match(comparison, /sources returned with (?:the|that) answer/i);
  assert.doesNotMatch(comparison, /Foremention maps what shaped it/i);
});

test("unknown public routes preserve Foremention identity and expose real recovery choices", async () => {
  const notFound = await text("app/not-found.tsx");
  assert.match(notFound, /PublicShell/);
  assert.match(notFound, /This page is outside the map/i);
  assert.match(notFound, /href="\/product"/);
  assert.match(notFound, /href="\/"/);
});
