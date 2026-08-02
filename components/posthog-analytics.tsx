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

export function PostHogAnalytics() {
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    initialized.current = initializeProductAnalytics();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}`,
      route: pathname,
    });
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
