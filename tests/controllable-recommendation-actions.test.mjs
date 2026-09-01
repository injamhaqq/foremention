import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("control classification belongs to ChangeSpecification, not ResolutionProposal", async () => {
  const [change, resolution, route] = await Promise.all([
    text("lib/change-specification.ts"),
    text("lib/resolution-engine.ts"),
    text("app/api/resolutions/route.ts"),
  ]);
  assert.match(change, /controlClass/);
  assert.match(change, /controlSurface/);
  assert.doesNotMatch(resolution, /controlLevel\?:/);
  assert.doesNotMatch(resolution, /controlSurface\?:/);
  assert.match(route, /changeSpecificationId/);
  assert.match(route, /change_execution_assets/);
});

test("applied references support generic customer-controlled records with non-causal wording", async () => {
  const [route, center] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("components/resolution-center.tsx"),
  ]);
  assert.match(route, /page, pull request, document, ticket, release, or other reference/i);
  assert.match(center, /Applied reference recorded\. This records customer action; it does not claim the change caused an AI result\./);
  assert.doesNotMatch(center, /publication caused an AI result/i);
});
