"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { captureProductEvent } from "@/lib/product-analytics";
import { safePublicScoreId } from "@/lib/score-handoff";

type WizardProps = ComponentProps<typeof OnboardingWizard>;
type ScoreAwareOnboardingProps = WizardProps & { scoreId?: string };

type PublicScoreResult = {
  brand?: string;
  category?: string;
  questions?: Array<{ question?: string }>;
};

function hasUsableSavedDraft(draftKey: string) {
  try {
    const saved = window.localStorage.getItem(draftKey);
    if (!saved) return false;
    const parsed = JSON.parse(saved) as { values?: unknown };
    if (parsed?.values) return true;
    window.localStorage.removeItem(draftKey);
    return false;
  } catch {
    window.localStorage.removeItem(draftKey);
    return false;
  }
}

/** Set by the public Prompt Check "Track this question" link (same browser). */
export const TRACKED_QUESTION_KEY = "foremention:track-question";

function takeTrackedQuestion(): { brand: string; question: string } | null {
  try {
    const raw = window.localStorage.getItem(TRACKED_QUESTION_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(TRACKED_QUESTION_KEY);
    const parsed = JSON.parse(raw) as { brand?: unknown; question?: unknown; savedAt?: unknown };
    const brand = String(parsed.brand || "").trim().slice(0, 80);
    const question = String(parsed.question || "").trim().slice(0, 500);
    const savedAt = Number(parsed.savedAt || 0);
    // Only carry a question saved in the last 7 days.
    if (question.length < 8 || !Number.isFinite(savedAt) || Date.now() - savedAt > 7 * 86_400_000) return null;
    return { brand, question };
  } catch {
    return null;
  }
}

export function ScoreAwareOnboarding({ scoreId = "", ...wizardProps }: ScoreAwareOnboardingProps) {
  const normalizedScoreId = safePublicScoreId(scoreId);
  const [ready, setReady] = useState(wizardProps.demo);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (wizardProps.demo || normalizedScoreId) return;
    const tracked = takeTrackedQuestion();
    if (tracked && !hasUsableSavedDraft(wizardProps.draftKey)) {
      window.localStorage.setItem(wizardProps.draftKey, JSON.stringify({
        step: 0,
        values: {
          companyName: tracked.brand,
          domain: "",
          market: "Global",
          category: "",
          categoryDescription: "",
          competitors: "",
          goal: "Establish a measurement baseline",
          constraint: "Use dated observations and reviewed evidence. Do not claim guaranteed rankings or revenue.",
          prompts: tracked.question,
        },
      }));
      captureProductEvent("prompt_check_question_prefilled", { question_count: 1 });
    }
    // Defer state updates out of the effect body (react-hooks/set-state-in-effect).
    queueMicrotask(() => {
      if (tracked) setNotice("Your Prompt Check question is ready as the first buyer question. Add your website to complete setup.");
      setReady(true);
    });
  }, [normalizedScoreId, wizardProps.demo, wizardProps.draftKey]);

  useEffect(() => {
    if (wizardProps.demo || !normalizedScoreId) return;
    let cancelled = false;

    async function prepareScoreContext() {
      try {
        if (hasUsableSavedDraft(wizardProps.draftKey)) return;

        const response = await fetch(`/api/public/score?id=${encodeURIComponent(normalizedScoreId)}`, { cache: "no-store" });
        const body = await response.json().catch(() => ({})) as { data?: PublicScoreResult };
        const brand = String(body.data?.brand || "").trim();
        const category = String(body.data?.category || "").trim();
        const prompts = (body.data?.questions || [])
          .map((item) => String(item.question || "").trim())
          .filter(Boolean)
          .slice(0, 5);

        if (!response.ok || brand.length < 2 || category.length < 3 || prompts.length === 0) {
          captureProductEvent("score_context_prefill_failed", { reason: response.ok ? "invalid_context" : "unavailable" });
          return;
        }

        window.localStorage.setItem(wizardProps.draftKey, JSON.stringify({
          step: 0,
          values: {
            companyName: brand,
            domain: "",
            market: "Global",
            category,
            categoryDescription: "",
            competitors: "",
            goal: "Establish a measurement baseline",
            constraint: "Use dated observations and reviewed evidence. Do not claim guaranteed rankings or revenue.",
            prompts: prompts.join("\n"),
          },
        }));
        captureProductEvent("score_context_prefilled", { question_count: prompts.length });
        if (!cancelled) setNotice("Your brand, category, and buyer questions from the public check are ready. Add your website to verify and complete setup.");
      } catch {
        captureProductEvent("score_context_prefill_failed", { reason: "client_error" });
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void prepareScoreContext();
    return () => { cancelled = true; };
  }, [normalizedScoreId, wizardProps.demo, wizardProps.draftKey]);

  if (!ready) {
    return <div className="onboarding-complete" role="status" aria-live="polite"><span className="eyebrow">Carrying your public check forward</span><h2>Preparing your setup.</h2><p>Foremention is carrying only your brand, category, and buyer questions into setup. The public result itself does not become verified workspace evidence.</p></div>;
  }

  return <>{notice && <p className="inline-notice" role="status">{notice}</p>}<OnboardingWizard {...wizardProps} /></>;
}
