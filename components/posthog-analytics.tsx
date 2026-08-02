"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { initializeProductAnalytics } from "@/lib/product-analytics";

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
