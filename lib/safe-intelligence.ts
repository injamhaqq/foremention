import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import {
  validPairedRunAnswerBudget,
  assessCompleteVerifiedRunPair,
  type ComparableStoredAnswer,
  type ComparableStoredRun,
} from "@/lib/run-pair-answer-gate";
import { loadWeeklyIntelligence, type WeeklyIntelligence } from "@/lib/intelligence-loop";
import { supabaseRest } from "@/lib/supabase-rest";

type SlotRow = ComparableStoredAnswer;
type IndependentReviewedRun = ComparableStoredRun & {
  status: string;
  methodology_version: string | null;
};

const exactMeasurementBoundary = "exact persisted buyer-question text, provider, exact model, methodology, locale, market, buyer stage, and measurement context";

function exactBaselineHref(latestRunId: string) {
  return `/app/runs/${latestRunId}`;
}

function makeCustomerReturnLoopTruthful(intelligence: WeeklyIntelligence): WeeklyIntelligence {
  const latest = intelligence.latest;
  if (!latest) return intelligence;

  if (!intelligence.previous && intelligence.nextAction.title === "Repeat the same evidence set") {
    return {
      ...intelligence,
      nextAction: {
        ...intelligence.nextAction,
        title: "Repeat the same questions and provider",
        reason: `Open the latest finalized reviewed baseline to reuse its saved questions and provider. Foremention will compare the later observation only if the ${exactMeasurementBoundary} remain compatible.`,
        href: exactBaselineHref(latest.id),
        cta: "Open reviewed baseline",
      },
    };
  }

  if (intelligence.nextAction.title === "Run the next scheduled comparison") {
    return {
      ...intelligence,
      nextAction: {
        priority: "watch",
        title: "Open the reviewed baseline",
        reason: `Eligible workspaces are checked weekly for a capped re-observation. A new provider run is queued only when provider configuration, capacity, quota, and spend controls allow it. You can also repeat this reviewed baseline manually. Foremention reports a comparison only when the ${exactMeasurementBoundary} remain compatible.`,
        href: exactBaselineHref(latest.id),
        cta: "Open reviewed baseline",
      },
      cadence: {
        ...intelligence.cadence,
        description: `Updated from the latest finalized reviewed collection on ${latest.date}. Eligible workspaces are checked weekly for a capped re-observation; a new provider run is queued only when provider configuration, capacity, quota, and spend controls allow it. Any later movement still requires compatible measurement conditions.`,
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
      detail: `${reason} Foremention withholds cross-collection movement until the ${exactMeasurementBoundary} all match.`,
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
      detail: `${reason} The latest finalized reviewed collection remains valid evidence on its own; no trend delta is being inferred from a non-identical run.`,
      href: exactBaselineHref(latest.id),
    }],
    confidence: intelligence.confidence === "decision-ready" ? "directional" : intelligence.confidence,
    confidenceChecks,
    nextAction: {
      priority: "now",
      title: "Repeat the same reviewed questions and provider",
      reason: `Open the latest finalized reviewed baseline. A later trend is comparable only if the ${exactMeasurementBoundary} all match.`,
      href: exactBaselineHref(latest.id),
      cta: "Open reviewed baseline",
    },
    cadence: {
      mode: "reviewed runs",
      description: `Updated from the latest finalized reviewed collection on ${latest.date}. Cross-collection movement is withheld until the ${exactMeasurementBoundary} match a prior finalized reviewed run.`,
    },
  };
}

async function withTruthfulSourceReview(viewer: Viewer, intelligence: WeeklyIntelligence): Promise<WeeklyIntelligence> {
  if (viewer.mode === "demo" || !intelligence.latest) return intelligence;
  const sources = await loadTruthfulSourceMap(viewer, { runId: intelligence.latest.id });
  const reviewedCount = sources.filter((source) => Boolean(source.reviewedAt)).length;
  const sourceReviewPct = sources.length ? Math.round((reviewedCount / sources.length) * 100) : null;
  const confidenceChecks = intelligence.confidenceChecks.map((check) => check.label === "Source review"
    ? {
      ...check,
      state: sourceReviewPct === null ? "missing" as const : sourceReviewPct >= 80 ? "pass" as const : "attention" as const,
      value: sourceReviewPct === null ? "Needs data" : `${sourceReviewPct}%`,
      detail: sourceReviewPct === null
        ? "No Source Map is available for the exact finalized baseline run."
        : `${reviewedCount} of ${sources.length} mapped pages have an explicit human review. Automated crawler checks do not count.`,
    }
    : check);
  const passingChecks = confidenceChecks.filter((check) => check.state === "pass").length;
  const confidence: WeeklyIntelligence["confidence"] = passingChecks === confidenceChecks.length
    ? "decision-ready"
    : intelligence.latest && passingChecks >= 2
      ? "directional"
      : "insufficient";
  const sourceSearchRecords: WeeklyIntelligence["searchRecords"] = sources.map((source) => ({
    id: `source-${source.id}`,
    kind: "Source",
    title: source.title || source.domain,
    detail: `${source.evidenceCount} citation observation${source.evidenceCount === 1 ? "" : "s"} · ${source.reviewedAt ? source.clientPresent ? "brand present in human review" : "brand absent in human review" : "brand presence not human-reviewed"}`,
    meta: `${source.domain} · ${source.engines.join(", ") || "provider unavailable"}`,
    href: `/app/sources/${source.id}`,
  }));
  let nextAction = intelligence.nextAction;
  if (intelligence.previous && (sourceReviewPct ?? 0) < 80) {
    nextAction = {
      priority: "now",
      title: "Review the next cited page",
      reason: `${sourceReviewPct ?? 0}% of mapped pages in the exact finalized baseline have an explicit human review. Automated retrieval does not satisfy this evidence gate.`,
      href: "/app/source-map",
      cta: "Review source evidence",
    };
  } else if (sourceReviewPct !== null && sourceReviewPct >= 80 && nextAction.title === "Review the next cited page") {
    nextAction = {
      priority: intelligence.previous ? "watch" : "now",
      title: intelligence.previous ? "Open the reviewed baseline" : "Repeat the same questions and provider",
      reason: intelligence.previous
        ? `The human source-review gate is healthy. Preserve the ${exactMeasurementBoundary} for the next controlled observation.`
        : `The source-review gate is healthy, but one finalized baseline is not a trend. Repeat the same reviewed questions with the same provider; a later trend is comparable only if the ${exactMeasurementBoundary} still match.`,
      href: exactBaselineHref(intelligence.latest.id),
      cta: "Open reviewed baseline",
    };
  }
  return {
    ...intelligence,
    sourceReviewPct,
    confidenceChecks,
    confidence,
    searchRecords: [
      ...intelligence.searchRecords.filter((record) => record.kind !== "Source"),
      ...sourceSearchRecords,
    ],
    nextAction,
  };
}

/**
 * Safety wrapper around the weekly intelligence engine.
 *
 * The base engine restricts candidates to finalized complete/partial runs with
 * verified answers and matching methodology + prompt-key/provider/model
 * matrices. This final customer-facing gate verifies the exact persisted
 * question text plus locale, market, buyer stage and versioned measurement
 * context, preventing superficially similar collections from creating a false
 * like-for-like trend. It then replaces crawler-derived source-review state
 * with explicit human-review provenance tied to the exact finalized baseline.
 */
export async function loadSafeWeeklyIntelligence(viewer: Viewer): Promise<WeeklyIntelligence> {
  const intelligence = await loadWeeklyIntelligence(viewer);
  if (viewer.mode === "demo") return makeCustomerReturnLoopTruthful(intelligence);

  let pairSafe = intelligence;
  if (viewer.accessToken && intelligence.latest && intelligence.previous) {
    const context = await loadWorkspaceContext(viewer);
    if (!context) {
      pairSafe = withholdUnsafePair(intelligence, "The active workspace context could not be verified.");
    } else {
      const runIds = [intelligence.latest.id, intelligence.previous.id];
      // The older summary engine can select two superficially matching rows
      // from a truncated 500-answer query. Independently re-read the actual
      // full-run denominators in this currently active project before showing
      // a trend, analytics delta or generating a board-facing recommendation.
      const scopedRuns = await supabaseRest<IndependentReviewedRun[]>(
        `runs?select=id,answer_count,status,methodology_version&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&id=in.(${runIds.join(",")})&status=in.(complete,partial)&limit=2`,
        { token: viewer.accessToken },
      );
      const latest = scopedRuns.find((row) => row.id === intelligence.latest?.id);
      const previous = scopedRuns.find((row) => row.id === intelligence.previous?.id);
      if (!latest || !previous || !latest.methodology_version
        || latest.methodology_version !== previous.methodology_version) {
        pairSafe = withholdUnsafePair(intelligence,
          "Both completed human-reviewed runs must belong to the active project with identical independently recorded methodology.");
      } else {
        const budget = validPairedRunAnswerBudget(previous, latest);
        if (!budget.comparable) {
          pairSafe = withholdUnsafePair(intelligence,
            budget.reason || "The complete independent reviewed-answer set is unavailable.");
        } else {
          const rows = await supabaseRest<SlotRow[]>(
            `run_answers?select=run_id,prompt_key,prompt_text,provider,model,measurement_context_json&organization_id=eq.${context.organizationId}&run_id=in.(${runIds.join(",")})&review_status=eq.verified&order=collected_at.asc&limit=500`,
            { token: viewer.accessToken },
          );
          // Positive source-run counts must match ALL returned verified rows.
          // One read slot is reserved to reveal otherwise hidden overflow at
          // the PostgREST response cap; two matching subsets prove nothing.
          const assessment = assessCompleteVerifiedRunPair(previous, latest, rows);
          pairSafe = assessment.comparable
            ? intelligence
            : withholdUnsafePair(intelligence,
              assessment.reason || "The finalized reviewed collections are not independently complete and comparable.");
        }
      }
    }
  }

  const returnLoopSafe = makeCustomerReturnLoopTruthful(pairSafe);
  return withTruthfulSourceReview(viewer, returnLoopSafe);
}