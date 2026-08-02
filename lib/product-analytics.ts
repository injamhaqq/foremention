"use client";

import posthog from "posthog-js";

type AnalyticsValue = string | number | boolean | null;

const blockedPropertyPattern = /(email|name|password|token|secret|answer|prompt|citation|content|message|url)/i;
let initialized = false;

export function initializeProductAnalytics() {
  if (initialized || typeof window === "undefined") return initialized;
  const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!projectToken || !apiHost) return false;
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-05-30",
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_exceptions: false,
    disable_session_recording: true,
    person_profiles: "identified_only",
    persistence: "localStorage+cookie",
    secure_cookie: window.location.protocol === "https:",
  });
  initialized = true;
  return true;
}

export function captureProductEvent(event: string, properties: Record<string, AnalyticsValue> = {}) {
  if (!initializeProductAnalytics()) return;
  const safeProperties = Object.fromEntries(
    Object.entries(properties).filter(([key]) => !blockedPropertyPattern.test(key)),
  );
  posthog.capture(event, safeProperties);
}

export function resetProductAnalytics() {
  if (!initializeProductAnalytics()) return;
  posthog.reset();
}
