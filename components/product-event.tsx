"use client";

import { useEffect } from "react";
import { captureProductEvent } from "@/lib/product-analytics";

export function ProductEventOnView({ event }: { event: string }) {
  useEffect(() => {
    captureProductEvent(event);
  }, [event]);
  return null;
}

export function CompletedCollectionEvents({ runs }: { runs: Array<{ id: string; status: string }> }) {
  useEffect(() => {
    for (const run of runs) {
      if (!["review", "complete", "partial"].includes(run.status)) continue;
      const storageKey = `foremention:analytics:collection-completed:${run.id}`;
      if (window.localStorage.getItem(storageKey)) continue;
      captureProductEvent("collection_completed", { status: run.status });
      window.localStorage.setItem(storageKey, "1");
    }
  }, [runs]);
  return null;
}
