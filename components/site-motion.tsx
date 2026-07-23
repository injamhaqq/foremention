"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

export function SiteMotion() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".public-header");
    const progress = document.querySelector<HTMLElement>(".site-progress__bar");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = Array.from(document.querySelectorAll<HTMLElement>([
      "main > section:not(:first-child)",
      ".section-heading",
      ".system-grid article",
      ".pricing-card",
      ".contact-grid article",
      ".method-grid article",
      ".honesty-grid article",
      ".report-body > section",
      ".platform-steps article",
      ".platform-ledger > div",
      ".home-pricing-grid article",
      ".truth-list > div",
      ".goat-learning-grid article",
      ".goat-offers article",
    ].join(",")));

    root.classList.add("motion-ready");
    targets.forEach((target, index) => {
      target.classList.add("fm-reveal");
      target.classList.remove("is-visible");
      target.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
    });

    let observer: IntersectionObserver | null = null;
    let revealFrame = 0;
    let settleFrame = 0;
    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
    } else {
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add("is-visible");
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -6%", threshold: 0.04 });
    }

    let frame = 0;
    const updateScroll = () => {
      frame = 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const ratio = Math.max(0, Math.min(1, window.scrollY / max));
      progress?.style.setProperty("transform", `scaleX(${ratio})`);
      header?.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    const requestScrollUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScroll);
    };
    const revealVisibleTargets = () => {
      targets.forEach((target) => {
        const bounds = target.getBoundingClientRect();
        if (bounds.top < window.innerHeight * 0.94 && bounds.bottom > 0) {
          target.classList.add("is-visible");
          observer?.unobserve(target);
        }
      });
      requestScrollUpdate();
    };

    if (observer) {
      revealFrame = window.requestAnimationFrame(() => {
        settleFrame = window.requestAnimationFrame(() => {
          root.classList.add("motion-active");
          targets.forEach((target) => observer?.observe(target));
          revealVisibleTargets();
        });
      });
    } else {
      requestScrollUpdate();
    }
    window.addEventListener("scroll", requestScrollUpdate, { passive: true });
    window.addEventListener("resize", requestScrollUpdate, { passive: true });
    window.addEventListener("pageshow", revealVisibleTargets);
    document.addEventListener("visibilitychange", revealVisibleTargets);

    return () => {
      observer?.disconnect();
      if (revealFrame) window.cancelAnimationFrame(revealFrame);
      if (settleFrame) window.cancelAnimationFrame(settleFrame);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestScrollUpdate);
      window.removeEventListener("resize", requestScrollUpdate);
      window.removeEventListener("pageshow", revealVisibleTargets);
      document.removeEventListener("visibilitychange", revealVisibleTargets);
      targets.forEach((target) => {
        target.classList.remove("fm-reveal", "is-visible");
        target.style.removeProperty("--reveal-delay");
      });
      root.classList.remove("motion-ready", "motion-active");
    };
  }, [pathname]);

  return null;
}
