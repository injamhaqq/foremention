"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { captureProductEvent, initializeProductAnalytics } from "@/lib/product-analytics";

const apiDurations: number[] = [];

function performanceSnapshot(samples: number[]) {
  const values = [...samples].sort((left, right) => left - right);
  const percentile = (value: number) => values[Math.max(0, Math.ceil(values.length * value) - 1)] || 0;
  return { sample_size: values.length, p50_ms: percentile(0.5), p95_ms: percentile(0.95), p99_ms: percentile(0.99) };
}

function safeApiRoute(value: string) {
  return value.replace(/\/[0-9a-f-]{20,}(?=\/|$)/gi, "/:id").replace(/\?.*$/, "");
}

function productSurface(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/product") return "product";
  if (pathname === "/pricing") return "pricing";
  if (pathname === "/score") return "score";
  if (pathname === "/prompt-check") return "prompt_check";
  if (pathname === "/login") return "login";
  if (pathname === "/signup") return "signup";
  if (pathname === "/forgot-password" || pathname === "/reset-password") return "account_recovery";
  if (pathname === "/app") return "overview";
  if (pathname.startsWith("/app/onboarding")) return "onboarding";
  if (pathname.startsWith("/app/prompts")) return "questions";
  if (pathname.startsWith("/app/runs")) return "ai_results";
  if (pathname === "/app/source-map" || pathname.startsWith("/app/sources")) return "sources";
  if (pathname.startsWith("/app/competitors")) return "competitors";
  if (pathname.startsWith("/app/opportunities")) return "opportunities";
  if (pathname.startsWith("/app/resolution-center") || pathname.startsWith("/app/actions")) return "actions";
  if (pathname.startsWith("/app/analytics")) return "analytics";
  if (pathname.startsWith("/app/settings")) return "settings";
  return pathname.startsWith("/app") ? "workspace_other" : "public_other";
}

export function PostHogAnalytics() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = initializeProductAnalytics();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    captureProductEvent("$pageview", { surface: productSurface(pathname) });
  }, [pathname]);

  useEffect(() => {
    if (!initialized.current) return;
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation?.duration) captureProductEvent("page_load_performance", { duration_ms: Math.round(navigation.duration) });

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startedAt = performance.now();
      try {
        const response = await originalFetch(...args);
        const target = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : args[0].toString();
        const parsed = new URL(target, window.location.origin);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/")) {
          apiDurations.push(Math.round(performance.now() - startedAt));
          if (apiDurations.length > 50) apiDurations.shift();
          captureProductEvent("api_performance", { ...performanceSnapshot(apiDurations), route: safeApiRoute(parsed.pathname), status: response.status });
        }
        return response;
      } catch (error) {
        apiDurations.push(Math.round(performance.now() - startedAt));
        if (apiDurations.length > 50) apiDurations.shift();
        captureProductEvent("api_performance", { ...performanceSnapshot(apiDurations), route: "request_failed", status: 0 });
        throw error;
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  return null;
}

export function PostHogIdentity({ viewerId, organizationId, demo }: { viewerId: string; organizationId?: string; demo: boolean }) {
  useEffect(() => {
    if (demo || !initializeProductAnalytics()) return;
    posthog.identify(viewerId);
    if (organizationId) posthog.group("organization", organizationId);
  }, [demo, organizationId, viewerId]);

  return null;
}
