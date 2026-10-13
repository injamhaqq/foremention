import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Change Specification reads expose scoped UI permissions without replacing server authorization", async () => {
  const route = await text("app/api/change-specifications/route.ts");
  assert.match(route, /permissions: \{ role, canWrite: writable\(role\), canDecide: manager\(role\) \}/);
  assert.match(route, /permissions: \{ role: "demo", canWrite: false, canDecide: false \}/);
  assert.match(route, /if \(!writable\(role\)\).*edit Change Specification drafts/);
  assert.match(route, /if \(!writable\(role\)\).*submit Change Specifications/);
  assert.match(route, /if \(!manager\(role\)\).*approve or reject Change Specifications/);
});

test("decision editor preserves verification context and saves dirty state before submission", async () => {
  const editor = await text("components/change-specification-detail.tsx");
  assert.match(editor, /const verificationPlan = \{ \.\.\.record\.verificationPlan \}/);
  assert.match(editor, /delete verificationPlan\.intent/);
  assert.match(editor, /verificationPlan: verificationPlanFor\(record, draft\)/);
  assert.match(editor, /if \(dirty\) await requestMutation\(draftUpdate\(record, draft\)\);[\s\S]*return requestMutation\(\{ action: "submit" \}\)/);
  assert.match(editor, /Save & submit for review/);
  assert.match(editor, /mutationLock\.current/);
  assert.doesNotMatch(editor, /await load\(\);[\s\S]*setNotice\(success\)/);
});

test("decision editor renders role-aware controls instead of optimistic status-only actions", async () => {
  const editor = await text("components/change-specification-detail.tsx");
  assert.match(editor, /record\?\.status === "draft" && permissions\.canWrite/);
  assert.match(editor, /record\?\.status === "in_review" && permissions\.canDecide/);
  assert.match(editor, /Workspace role:/);
  assert.match(editor, /Approval and rejection are reserved for workspace owners and admins/);
  assert.match(editor, /Waiting for a workspace owner or admin to approve or reject this Change Specification/);
});
