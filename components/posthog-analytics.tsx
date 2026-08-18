"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureProductEvent, identifyProductAnalyticsUser, initializeProductAnalytics } from "@/lib/product-analytics";
import { httpStatusClass, latencyBucket } from "@/lib/product-analytics-contract";

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
    if (navigation?.duration) {
      captureProductEvent("performance_observed", {
        operation: "page_load",
        latency_bucket: latencyBucket(navigation.duration),
        outcome: "success",
        status_class: "unknown",
      });
    }

    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startedAt = performance.now();
      try {
        const response = await originalFetch(...args);
        const target = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : args[0].toString();
        const parsed = new URL(target, window.location.origin);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/")) {
          captureProductEvent("performance_observed", {
            operation: "api_request",
            latency_bucket: latencyBucket(performance.now() - startedAt),
            outcome: response.ok ? "success" : "failure",
            status_class: httpStatusClass(response.status),
          });
        }
        return response;
      } catch (error) {
        captureProductEvent("performance_observed", {
          operation: "api_request",
          latency_bucket: latencyBucket(performance.now() - startedAt),
          outcome: "failure",
          status_class: "network_error",
        });
        throw error;
      }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  return null;
}

export function PostHogIdentity({ viewerId, organizationId, demo }: { viewerId: string; organizationId?: string; demo: boolean }) {
  useEffect(() => {
    if (demo) return;
    identifyProductAnalyticsUser(viewerId, organizationId);
  }, [demo, organizationId, viewerId]);

  return null;
}
