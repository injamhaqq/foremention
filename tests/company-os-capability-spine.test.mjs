import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPANY_OS_CAPABILITIES,
  validateCompanyOsCapabilitySpine,
} from "../lib/company-os/capabilities.ts";

const capability = (id) =>
  COMPANY_OS_CAPABILITIES.find((entry) => entry.id === id);

test("company OS capability spine is unique and fail-closed", () => {
  const result = validateCompanyOsCapabilitySpine();

  assert.equal(result.valid, true);
  assert.equal(result.count, COMPANY_OS_CAPABILITIES.length);
  assert.ok(result.count >= 30);

  const externalEnabled = COMPANY_OS_CAPABILITIES.filter(
    (entry) => entry.integrationMode !== "native" && entry.productionEnabled,
  );
  assert.deepEqual(externalEnabled, []);

  const enabled = COMPANY_OS_CAPABILITIES.filter(
    (entry) => entry.productionEnabled,
  );
  assert.deepEqual(enabled.map((entry) => entry.id), [
    "foremention-agent-os",
  ]);
});

test("Foremention and Inngest remain the authoritative company kernel", () => {
  const kernel = capability("foremention-agent-os");
  assert.equal(kernel?.integrationMode, "native");
  assert.equal(kernel?.adoptionDecision, "keep_native");
  assert.match(kernel?.reason || "", /Supabase truth.*Inngest/i);
  assert.match(kernel?.hardBoundary || "", /organization\/project scope/i);

  const secondDurableOrchestrator = COMPANY_OS_CAPABILITIES.filter(
    (entry) =>
      entry.capabilityClass === "orchestration"
      && entry.id !== "foremention-agent-os"
      && entry.adoptionDecision === "integrate_now",
  );
  assert.deepEqual(secondDurableOrchestrator, []);
});

test("Oct 5 first-wave upstream set matches the authoritative blueprint", () => {
  const expected = {
    "paperclip-patterns": ["paperclipai/paperclip", "adapt_patterns_only"],
    "portkey-gateway": ["Portkey-AI/gateway", "integrate_now"],
    promptfoo: ["promptfoo/promptfoo", "integrate_now"],
    stagehand: ["browserbase/stagehand", "integrate_now"],
    playwright: ["microsoft/playwright", "integrate_now"],
    crawlee: ["apify/crawlee", "integrate_now"],
    activepieces: ["activepieces/activepieces", "integrate_now"],
    "microsoft-mcp-gateway": ["microsoft/mcp-gateway", "integrate_later"],
  };

  for (const [id, [source, decision]] of Object.entries(expected)) {
    assert.equal(capability(id)?.source, source, id);
    assert.equal(capability(id)?.adoptionDecision, decision, id);
    assert.equal(capability(id)?.productionEnabled, false, id);
  }
});

test("Portkey is the selected internal model gateway and measurement provenance stays native", () => {
  const portkey = capability("portkey-gateway");
  const liteLlm = capability("litellm-superseded");

  assert.equal(portkey?.integrationMode, "sidecar_service");
  assert.equal(portkey?.adoptionDecision, "integrate_now");
  assert.match(portkey?.hardBoundary || "", /Recommendation measurements/i);

  assert.equal(liteLlm?.integrationMode, "quarantine");
  assert.equal(liteLlm?.adoptionDecision, "quarantine_only");
  assert.match(liteLlm?.reason || "", /selects Portkey/i);
});

test("Langfuse is selected without replacing receipts, Sentry or product analytics", () => {
  const langfuse = capability("langfuse");
  const opik = capability("opik-superseded");

  assert.equal(langfuse?.adoptionDecision, "integrate_now");
  assert.equal(langfuse?.integrationMode, "sidecar_service");
  assert.match(langfuse?.reason || "", /AI trace.*diagnostics/i);
  assert.match(langfuse?.hardBoundary || "", /not business receipts/i);

  assert.equal(opik?.adoptionDecision, "quarantine_only");
  assert.match(opik?.reason || "", /selects Langfuse/i);
});

test("Promptfoo stays CI-only and cannot become runtime authority", () => {
  const promptfoo = capability("promptfoo");
  assert.equal(promptfoo?.integrationMode, "ci_tool");
  assert.equal(promptfoo?.productionEnabled, false);
  assert.match(promptfoo?.reason || "", /existing pinned zero-cost CI/i);
  assert.match(promptfoo?.hardBoundary || "", /never authorizes production actions/i);
});

test("browser workers pair Stagehand with Playwright outside the Cloudflare request runtime", () => {
  const stagehand = capability("stagehand");
  const playwright = capability("playwright");

  assert.equal(stagehand?.integrationMode, "sidecar_service");
  assert.match(stagehand?.reason || "", /isolated Node\/Chromium/i);
  assert.match(stagehand?.hardBoundary || "", /MFA\/CAPTCHA/i);

  assert.equal(playwright?.integrationMode, "in_process_package");
  assert.match(playwright?.reason || "", /deterministic browser execution/i);
  assert.match(playwright?.hardBoundary || "", /portal access controls/i);
});

test("research and connector workers remain subordinate to native task and authority controls", () => {
  const crawlee = capability("crawlee");
  const activepieces = capability("activepieces");

  assert.equal(crawlee?.adoptionDecision, "integrate_now");
  assert.match(crawlee?.hardBoundary || "", /Company OS tasks/i);

  assert.equal(activepieces?.adoptionDecision, "integrate_now");
  assert.match(activepieces?.hardBoundary || "", /action authorization/i);
  assert.match(activepieces?.license || "", /exact-path review/i);
});

test("heavy policy, metering, memory and MCP control planes remain deferred", () => {
  for (const id of [
    "microsoft-mcp-gateway",
    "openfga",
    "openmeter",
    "graphiti",
  ]) {
    assert.equal(capability(id)?.adoptionDecision, "integrate_later", id);
    assert.equal(capability(id)?.productionEnabled, false, id);
  }
});

test("credential and engineering workers remain isolated from agent authority", () => {
  const vault = capability("agent-vault-candidate");
  const engineering = capability("openhands-software-agent-sdk");

  assert.equal(vault?.integrationMode, "quarantine");
  assert.match(vault?.hardBoundary || "", /never.*provider secrets/i);

  assert.equal(engineering?.integrationMode, "sidecar_service");
  assert.match(engineering?.hardBoundary || "", /cannot merge, deploy production/i);
});

test("funding repositories are procedure/checker inputs, not submission authority", () => {
  for (const id of [
    "candur-patterns",
    "grantkit-patterns",
    "grantforge-patterns",
  ]) {
    assert.equal(capability(id)?.integrationMode, "reference_only", id);
    assert.equal(capability(id)?.productionEnabled, false, id);
  }
  assert.match(capability("candur-patterns")?.hardBoundary || "", /official program criteria/i);
  assert.match(capability("grantforge-patterns")?.hardBoundary || "", /authorize external submission/i);
});

test("graph and public-website visuals remain presentation layers", () => {
  const graph = capability("xyflow");
  assert.equal(graph?.integrationMode, "in_process_package");
  assert.match(graph?.hardBoundary || "", /view of controlled records/i);

  for (const id of ["react-three-fiber", "three-js", "motion"]) {
    assert.equal(capability(id)?.capabilityClass, "website_visuals", id);
    assert.equal(capability(id)?.productionEnabled, false, id);
  }
});

test("outreach remains a separately licensed internal revenue service", () => {
  const outreach = capability("foremention-outreach");

  assert.equal(outreach?.integrationMode, "sidecar_service");
  assert.equal(outreach?.license, "Linki Sustainable Use License");
  assert.match(outreach?.hardBoundary || "", /hosted service to third parties/i);
});
