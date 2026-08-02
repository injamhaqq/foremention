import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("workspace list routes expose accessible, reduced-motion-safe skeletons", async () => {
  const routes = ["app/app/loading.tsx", "app/app/prompts/loading.tsx", "app/app/runs/loading.tsx", "app/app/source-map/loading.tsx", "app/app/competitors/loading.tsx", "app/app/opportunities/loading.tsx", "app/app/placements/loading.tsx", "app/app/evidence/loading.tsx", "app/app/alerts/loading.tsx", "app/app/team/loading.tsx"];
  const [component, css, ...pages] = await Promise.all([text("components/workspace-list-skeleton.tsx"), text("app/globals.css"), ...routes.map(text)]);
  assert.match(component, /aria-busy="true"/);
  assert.match(component, /Real records will replace this placeholder/);
  assert.match(css, /@keyframes skeleton-sweep/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.skeleton-line \{ animation: none/);
  for (const page of pages) assert.match(page, /WorkspaceListSkeleton/);
});
