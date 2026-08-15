import type { Viewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { assessWorkspaceRunPairComparability } from "@/lib/run-pair-comparability";
import { supabaseRest } from "@/lib/supabase-rest";

type ReviewedRunRow = {
  id: string;
  status: string;
  created_at: string;
  created_by: string | null;
};

type SafeChange = {
  eventKey: string;
  title: string;
  body: string;
};

export type ReviewedChangeNotificationResult = {
  status: "recorded" | "no_change" | "withheld" | "no_baseline" | "skipped";
  reason?: string;
  notificationCount?: number;
  previousRunId?: string;
};

const terminalReviewedStates = new Set(["complete", "partial"]);

function pctBrandPresence(values: Array<boolean | null>) {
  if (!values.length || values.some((value) => value === null)) return null;
  const present = values.filter(Boolean).length;
  return Math.round((present / values.length) * 10_000) / 100;
}

/**
 * Records customer-facing movement only after the later run is human-reviewed
 * and the shared run-pair comparability gate proves identical persisted
 * question text, provider, exact model, and methodology.
 *
 * The older pre-review detector is intentionally not used as evidence. Its
 * legacy notification keys remain blocked by the database suppression trigger.
 */
export async function recordReviewedComparableChangeNotifications(
  viewer: Viewer,
  runId: string,
): Promise<ReviewedChangeNotificationResult> {
  if (viewer.mode === "demo" || !viewer.accessToken) return { status: "skipped" };

  const context = await loadWorkspaceContext(viewer);
  if (!context) return { status: "withheld", reason: "The active workspace could not be verified." };

  const currentRows = await supabaseRest<ReviewedRunRow[]>(
    `runs?select=id,status,created_at,created_by&id=eq.${encodeURIComponent(runId)}&organization_id=eq.${context.organizationId}&limit=1`,
    { token: viewer.accessToken },
  );
  const current = currentRows[0];
  if (!current || !terminalReviewedStates.has(current.status)) {
    return { status: "withheld", reason: "The later collection has not completed human review." };
  }

  const previousRows = await supabaseRest<ReviewedRunRow[]>(
    `runs?select=id,status,created_at,created_by&organization_id=eq.${context.organizationId}&id=neq.${current.id}&status=in.(complete,partial)&created_at=lt.${encodeURIComponent(current.created_at)}&order=created_at.desc&limit=1`,
    { token: viewer.accessToken },
  );
  const previous = previousRows[0];
  if (!previous) return { status: "no_baseline" };

  const comparison = await assessWorkspaceRunPairComparability(viewer, previous.id, current.id);
  if (!comparison.comparable) {
    return {
      status: "withheld",
      reason: comparison.reason || "The reviewed collections are not exactly comparable.",
      previousRunId: previous.id,
    };
  }

  const currentAnswers = comparison.answers.filter((answer) => answer.runId === current.id);
  const previousAnswers = comparison.answers.filter((answer) => answer.runId === previous.id);
  const currentPresence = pctBrandPresence(currentAnswers.map((answer) => answer.brandPresent));
  const previousPresence = pctBrandPresence(previousAnswers.map((answer) => answer.brandPresent));
  const currentSources = new Set(currentAnswers.flatMap((answer) => answer.citations.map((citation) => citation.url)));
  const previousSources = new Set(previousAnswers.flatMap((answer) => answer.citations.map((citation) => citation.url)));
  const newSourceCount = Array.from(currentSources).filter((url) => !previousSources.has(url)).length;
  const lostSourceCount = Array.from(previousSources).filter((url) => !currentSources.has(url)).length;

  const changes: SafeChange[] = [];
  if (currentPresence !== null && previousPresence !== null && currentPresence !== previousPresence) {
    changes.push({
      eventKey: `reviewed_change:brand_presence:${current.id}`,
      title: "Brand appearance changed in comparable evidence",
      body: `Across two human-reviewed collections with identical persisted question text, provider, exact model, and methodology, observed brand presence moved from ${previousPresence}% to ${currentPresence}%. This is an observed difference, not proof that any recorded action caused it.`,
    });
  }
  if (newSourceCount) {
    changes.push({
      eventKey: `reviewed_change:new_citation_sources:${current.id}`,
      title: "New citation sources appeared in comparable evidence",
      body: `${newSourceCount} provider-returned citation URL${newSourceCount === 1 ? "" : "s"} appeared in the later human-reviewed collection under identical measurement conditions. This is a longitudinal observation, not proof of causation.`,
    });
  }
  if (lostSourceCount) {
    changes.push({
      eventKey: `reviewed_change:lost_citation_sources:${current.id}`,
      title: "Citation sources did not recur in comparable evidence",
      body: `${lostSourceCount} previously returned citation URL${lostSourceCount === 1 ? "" : "s"} did not recur in the later human-reviewed collection under identical measurement conditions. This is a longitudinal observation, not proof of causation.`,
    });
  }

  if (!changes.length) return { status: "no_change", previousRunId: previous.id };

  await supabaseRest("notifications?on_conflict=organization_id,user_id,event_key", {
    method: "POST",
    serviceRole: true,
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: changes.map((change) => ({
      organization_id: context.organizationId,
      user_id: current.created_by || viewer.id,
      event_key: change.eventKey,
      kind: "workspace",
      title: change.title,
      body: change.body,
      href: "/app/intelligence",
    })),
  });

  return {
    status: "recorded",
    notificationCount: changes.length,
    previousRunId: previous.id,
  };
}
