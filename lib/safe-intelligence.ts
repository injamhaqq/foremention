import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import {
  assessExactQuestionComparability,
  type ComparableQuestionSlot,
} from "@/lib/intelligence-comparability";
import { loadWeeklyIntelligence, type WeeklyIntelligence } from "@/lib/intelligence-loop";
import { supabaseRest } from "@/lib/supabase-rest";

type SlotRow = {
  run_id: string;
  prompt_key: string;
  prompt_text: string | null;
  provider: string;
  model: string | null;
};

function exactBaselineHref(latestRunId: string) {
  return `/app/runs/${latestRunId}`;
}

function tightenCustomerReturnLoop(intelligence: WeeklyIntelligence): WeeklyIntelligence {
  const latest = intelligence.latest;
  if (!latest) return intelligence;

  if (!intelligence.previous && intelligence.nextAction.title === "Repeat the same evidence set") {
    return {
      ...intelligence,
      nextAction: {
        ...intelligence.nextAction,
        href: exactBaselineHref(latest.id),
        cta: "Open exact baseline",
      },
    };
  }

  if (intelligence.nextAction.title === "Run the next scheduled comparison") {
    return {
      ...intelligence,
      nextAction: {
        priority: "watch",
        title: "Repeat the same evidence set when ready",
        reason: "No automatic schedule is implied. Open the latest reviewed baseline and repeat its exact questions with the same provider; movement is reported only if the exact model and methodology also remain comparable.",
        href: exactBaselineHref(latest.id),
        cta: "Open exact baseline",
      },
      cadence: {
        ...intelligence.cadence,
        description: `Updated from the latest human-reviewed collection on ${latest.date}. Foremention does not automatically schedule a paid rerun; repeat the exact reviewed evidence set when a new comparable observation is worth collecting.`,
      },
    };
  }

  return intelligence;
}

function withholdUnsafePair(intelligence: WeeklyIntelligence, reason: string): WeeklyIntelligence {
  const latest = intelligence.latest;
  if (!latest) return intelligence;
  const confidenceChecks = intelligence.confidenceChecks.map((check) => check.label === "Repeatability"
    ? {
      ...check,
      state: "attention" as const,
      value: "1 exact baseline",
      detail: `${reason} Foremention withholds cross-collection movement until the exact persisted buyer-question text, provider, exact model, and methodology all match.`,
    }
    : check);

  return {
    ...intelligence,
    previous: null,
    changes: [{
      id: "exact-comparison-withheld",
      kind: "baseline",
      tone: "attention",
      title: "Cross-collection movement withheld",
      detail: `${reason} The latest reviewed collection remains valid evidence on its own; no trend delta is being inferred from a non-identical run.`,
      href: exactBaselineHref(latest.id),
    }],
    confidence: intelligence.confidence === "decision-ready" ? "directional" : intelligence.confidence,
    confidenceChecks,
    nextAction: {
      priority: "now",
      title: "Repeat the exact reviewed evidence set",
      reason: "A comparable trend requires the same persisted buyer-question text, provider, exact model, and methodology.",
      href: exactBaselineHref(latest.id),
      cta: "Open exact baseline",
    },
    cadence: {
      mode: "reviewed runs",
      description: `Updated from the latest human-reviewed collection on ${latest.date}. Cross-collection movement is withheld until the exact buyer-question text, provider, exact model, and methodology match a prior reviewed run.`,
    },
  };
}

/**
 * Safety wrapper around the weekly intelligence engine.
 *
 * The base engine already restricts candidates to complete/partial reviewed
 * runs with matching methodology + prompt-key/provider/model matrices. This
 * final customer-facing gate verifies the exact persisted question text too,
 * preventing a reused prompt key from creating a false like-for-like trend.
 * It also routes repeat work back through the exact reviewed baseline instead
 * of implying that Foremention automatically schedules a paid rerun.
 */
export async function loadSafeWeeklyIntelligence(viewer: Viewer): Promise<WeeklyIntelligence> {
  const intelligence = await loadWeeklyIntelligence(viewer);
  if (viewer.mode === "demo" || !viewer.accessToken || !intelligence.latest || !intelligence.previous) {
    return tightenCustomerReturnLoop(intelligence);
  }

  const context = await loadWorkspaceContext(viewer);
  if (!context) return withholdUnsafePair(intelligence, "The active workspace context could not be verified.");

  const runIds = [intelligence.latest.id, intelligence.previous.id];
  const rows = await supabaseRest<SlotRow[]>(
    `run_answers?select=run_id,prompt_key,prompt_text,provider,model&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=500`,
    { token: viewer.accessToken },
  );
  const slots: ComparableQuestionSlot[] = rows.map((row) => ({
    runId: row.run_id,
    promptKey: row.prompt_key,
    promptText: row.prompt_text,
    provider: row.provider,
    model: row.model,
  }));
  const assessment = assessExactQuestionComparability(intelligence.latest.id, intelligence.previous.id, slots);
  return assessment.comparable
    ? tightenCustomerReturnLoop(intelligence)
    : withholdUnsafePair(intelligence, assessment.reason || "The reviewed collections are not exactly comparable.");
}
