import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("root loading fallback does not create duplicate page landmarks or H1s", async () => {
  const loading = await read("app/loading.tsx");
  assert.doesNotMatch(loading, /<main\b/);
  assert.doesNotMatch(loading, /<h1\b/);
  assert.match(loading, /role="status"/);
});

test("homepage exposes explicit markdown discovery and worker content negotiation", async () => {
  const [page, worker] = await Promise.all([
    read("app/page.tsx"),
    read("worker/index.ts"),
  ]);

  assert.match(page, /rel="alternate" type="text\/markdown" href="\/index\.md"/);
  assert.match(worker, /accept.*text\/markdown/s);
  assert.match(worker, /new URL\("\/index\.md", request\.url\)/);
  assert.match(worker, /Content-Type", "text\/markdown; charset=utf-8"/);
  assert.match(worker, /<https:\/\/foremention\.com\/>; rel=\\?"canonical\\?"/);
  assert.match(worker, /<\/index\.md>; rel=\\?"alternate\\?"; type=\\?"text\/markdown\\?"/);
});

test("direct markdown exposes canonical static headers and freshness metadata", async () => {
  const [headers, markdown, page] = await Promise.all([
    read("public/_headers"),
    read("public/index.md"),
    read("app/page.tsx"),
  ]);

  assert.match(headers, /\/index\.md/);
  assert.match(headers, /<https:\/\/foremention\.com\/>; rel="canonical"/);
  assert.match(markdown, /last_updated:\s*"2026-09-20"/);
  assert.match(page, /breadcrumb:[\s\S]*"@type": "BreadcrumbList"/);
  assert.match(page, /"@type": "ListItem", position: 1, name: "Foremention"/);
});

test("public agent guide has recognizable usage sections and bounded OpenAPI discovery", async () => {
  const [agents, openapiText] = await Promise.all([
    read("public/AGENTS.md"),
    read("public/openapi.json"),
  ]);

  for (const heading of ["## Installation", "## Configuration", "## Usage", "## Evidence rules"]) {
    assert.ok(agents.includes(heading), "missing agent guide heading " + heading);
  }

  const openapi = JSON.parse(openapiText);
  assert.equal(openapi.openapi, "3.1.0");
  assert.equal(openapi.servers[0].url, "https://foremention.com");
  for (const path of ["/api/health", "/api/public/score", "/api/public/prompt-check", "/api/design-partner", "/api/leads/source-gap"]) {
    assert.ok(openapi.paths[path], "missing public API path " + path);
  }
  for (const privatePath of ["/api/auth", "/app", "/share"]) {
    assert.equal(openapi.paths[privatePath], undefined);
  }
});

test("breadcrumb structured data carries explicit top-level identity", async () => {
  for (const path of [
    "app/ai-mediated-buying/page.tsx",
    "app/recommendation-record/page.tsx",
    "app/recommendation-intelligence/page.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /"@type": "BreadcrumbList",[\s\S]{0,180}name:/);
    assert.match(source, /"@type": "BreadcrumbList",[\s\S]{0,240}url:/);
  }
});

test("Stage-0 Autopilot is manual-only while customer proof is the company gate", async () => {
  const [workflow, docs, state] = await Promise.all([
    read(".github/workflows/autopilot-control.yml"),
    read("docs/AUTOPILOT.md"),
    read("FOREMENTION_STATE.md"),
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+schedule:/);
  assert.doesNotMatch(workflow, /\n\s+push:/);
  assert.match(docs, /Stage 0 override/i);
  assert.match(state, /Current authority — Stage 0 Customer Proof/i);
  assert.match(state, /manual-dispatch only/i);
});
