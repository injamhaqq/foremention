"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureProductEvent } from "@/lib/product-analytics";

function captureOncePerSession(key: string, event: string, properties: Record<string, string | number | boolean | null> = {}) {
  const storageKey = `foremention:analytics:${key}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    captureProductEvent(event, properties);
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    // Product analytics must never break the workspace when browser storage is unavailable.
    captureProductEvent(event, properties);
  }
}

function entrySurface(pathname: string) {
  if (pathname === "/app/onboarding") return "onboarding";
  if (pathname.startsWith("/app/runs")) return "ai_results";
  if (pathname.startsWith("/app/sources") || pathname === "/app/source-map") return "sources";
  return "workspace";
}

export function WorkspaceActivationAnalytics({ demo }: { demo: boolean }) {
  const pathname = usePathname();

  useEffect(() => {
    if (demo) return;

    captureOncePerSession("authenticated-workspace", "auth_session_established", {
      entry_surface: entrySurface(pathname),
    });

    if (pathname === "/app/onboarding") {
      captureOncePerSession("onboarding-started", "onboarding_started");
    }

    const runDetail = /^\/app\/runs\/(?!compare(?:\/|$))[^/]+$/.test(pathname);
    if (runDetail) {
      let secondFrame = 0;
      const firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const hasAnswer = Boolean(document.querySelector(".answer-stack > article.panel"));
          const hasCitation = Boolean(document.querySelector(".answer-citations a"));
          if (hasAnswer) captureOncePerSession(`ai-result:${pathname}`, "ai_result_viewed");
          if (hasCitation) captureOncePerSession(`citation-result:${pathname}`, "citation_result_viewed");
        });
      });
      return () => {
        window.cancelAnimationFrame(firstFrame);
        if (secondFrame) window.cancelAnimationFrame(secondFrame);
      };
    }

    if (/^\/app\/sources\/[^/]+$/.test(pathname)) {
      captureOncePerSession(`source-xray:${pathname}`, "source_xray_viewed");
    }
  }, [demo, pathname]);

  return null;
}
