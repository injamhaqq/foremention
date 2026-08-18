"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureProductEvent } from "@/lib/product-analytics";

export function PublicActivationAnalytics() {
  const pathname = usePathname();
  const scoreAttempt = useRef(false);
  const scoreOutcomeCaptured = useRef(false);

  useEffect(() => {
    if (pathname === "/score") {
      const sharedResult = Boolean(new URLSearchParams(window.location.search).get("id"));
      captureProductEvent("score_viewed", { shared_result: sharedResult });

      const form = document.querySelector<HTMLFormElement>(".score-tool .intake-form");
      const root = document.querySelector<HTMLElement>(".score-tool");
      if (!form || !root) return;

      const onSubmit = () => {
        scoreAttempt.current = true;
        scoreOutcomeCaptured.current = false;
        captureProductEvent("score_started");
      };

      const captureOutcome = () => {
        if (!scoreAttempt.current || scoreOutcomeCaptured.current) return;
        if (root.querySelector(".score-result")) {
          scoreOutcomeCaptured.current = true;
          scoreAttempt.current = false;
          captureProductEvent("score_completed", { question_count: 5 });
          return;
        }
        if (root.querySelector(".form-error")) {
          scoreOutcomeCaptured.current = true;
          scoreAttempt.current = false;
          captureProductEvent("score_failed", { error_category: "live_check_failed" });
        }
      };

      form.addEventListener("submit", onSubmit);
      const observer = new MutationObserver(captureOutcome);
      observer.observe(root, { childList: true, subtree: true });
      return () => {
        form.removeEventListener("submit", onSubmit);
        observer.disconnect();
      };
    }

    if (pathname === "/signup") {
      const form = document.querySelector<HTMLFormElement>(".auth-card form");
      const google = document.querySelector<HTMLAnchorElement>('.auth-card a[href^="/api/auth/google"]');
      const onSubmit = () => captureProductEvent("signup_started", { method: "email" });
      const onGoogle = () => captureProductEvent("signup_started", { method: "google" });
      form?.addEventListener("submit", onSubmit);
      google?.addEventListener("click", onGoogle);
      return () => {
        form?.removeEventListener("submit", onSubmit);
        google?.removeEventListener("click", onGoogle);
      };
    }
  }, [pathname]);

  return null;
}
