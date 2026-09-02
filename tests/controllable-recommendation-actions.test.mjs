import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("control classification belongs to ChangeSpecification, not ResolutionProposal", async () => {
  const [change, resolution] = await Promise.all([
    text("lib/change-specification.ts"),
    text("lib/resolution-engine.ts"),
  ]);
  assert.match(change, /controlClass/);
  assert.match(change, /controlSurface/);
  assert.doesNotMatch(resolution, /controlLevel\?:/);
  assert.doesNotMatch(resolution, /controlSurface\?:/);
});

test("new execution-asset generation requires a reviewed Change Specification and has no problemId fallback", async () => {
  const route = await text("app/api/resolutions/route.ts");
  const start = route.indexOf('if (action === "generate")');
  const end = route.indexOf('if (action === "remeasure")', start);
  assert.ok(start >= 0 && end > start, "generate block must be inspectable");
  const generate = route.slice(start, end);

  assert.match(generate, /const changeSpecificationId = clean\(body\.changeSpecificationId, 36\)/);
  assert.match(generate, /!uuid\.test\(changeSpecificationId\)/);
  assert.doesNotMatch(generate, /body\.problemId|requestedProblemId/);
  assert.match(generate, /findProblem\(viewer, context, changeSpecification\.primary_opportunity_id\)/);
  assert.match(generate, /\["in_review", "approved", "in_execution", "completed"\]/);
  assert.match(generate, /change_execution_assets/);
  assert.match(generate, /legacy Resolution Asset already exists/i);
  assert.match(generate, /method: "DELETE"/);
});

test("Resolution Center carries and displays the parent decision and sends changeSpecificationId plus assetType", async () => {
  const center = await text("components/resolution-center.tsx");
  assert.match(center, /changeSpecification: ChangeSpecificationSummary \| null/);
  assert.match(center, /Parent Change Specification/);
  assert.match(center, /\/app\/change-specifications\/\$\{encodeURIComponent\(active\.changeSpecification\.id\)\}/);
  assert.match(center, /changeSpecificationId: active\.changeSpecification\.id/);
  assert.match(center, /assetType: draft\.assetType/);
  assert.doesNotMatch(center, /action: "generate", problemId:/);
  assert.match(center, /A reviewed Change Specification is required before Foremention can create an execution asset\./);
});

test("applied references support generic customer-controlled records with exact non-causal wording", async () => {
  const [route, center] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("components/resolution-center.tsx"),
  ]);
  assert.match(route, /page, pull request, document, ticket, release, policy, or other reference/i);
  assert.match(center, /Page, pull request, document, ticket, release, policy, or other reference/i);
  assert.match(center, /Applied reference recorded\. This records customer action; it does not claim the change caused an AI result\./);
  assert.doesNotMatch(center, /publication caused an AI result/i);
});