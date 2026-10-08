/**
 * Two-lane provider rule.
 *
 * Lane A (customer measurement) must observe one exact provider + model. A
 * gateway that may route a request to a different upstream host or model
 * (OpenRouter auto routing, ZenMux, OmniRouters) is eligible for Lane A ONLY
 * when it is pinned to one exact upstream provider and one exact, non-routing
 * model id. Without a pin it stays out of measurement entirely; gateways remain
 * usable for Lane B internal tasks, which this module does not govern.
 *
 * Pure and environment-injected so it can be tested without network access.
 */

export const GATEWAY_PROVIDER_IDS = Object.freeze(["openrouter", "zenmux", "omnirouters"]);

const ENV_PREFIX = Object.freeze({ openrouter: "OPENROUTER", zenmux: "ZENMUX", omnirouters: "OMNIROUTERS" });

/** Gateways whose request body can enforce the pin (no fallbacks to other hosts). */
const REQUEST_LEVEL_PIN = new Set(["openrouter"]);

export function isGatewayProvider(providerId) {
  return GATEWAY_PROVIDER_IDS.includes(providerId);
}

/**
 * Model ids that ask the gateway to choose a model or host on our behalf.
 * Examples: `auto`, `openrouter/auto`, `zenmux/auto`, `openai/gpt-x:nitro`,
 * `vendor/model:floor`, `:exacto`, any `openrouter/*` meta-model, wildcard or
 * comma-separated model lists.
 */
export function isRoutingModelId(model) {
  if (typeof model !== "string") return true;
  const value = model.trim().toLowerCase();
  if (!value) return true;
  if (value === "auto" || value.endsWith("/auto") || value.startsWith("auto/") || value.startsWith("openrouter/")) return true;
  if (/[*,\s|]/.test(value)) return true;
  if (/:(nitro|floor|exacto)$/.test(value)) return true;
  return false;
}

export function normalizeUpstreamProvider(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

/**
 * @returns {{ pinned: true, providerId: string, model: string, upstreamProvider: string, requestLevelPin: boolean } | { pinned: false, providerId: string, reason: string }}
 */
export function gatewayMeasurementPin(providerId, env = process.env) {
  if (!isGatewayProvider(providerId)) return { pinned: false, providerId, reason: "NOT_A_GATEWAY" };
  const prefix = ENV_PREFIX[providerId];
  const model = (env[`${prefix}_MODEL`] || "").trim();
  const upstreamProvider = (env[`${prefix}_UPSTREAM_PROVIDER`] || "").trim();
  if (!model) return { pinned: false, providerId, reason: "MODEL_NOT_SET" };
  if (isRoutingModelId(model)) return { pinned: false, providerId, reason: "ROUTING_MODEL_ID" };
  if (!upstreamProvider || /[*,\s|]/.test(upstreamProvider) || upstreamProvider.toLowerCase() === "auto") {
    return { pinned: false, providerId, reason: "UPSTREAM_PROVIDER_NOT_PINNED" };
  }
  return { pinned: true, providerId, model, upstreamProvider, requestLevelPin: REQUEST_LEVEL_PIN.has(providerId) };
}

/** Lane A eligibility: direct providers pass; gateways must be exactly pinned. */
export function providerAllowedForMeasurementLane(providerId, env = process.env) {
  if (!isGatewayProvider(providerId)) return true;
  return gatewayMeasurementPin(providerId, env).pinned;
}

/**
 * Verify a gateway response actually came from the pinned upstream + model.
 * A gateway without a request-level pin must report its upstream provider;
 * a missing or different upstream/model fails closed as not comparable.
 */
export function assessGatewayRoutedResponse(pin, routed) {
  if (!pin || !pin.pinned) return { ok: false, reason: "GATEWAY_NOT_PINNED" };
  const routedModel = typeof routed?.model === "string" ? routed.model.trim() : "";
  if (routedModel && routedModel.toLowerCase() !== pin.model.toLowerCase()) {
    return { ok: false, reason: "ROUTED_MODEL_MISMATCH" };
  }
  const routedProvider = normalizeUpstreamProvider(routed?.provider);
  if (!routedProvider) {
    return pin.requestLevelPin ? { ok: true, reason: null } : { ok: false, reason: "ROUTED_PROVIDER_UNREPORTED" };
  }
  if (routedProvider !== normalizeUpstreamProvider(pin.upstreamProvider)) {
    return { ok: false, reason: "ROUTED_PROVIDER_MISMATCH" };
  }
  return { ok: true, reason: null };
}

/** OpenRouter provider-routing block that forbids silent fallback to another host. */
export function openRouterProviderRouting(pin) {
  if (!pin || !pin.pinned || pin.providerId !== "openrouter") return null;
  return { order: [pin.upstreamProvider], only: [pin.upstreamProvider], allow_fallbacks: false };
}
