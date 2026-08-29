"use client";

import posthog from "posthog-js";
import {
  normalizeInternalAnalyticsId,
  sanitizeProductAnalyticsEvent,
  shouldEnableProductAnalytics,
} from "@/lib/product-analytics-contract";

// PostHog project tokens are public browser identifiers, not secret API keys.
// Production analytics is pinned to the connected Foremention project and is
// additionally hostname-gated so local, test, preview, and QA builds cannot
// contaminate production product data.
const PRODUCTION_POSTHOG_PROJECT_TOKEN = "phc_kE9qcChyPtqY7sRQ5oUFbaNk6aiGRFFkaiXpr9B3ycrG";
const PRODUCTION_POSTHOG_HOST = "https://us.i.posthog.com";

const IDENTIFIED_WORKSPACE_EVENTS = new Set([
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
  "first_record_reviewed",
  "action_created",
  "second_comparable_cycle_completed",
  "measurement_schedule_enabled",
  "record_share_created",
  "team_invite_sent",
]);

type PostHogCapturePayload = {
  uuid: string;
  event: string;
  properties: Record<string, unknown>;
};

let initialized = false;
let currentViewerId: string | null = null;
let currentOrganizationId: string | null = null;

function safeAnonymousTransportId(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) return null;
  if (value.includes("@") || /https?:\/\//i.test(value) || /\s/.test(value)) return null;
  return /^[A-Za-z0-9_$:.-]+$/.test(value) ? value : null;
}

function transportProperties(properties: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  if (properties.token === PRODUCTION_POSTHOG_PROJECT_TOKEN) safe.token = PRODUCTION_POSTHOG_PROJECT_TOKEN;
  const distinctId = currentViewerId || safeAnonymousTransportId(properties.distinct_id);
  if (distinctId) safe.distinct_id = distinctId;
  return safe;
}

function sanitizePostHogPayload(event: PostHogCapturePayload | null): PostHogCapturePayload | null {
  if (!event?.event) return null;
  const rawProperties = event.properties;
  const transport = transportProperties(rawProperties);

  if (event.event === "$identify") {
    if (!currentViewerId) return null;
    const anonymousId = safeAnonymousTransportId(rawProperties.$anon_distinct_id);
    return {
      ...event,
      event: "$identify",
      properties: {
        ...transport,
        distinct_id: currentViewerId,
        ...(anonymousId ? { $anon_distinct_id: anonymousId } : {}),
      },
    };
  }

  const sanitized = sanitizeProductAnalyticsEvent(event.event, rawProperties);
  if (!sanitized) return null;
  if (IDENTIFIED_WORKSPACE_EVENTS.has(sanitized.event) && !currentViewerId) return null;
  return {
    ...event,
    event: sanitized.event,
    properties: {
      ...transport,
      ...sanitized.properties,
      ...(currentOrganizationId ? { $groups: { organization: currentOrganizationId } } : {}),
    },
  };
}

export function initializeProductAnalytics() {
  if (initialized || typeof window === "undefined") return initialized;
  if (!shouldEnableProductAnalytics(process.env.NODE_ENV, window.location.hostname)) return false;

  posthog.init(PRODUCTION_POSTHOG_PROJECT_TOKEN, {
    api_host: PRODUCTION_POSTHOG_HOST,
    defaults: "2026-05-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
    // Foremention analytics is intentionally first-party to foremention.com. Avoid
    // PostHog's registrable-domain cookie probe, which Firefox reports as invalid
    // domain console errors while testing candidate parent domains.
    cross_subdomain_cookie: false,
    secure_cookie: window.location.protocol === "https:",
    before_send: (event) => sanitizePostHogPayload(event),
  });
  initialized = true;
  return true;
}

export function captureProductEvent(event: string, properties: Record<string, unknown> = {}) {
  if (!initializeProductAnalytics()) return;
  const sanitized = sanitizeProductAnalyticsEvent(event, properties);
  if (!sanitized) return;
  if (IDENTIFIED_WORKSPACE_EVENTS.has(sanitized.event) && !currentViewerId) return;
  posthog.capture(sanitized.event, sanitized.properties);
}

export function identifyProductAnalyticsUser(viewerId: string, organizationId?: string) {
  if (!initializeProductAnalytics()) return false;
  const normalizedViewerId = normalizeInternalAnalyticsId(viewerId);
  if (!normalizedViewerId) return false;
  const normalizedOrganizationId = organizationId ? normalizeInternalAnalyticsId(organizationId) : null;

  currentViewerId = normalizedViewerId;
  currentOrganizationId = normalizedOrganizationId;
  posthog.identify(normalizedViewerId);
  return true;
}

export function resetProductAnalytics() {
  currentViewerId = null;
  currentOrganizationId = null;
  if (!initialized) return;
  posthog.reset();
}
