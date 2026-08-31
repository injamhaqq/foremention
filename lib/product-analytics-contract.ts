export type ProductAnalyticsValue = string | number | boolean | null;
export type ProductAnalyticsProperties = Record<string, ProductAnalyticsValue>;

export const PRODUCT_ANALYTICS_EVENTS = [
  "$pageview",
  "score_viewed",
  "score_started",
  "score_completed",
  "score_failed",
  "score_cta_clicked",
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
  "recommendation_record_viewed",
  "source_map_opened",
  "evidence_inspection_opened",
  "evidence_review_completed",
  "comparison_viewed",
  "comparison_eligibility_observed",
  "decision_insight_reached",
  "performance_observed",
  "first_record_reviewed",
  "action_created",
  "second_comparable_cycle_completed",
  "measurement_schedule_enabled",
  "record_share_created",
  "record_share_viewed",
  "record_share_workspace_cta_clicked",
  "team_invite_sent",
  "category_page_viewed",
  "research_page_viewed",
  "partner_page_viewed",
] as const;

export type ProductAnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];

type SanitizedProductAnalyticsEvent = {
  event: ProductAnalyticsEventName;
  properties: ProductAnalyticsProperties;
};

type NormalizedProductAnalyticsInput = {
  event: string;
  input: Record<string, unknown>;
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
const scheduleCadences = new Set(["weekly", "biweekly", "monthly"]);
const scheduleStates = new Set(["enabled", "paused", "resumed"]);
const actionPriorities = new Set(["low", "normal", "high", "critical"]);
const invitationRoles = new Set(["admin", "analyst", "viewer", "reviewer", "stakeholder"]);
const shareViewModes = new Set(["stakeholder", "executive"]);

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

function normalizeLegacyEvent(event: string, input: Record<string, unknown>): NormalizedProductAnalyticsInput {
  if (event === "onboarding_started") return { event: "activation_setup_started", input };
  if (event === "onboarding_completed") return { event: "activation_setup_completed", input };
  if (event === "onboarding_website_draft_created") return {
    event: "activation_context_ready",
    input: { ...input, context_source: "website", context_quality: input.limited === true ? "limited" : "complete" },
  };
  if (event === "onboarding_website_draft_failed") return {
    event: "activation_setup_failed",
    input: { error_category: "client_error" },
  };
  if (event === "onboarding_manual_context_created") return {
    event: "activation_context_ready",
    input: { ...input, context_source: "manual", context_quality: "complete" },
  };
  if (event === "score_context_prefilled") return {
    event: "activation_context_ready",
    input: { ...input, context_source: "score_handoff", context_quality: "complete" },
  };
  if (event === "score_context_prefill_failed") {
    const reason = input.reason === "invalid_context" || input.reason === "client_error" ? input.reason : "unavailable";
    return { event: "activation_setup_failed", input: { error_category: reason } };
  }
  if (event === "collection_started") return {
    event: "workflow_started",
    input: {
      ...input,
      workflow_source: input.source === "onboarding" ? "onboarding" : "workspace",
      cycle_type: input.cycle_type || (input.source === "onboarding" ? "first" : undefined),
    },
  };
  if (event === "collection_queue_failed") return {
    event: "workflow_failed",
    input: { ...input, workflow_stage: "queue", error_category: "queue_failed" },
  };
  if (event === "reviewed_opportunity_created") return {
    event: "decision_insight_reached",
    input: { insight_type: "actionable_source_gap" },
  };
  // Preserve telemetry continuity without emitting retired Source X-Ray event names.
  if (event === "source_xray_viewed") return { event: "evidence_inspection_opened", input };
  if (event === "source_xray_reviewed") return { event: "evidence_review_completed", input };
  return { event, input };
}

export function sanitizeProductAnalyticsEvent(event: string, input: Record<string, unknown> = {}): SanitizedProductAnalyticsEvent | null {
  const normalized = normalizeLegacyEvent(event, input);
  if (!EVENT_NAMES.has(normalized.event)) return null;
  const normalizedInput = normalized.input;
  const properties: ProductAnalyticsProperties = {};

  switch (normalized.event as ProductAnalyticsEventName) {
    case "$pageview":
      addEnum(properties, "surface", normalizedInput.surface, surfaces);
      break;
    case "score_viewed":
      addBoolean(properties, "shared_result", normalizedInput.shared_result);
      break;
    case "score_started":
    case "score_cta_clicked":
    case "buyer_question_updated":
    case "ai_result_viewed":
    case "citation_result_viewed":
    case "recommendation_record_viewed":
    case "source_map_opened":
    case "evidence_inspection_opened":
    case "comparison_viewed":
    case "category_page_viewed":
    case "research_page_viewed":
    case "partner_page_viewed":
      break;
    case "score_completed":
      addCountBucket(properties, "question_count_bucket", normalizedInput.question_count);
      break;
    case "score_failed":
    case "activation_setup_failed":
      addEnum(properties, "error_category", normalizedInput.error_category, errorCategories);
      break;
    case "signup_started":
      addEnum(properties, "method", normalizedInput.method, authMethods);
      break;
    case "signup_completed":
      addBoolean(properties, "confirmation_required", normalizedInput.confirmation_required);
      break;
    case "auth_session_established":
      addEnum(properties, "entry_surface", normalizedInput.entry_surface, entrySurfaces);
      break;
    case "activation_setup_started":
      addEnum(properties, "context_source", normalizedInput.context_source, contextSources);
      break;
    case "activation_context_ready":
      addEnum(properties, "context_source", normalizedInput.context_source, contextSources);
      addEnum(properties, "context_quality", normalizedInput.context_quality, contextQualities);
      addCountBucket(properties, "question_count_bucket", normalizedInput.question_count);
      addCountBucket(properties, "competitor_count_bucket", normalizedInput.competitor_count);
      break;
    case "activation_setup_completed":
      addCountBucket(properties, "question_count_bucket", normalizedInput.question_count);
      addCountBucket(properties, "competitor_count_bucket", normalizedInput.competitor_count);
      break;
    case "question_created":
      addEnum(properties, "cluster", normalizedInput.cluster, questionClusters);
      break;
    case "buyer_question_status_changed":
      addBoolean(properties, "active", normalizedInput.active);
      break;
    case "workflow_started":
      addCountBucket(properties, "question_count_bucket", normalizedInput.question_count);
      addCountBucket(properties, "provider_count_bucket", normalizedInput.provider_count);
      addEnum(properties, "provider", normalizedInput.provider, providers);
      addEnum(properties, "workflow_source", normalizedInput.workflow_source, workflowSources);
      addEnum(properties, "cycle_type", normalizedInput.cycle_type, cycleTypes);
      break;
    case "workflow_completed":
      addEnum(properties, "outcome", normalizedInput.outcome, workflowOutcomes);
      break;
    case "workflow_failed":
      addEnum(properties, "error_category", normalizedInput.error_category, errorCategories);
      addEnum(properties, "workflow_stage", normalizedInput.workflow_stage, workflowStages);
      addEnum(properties, "provider", normalizedInput.provider, providers);
      break;
    case "evidence_review_completed":
      addBoolean(properties, "brand_present", normalizedInput.brand_present);
      addEnum(properties, "crawler_access", normalizedInput.crawler_access, crawlerAccess);
      addEnum(properties, "entry_route", normalizedInput.entry_route, entryRoutes);
      addBoolean(properties, "decision_ready", normalizedInput.decision_ready);
      break;
    case "comparison_eligibility_observed":
      addBoolean(properties, "eligible", normalizedInput.eligible);
      break;
    case "decision_insight_reached":
      addEnum(properties, "insight_type", normalizedInput.insight_type, insightTypes);
      break;
    case "performance_observed":
      addEnum(properties, "operation", normalizedInput.operation, performanceOperations);
      addEnum(properties, "latency_bucket", normalizedInput.latency_bucket, latencyBuckets);
      addEnum(properties, "outcome", normalizedInput.outcome, performanceOutcomes);
      addEnum(properties, "status_class", normalizedInput.status_class, statusClasses);
      break;
    case "first_record_reviewed":
      addCountBucket(properties, "evidence_count_bucket", normalizedInput.evidence_count);
      break;
    case "action_created":
      addEnum(properties, "priority", normalizedInput.priority, actionPriorities);
      addBoolean(properties, "remeasurement_planned", normalizedInput.remeasurement_planned);
      break;
    case "second_comparable_cycle_completed":
      addBoolean(properties, "change_detected", normalizedInput.change_detected);
      break;
    case "measurement_schedule_enabled":
      addEnum(properties, "cadence", normalizedInput.cadence, scheduleCadences);
      addEnum(properties, "schedule_state", normalizedInput.schedule_state, scheduleStates);
      break;
    case "record_share_created":
      addBoolean(properties, "include_evidence", normalizedInput.include_evidence);
      break;
    case "record_share_viewed":
      addEnum(properties, "view_mode", normalizedInput.view_mode, shareViewModes);
      addBoolean(properties, "include_evidence", normalizedInput.include_evidence);
      break;
    case "record_share_workspace_cta_clicked":
      addEnum(properties, "view_mode", normalizedInput.view_mode, shareViewModes);
      break;
    case "team_invite_sent":
      addEnum(properties, "role", normalizedInput.role, invitationRoles);
      break;
  }

  return { event: normalized.event as ProductAnalyticsEventName, properties };
}
