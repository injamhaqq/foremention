import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  assessGatewayRoutedResponse,
  gatewayMeasurementPin,
  isRoutingModelId,
  openRouterProviderRouting,
  providerAllowedForMeasurementLane,
} from "../lib/measurement-lane.mjs";

const text = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("direct providers stay eligible; unpinned gateways are excluded from measurement", () => {
  for (const id of ["openai", "gemini", "anthropic", "perplexity", "groq", "cloudflare"]) {
    assert.equal(providerAllowedForMeasurementLane(id, {}), true);
  }
  assert.equal(providerAllowedForMeasurementLane("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2" }), false);
  assert.equal(providerAllowedForMeasurementLane("zenmux", { ZENMUX_MODEL: "openai/gpt-5" }), false);
  assert.equal(providerAllowedForMeasurementLane("omnirouters", { OMNIROUTERS_MODEL: "x/y" }), false);
});

test("routing model ids never qualify as a measurement pin", () => {
  for (const model of ["auto", "openrouter/auto", "zenmux/auto", "openrouter/free", "openai/gpt-5:nitro", "x/y:floor", "x/y:exacto", "a/b,c/d", "*", ""]) {
    assert.equal(isRoutingModelId(model), true, model);
    assert.equal(providerAllowedForMeasurementLane("openrouter", { OPENROUTER_MODEL: model, OPENROUTER_UPSTREAM_PROVIDER: "z-ai" }), false, model);
  }
  assert.equal(isRoutingModelId("z-ai/glm-5.2"), false);
  assert.equal(gatewayMeasurementPin("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2", OPENROUTER_UPSTREAM_PROVIDER: "auto" }).reason, "UPSTREAM_PROVIDER_NOT_PINNED");
  assert.equal(gatewayMeasurementPin("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2", OPENROUTER_UPSTREAM_PROVIDER: "a,b" }).reason, "UPSTREAM_PROVIDER_NOT_PINNED");
});

test("a pinned OpenRouter request forbids fallback to any other upstream host", () => {
  const pin = gatewayMeasurementPin("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2", OPENROUTER_UPSTREAM_PROVIDER: "z-ai" });
  assert.equal(pin.pinned, true);
  assert.equal(providerAllowedForMeasurementLane("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2", OPENROUTER_UPSTREAM_PROVIDER: "z-ai" }), true);
  assert.deepEqual(openRouterProviderRouting(pin), { order: ["z-ai"], only: ["z-ai"], allow_fallbacks: false });
});

test("a response from another host or model fails closed as not comparable", () => {
  const pin = gatewayMeasurementPin("openrouter", { OPENROUTER_MODEL: "z-ai/glm-5.2", OPENROUTER_UPSTREAM_PROVIDER: "z-ai" });
  assert.deepEqual(assessGatewayRoutedResponse(pin, { model: "z-ai/glm-5.2", provider: "Z-AI" }), { ok: true, reason: null });
  assert.equal(assessGatewayRoutedResponse(pin, { model: "z-ai/glm-5.2", provider: "DeepInfra" }).reason, "ROUTED_PROVIDER_MISMATCH");
  assert.equal(assessGatewayRoutedResponse(pin, { model: "z-ai/glm-4.6", provider: "Z-AI" }).reason, "ROUTED_MODEL_MISMATCH");
  assert.equal(assessGatewayRoutedResponse(pin, { model: "z-ai/glm-5.2" }).ok, true, "request-level pin with fallbacks disabled");

  const zen = gatewayMeasurementPin("zenmux", { ZENMUX_MODEL: "openai/gpt-5", ZENMUX_UPSTREAM_PROVIDER: "openai" });
  assert.equal(zen.pinned, true);
  assert.equal(assessGatewayRoutedResponse(zen, { model: "openai/gpt-5" }).reason, "ROUTED_PROVIDER_UNREPORTED");
  assert.equal(assessGatewayRoutedResponse(zen, { model: "openai/gpt-5", provider: "azure" }).reason, "ROUTED_PROVIDER_MISMATCH");
  assert.equal(assessGatewayRoutedResponse({ pinned: false }, {}).ok, false);
});

test("adapters and every measurement entry point enforce the lane rule", async () => {
  const [openrouter, gateway, data, route, dispatcher, inngest] = await Promise.all([
    text("lib/providers/openrouter.ts"),
    text("lib/providers/openai-compatible-gateway.ts"),
    text("lib/data.ts"),
    text("app/api/runs/route.ts"),
    text("lib/jobs/measurement-schedule-dispatcher.ts"),
    text("lib/jobs/inngest.ts"),
  ]);
  assert.match(openrouter, /provider: openRouterProviderRouting\(pin\)/);
  assert.match(openrouter, /assessGatewayRoutedResponse\(pin/);
  assert.match(gateway, /gatewayMeasurementPin\(config\.id/);
  assert.match(gateway, /assessGatewayRoutedResponse\(pin/);
  for (const id of ["openrouter", "zenmux", "omnirouters"]) {
    assert.match(data, new RegExp(`providerAllowedForMeasurementLane\\("${id}"\\)`));
  }
  assert.match(route, /providerAllowedForMeasurementLane\(providerId\)/);
  assert.match(dispatcher, /providerAllowedForMeasurementLane\(providerId\)/);
  assert.match(inngest, /providerAllowedForMeasurementLane\(providerId\)/);
});
