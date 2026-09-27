import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/runs/[id]/review/route.ts", import.meta.url), "utf8");

test("run-review audit uses server authority only after authenticated workspace-scoped persisted review", () => {
  assert.match(route,/isTrustedMutationOrigin\(request\)/);
  assert.match(route,/getViewer\(\)/);
  assert.match(route,/context\.organizationId/);
  assert.match(route,/role === "viewer"/);
  assert.match(route,/status: "verified"/);
  assert.match(route,/const sideEffects = await Promise\.allSettled\(\[/);
  const reviewWrites=route.indexOf("const sideEffects =");
  const audit=route.indexOf('supabaseRest("audit_logs"',reviewWrites);
  assert.ok(reviewWrites>0 && audit>reviewWrites);
  const auditEnd=route.indexOf('supabaseRest("notifications',audit);
  assert.ok(auditEnd>audit);
  const auditOnly=route.slice(audit,auditEnd);
  assert.match(auditOnly,/serviceRole:\s*true/);
  assert.match(auditOnly,/organization_id: context\.organizationId/);
  assert.match(auditOnly,/actor_id: viewer\.id/);
  assert.match(auditOnly,/entity_id: run\.id/);
  assert.doesNotMatch(auditOnly,/JSON\.parse\(|body\.actor_id|body\.organization_id/);
});

test("noncritical audit failure does not undo approved evidence or upload sensitive error details", () => {
  assert.match(route,/sideEffects\.some\(\(result\) => result\.status === "rejected"\)/);
  assert.match(route,/Run review completed with a non-critical notification or audit-log failure/);
  assert.doesNotMatch(route,/console\.warn\([^\n]*viewer\.accessToken/);
});
