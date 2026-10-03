import assert from "node:assert/strict";
import test from "node:test";
import { resolveCompanyRuntimeBinding, validateCompanySkillPackages } from "../lib/company-os/runtime-bindings.ts";

test("catalogue entries do not acquire native execution rights by being listed", () => {
  assert.equal(resolveCompanyRuntimeBinding("grant_agent").nativeAgentId, null);
  assert.equal(resolveCompanyRuntimeBinding("grant_agent").productionExecutable, false);
  assert.equal(resolveCompanyRuntimeBinding("coding_agent").productionExecutable, false);
  assert.equal(resolveCompanyRuntimeBinding("unknown_agent"), null);
});

test("a narrowly matching existing support identity is recorded without enabling new execution", () => {
  const binding = resolveCompanyRuntimeBinding("support_agent");
  assert.equal(binding.nativeAgentId, "support");
  assert.equal(binding.productionExecutable, false);
  assert.equal(binding.status, "native_identity_reference");
});

test("draft packages resolve only known skill IDs and declared agent ownership", () => {
  const result = validateCompanySkillPackages();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.count, 2);
});
