import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPANY_OS_CAPABILITIES,
  validateCompanyOsCapabilitySpine,
} from "../lib/company-os/capabilities.ts";

test("company OS capability spine is unique and fail-closed", () => {
  const result = validateCompanyOsCapabilitySpine();

  assert.equal(result.valid, true);
  assert.equal(result.count, COMPANY_OS_CAPABILITIES.length);
  assert.ok(result.count >= 18);

  const externalEnabled = COMPANY_OS_CAPABILITIES.filter(
    (capability) =>
      capability.integrationMode !== "native" && capability.productionEnabled,
  );
  assert.deepEqual(externalEnabled, []);

  const enabled = COMPANY_OS_CAPABILITIES.filter(
    (capability) => capability.productionEnabled,
  );
  assert.deepEqual(enabled.map((capability) => capability.id), [
    "foremention-agent-os",
  ]);
});

test("company OS keeps one durable orchestrator and preserves Foremention truth", () => {
  const kernel = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "foremention-agent-os",
  );
  const agentKit = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "inngest-agent-kit",
  );
  const modelGateway = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "litellm",
  );

  assert.equal(kernel?.integrationMode, "native");
  assert.equal(kernel?.adoptionDecision, "keep_native");
  assert.match(kernel?.reason || "", /existing Agent OS/i);
  assert.match(agentKit?.reason || "", /inside existing Inngest workflows/i);
  assert.match(modelGateway?.hardBoundary || "", /measurement.*provider adapters/i);
});

test("outreach remains a separately licensed internal revenue service", () => {
  const outreach = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "foremention-outreach",
  );

  assert.equal(outreach?.integrationMode, "sidecar_service");
  assert.equal(outreach?.license, "Linki Sustainable Use License");
  assert.match(outreach?.hardBoundary || "", /hosted service to third parties/i);
  assert.match(outreach?.reason || "", /authenticated events\/APIs/i);
});

test("credentials and engineering remain isolated from agent authority", () => {
  const vault = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "agent-vault",
  );
  const engineering = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "openhands-software-agent-sdk",
  );

  assert.equal(vault?.license, "MIT outside ee/");
  assert.match(vault?.hardBoundary || "", /never.*provider secrets/i);
  assert.match(engineering?.hardBoundary || "", /cannot merge, deploy production/i);
});

test("browser automation stays outside the Cloudflare web runtime", () => {
  const stagehand = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "stagehand",
  );

  assert.equal(stagehand?.integrationMode, "sidecar_service");
  assert.match(stagehand?.reason || "", /dedicated Node\/Chromium worker/i);
});

test("heavy optional control planes remain deferred until justified", () => {
  const graphiti = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "graphiti",
  );
  const acontext = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "acontext-patterns",
  );
  const agentGateway = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "agentgateway",
  );

  assert.equal(graphiti?.productionEnabled, false);
  assert.equal(graphiti?.adoptionDecision, "integrate_later");
  assert.equal(acontext?.integrationMode, "reference_only");
  assert.equal(acontext?.adoptionDecision, "adapt_patterns_only");
  assert.equal(agentGateway?.integrationMode, "quarantine");
  assert.equal(agentGateway?.adoptionDecision, "quarantine_only");
});

test("model gateway license boundary and measurement separation are explicit", () => {
  const liteLlm = COMPANY_OS_CAPABILITIES.find(
    (capability) => capability.id === "litellm",
  );

  assert.equal(liteLlm?.license, "MIT outside enterprise/");
  assert.match(liteLlm?.hardBoundary || "", /Recommendation measurement/i);
});
