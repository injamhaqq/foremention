export type ProductAnalyticsValue = string | number | boolean | null;
export type ProductAnalyticsProperties = Record<string, ProductAnalyticsValue>;

export const PRODUCT_ANALYTICS_EVENTS = [
  "$pageview",
  "score_viewed",
  "score_started",
  "score_completed",
  "score_failed",
  "signup_started",
  "signup_completed",
  "auth_session_established",
  "activation_setup_started",
  "activation_context_ready",
  "activation_setup_failed",
  "activation_setup_completed",
  "question_created",
  "buyer_question_status_changed",
  "buyer_question_updated",
  "workflow_started",
  "workflow_completed",
  "workflow_failed",
  "ai_result_viewed",
  "citation_result_viewed",
  "source_map_opened",
  "source_xray_viewed",
  "source_xray_reviewed",
  "decision_insight_reached",
  "performance_observed",
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];

type SanitizedProductAnalyticsEvent = {
  event: ProductAnalyticsEventName;
  properties: ProductAnalyticsProperties;
};

const EVENT_NAMES = new Set<string>(PRODUCT_ANALYTICS_EVENTS);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const surfaces = new Set(["home", "product", "pricing", "score", "prompt_check", "login", "signup", "account_recovery", "overview", "onboarding", "questions", "ai_results", "sources", "competitors", "opportunities", "actions", "analytics", "settings", "workspace_other", "public_other"]);
const entrySurfaces = new Set(["onboarding", "ai_results", "sources", "workspace"]);
const authMethods = new Set(["email", "google"]);
const providers = new Set(["openai", "gemini", "anthropic", "perplexity", "groq", "cloudflare", "openrouter", "zenmux", "omnirouters"]);
const workflowSources = new Set(["onboarding", "workspace"]);
const cycleTypes = new Set(["first", "repeat"]);
const workflowOutcomes = new Set(["review", "complete", "partial"]);
const workflowStages = new Set(["queue", "execution"]);
const errorCategories = new Set(["unavailable", "invalid_context", "client_error", "queue_failed", "execution_failed", "cancelled", "provider_unavailable", "live_check_failed"]);
const crawlerAccess = new Set(["open", "partial", "blocked"]);
const entryRoutes = new Set(["editorial outreach", "comparison inclusion", "expert contribution", "original research", "legitimate review", "community participation"]);
const insightTypes = new Set(["actionable_source_gap"]);
const contextSources = new Set(["website", "manual", "score_handoff"]);
const contextQualities = new Set(["complete", "limited"]);
const questionClusters = new Set(["Discovery", "Comparison", "Alternative", "Use case", "Trust", "Constraint"]);
const performanceOperations = new Set(["page_load", "api_request"]);
const performanceOutcomes = new Set(["success", "failure"]);
const statusClasses = new Set(["2xx", "3xx", "4xx", "5xx", "network_error", "unknown"]);
const latencyBuckets = new Set(["under_250ms", "250_500ms", "500_1000ms", "1_2_5s", "2_5_5s", "5_10s", "10s_plus", "unknown"]);

function enumValue(value: unknown, allowed: Set<string>) {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function addEnum(properties: ProductAnalyticsProperties, key: string, value: unknown, allowed: Set<string>) {
  const normalized = enumValue(value, allowed);
  if (normalized !== null) properties[key] = normalized;
}

function addBoolean(properties: ProductAnalyticsProperties, key: string, value: unknown) {
  const normalized = booleanValue(value);
  if (normalized !== null) properties[key] = normalized;
}

export function countBucket(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  const count = Math.floor(value);
  if (count === 0) return "0";
  if (count === 1) return "1";
  if (count <= 5) return "2_5";
  if (count <= 10) return "6_10";
  return "11_plus";
}

function addCountBucket(properties: ProductAnalyticsProperties, outputKey: string, value: unknown) {
  const bucket = countBucket(value);
  if (bucket !== null) properties[outputKey] = bucket;
}

export function latencyBucket(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "unknown";
  if (durationMs < 250) return "under_250ms";
  if (durationMs < 500) return "250_500ms";
  if (durationMs < 1_000) return "500_1000ms";
  if (durationMs < 2_500) return "1_2_5s";
  if (durationMs < 5_000) return "2_5_5s";
  if (durationMs < 10_000) return "5_10s";
  return "10s_plus";
}

export function httpStatusClass(status: number) {
  if (!Number.isInteger(status) || status < 100 || status > 599) return "unknown";
  return `${Math.floor(status / 100)}xx`;
}

export function normalizeInternalAnalyticsId(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : null;
}

export function shouldEnableProductAnalytics(nodeEnv: string | undefined, hostname: string) {
  if (nodeEnv !== "production") return false;
  const normalized = hostname.trim().toLowerCase();
  return normalized === "foremention.com" || normalized === "www.foremention.com";
}

export function sanitizeProductAnalyticsEvent(event: string, input: Record<string, unknown> = {}): SanitizedProductAnalyticsEvent | null {
  if (!EVENT_NAMES.has(event)) return null;
  const properties: ProductAnalyticsProperties = {};

  switch (event as ProductAnalyticsEventName) {
    case "$pageview":
      addEnum(properties, "surface", input.surface, surfaces);
      break;
    case "score_viewed":
      addBoolean(properties, "shared_result", input.shared_result);
      break;
    case "score_started":
    case "buyer_question_updated":
    case "ai_result_viewed":
    case "citation_result_viewed":
    case "source_map_opened":
    case "source_xray_viewed":
      break;
    case "score_completed":
      addCountBucket(properties, "question_count_bucket", input.question_count);
      break;
    case "score_failed":
    case "activation_setup_failed":
      addEnum(properties, "error_category", input.error_category, errorCategories);
      break;
    case "signup_started":
      addEnum(properties, "method", input.method, authMethods);
      break;
    case "signup_completed":
      addBoolean(properties, "confirmation_required", input.confirmation_required);
      break;
    case "auth_session_established":
      addEnum(properties, "entry_surface", input.entry_surface, entrySurfaces);
      break;
    case "activation_setup_started":
      addEnum(properties, "context_source", input.context_source, contextSources);
      break;
    case "activation_context_ready":
      addEnum(properties, "context_source", input.context_source, contextSources);
      addEnum(properties, "context_quality", input.context_quality, contextQualities);
      addCountBucket(properties, "question_count_bucket", input.question_count);
      addCountBucket(properties, "competitor_count_bucket", input.competitor_count);
      break;
    case "activation_setup_completed":
      addCountBucket(properties, "question_count_bucket", input.question_count);
      addCountBucket(properties, "competitor_count_bucket", input.competitor_count);
      break;
    case "question_created":
      addEnum(properties, "cluster", input.cluster, questionClusters);
      break;
    case "buyer_question_status_changed":
      addBoolean(properties, "active", input.active);
      break;
    case "workflow_started":
      addCountBucket(properties, "question_count_bucket", input.question_count);
      addCountBucket(properties, "provider_count_bucket", input.provider_count);
      addEnum(properties, "provider", input.provider, providers);
      addEnum(properties, "workflow_source", input.workflow_source, workflowSources);
      addEnum(properties, "cycle_type", input.cycle_type, cycleTypes);
      break;
    case "workflow_completed":
      addEnum(properties, "outcome", input.outcome, workflowOutcomes);
      break;
    case "workflow_failed":
      addEnum(properties, "error_category", input.error_category, errorCategories);
      addEnum(properties, "workflow_stage", input.workflow_stage, workflowStages);
      addEnum(properties, "provider", input.provider, providers);
      break;
    case "source_xray_reviewed":
      addBoolean(properties, "brand_present", input.brand_present);
      addEnum(properties, "crawler_access", input.crawler_access, crawlerAccess);
      addEnum(properties, "entry_route", input.entry_route, entryRoutes);
      addBoolean(properties, "decision_ready", input.decision_ready);
      break;
    case "decision_insight_reached":
      addEnum(properties, "insight_type", input.insight_type, insightTypes);
      break;
    case "performance_observed":
      addEnum(properties, "operation", input.operation, performanceOperations);
      addEnum(properties, "latency_bucket", input.latency_bucket, latencyBuckets);
      addEnum(properties, "outcome", input.outcome, performanceOutcomes);
      addEnum(properties, "status_class", input.status_class, statusClasses);
      break;
  }

  return { event: event as ProductAnalyticsEventName, properties };
}
