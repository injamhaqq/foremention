"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { captureProductEvent } from "@/lib/product-analytics";

function publicSurface(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/product") return "product";
  if (pathname === "/pricing") return "pricing";
  return "public_other";
}

export function PublicActivationAnalytics() {
  const pathname = usePathname();
  const scoreAttempt = useRef(false);
  const scoreOutcomeCaptured = useRef(false);
  const designPartnerStartCaptured = useRef(false);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-design-partner-cta]")) return;
      captureProductEvent("design_partner_cta_clicked", { surface: publicSurface(pathname) });
    };

    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/recommendation-intelligence") {
      captureProductEvent("category_page_viewed");
      return;
    }
    if (pathname === "/insights" || pathname.startsWith("/insights/")) {
      captureProductEvent("research_page_viewed");
      return;
    }
    if (pathname === "/partners") {
      captureProductEvent("partner_page_viewed");
      return;
    }

    if (pathname === "/contact") {
      captureProductEvent("design_partner_page_viewed");
      if (new URLSearchParams(window.location.search).get("submitted") === "1") {
        captureProductEvent("design_partner_application_submitted");
      }

      const form = document.querySelector<HTMLFormElement>("[data-design-partner-form]");
      if (!form) return;
      designPartnerStartCaptured.current = false;

      const onStart = () => {
        if (designPartnerStartCaptured.current) return;
        designPartnerStartCaptured.current = true;
        captureProductEvent("design_partner_application_started");
      };

      form.addEventListener("focusin", onStart);
      return () => form.removeEventListener("focusin", onStart);
    }

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
