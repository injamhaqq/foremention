"use client";

import { useEffect } from "react";
import { captureProductEvent } from "@/lib/product-analytics";
import type { ProductAnalyticsEventName } from "@/lib/product-analytics-contract";

export function ProductEventOnView({ event }: { event: ProductAnalyticsEventName }) {
  useEffect(() => {
    captureProductEvent(event);
  }, [event]);
  return null;
}

export function CompletedCollectionEvents({ runs }: { runs: Array<{ id: string; status: string }> }) {
  useEffect(() => {
    for (const run of runs) {
      if (!["review", "complete", "partial", "failed", "cancelled"].includes(run.status)) continue;
      const storageKey = `foremention:analytics:workflow-terminal:${run.id}`;
      if (window.localStorage.getItem(storageKey)) continue;

      if (["review", "complete", "partial"].includes(run.status)) {
        captureProductEvent("workflow_completed", { outcome: run.status });
      } else {
        captureProductEvent("workflow_failed", {
          workflow_stage: "execution",
          error_category: run.status === "cancelled" ? "cancelled" : "execution_failed",
        });
      }
      window.localStorage.setItem(storageKey, "1");
    }
  }, [runs]);
  return null;
}
