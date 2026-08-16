import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const shell = await text("components/public-shell.tsx");
const sourceMap = await text("app/source-map/page.tsx");
const comparison = await text("app/monitoring-vs-execution/page.tsx");

test("primary navigation distinguishes the public evidence audit from the customer Source Map", () => {
  assert.match(shell, /\["\/source-map",\s*"Evidence"\]/);
  assert.match(sourceMap, /Website evidence · Foremention\.com/i);
});

test("monitoring comparison qualifies citation-dependent source intelligence", () => {
  assert.match(comparison, /Provider-returned citation URL map/i);
  assert.match(comparison, /When provider returns citations/i);
  assert.match(comparison, /sources returned with (?:the|that) answer/i);
  assert.doesNotMatch(comparison, /Foremention maps what shaped it/i);
});

test("unknown public routes have a branded recovery path", async () => {
  const notFound = await text("app/not-found.tsx");
  assert.match(notFound, /PublicShell/);
  assert.match(notFound, /This page isn['’]t here/i);
  assert.match(notFound, /href="\/product"/);
  assert.match(notFound, /href="\/"/);
});
