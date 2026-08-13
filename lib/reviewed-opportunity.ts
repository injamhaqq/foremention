import type { EntryRoute } from "@/lib/types";

export type ReviewedOpportunityBridge = {
  actionable: boolean;
  title: string;
  nextAction: string;
  influenceScore: 0;
  feasibilityScore: 0;
};

const clean = (value: string | null | undefined, limit: number) => String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);

function sourceLabel(pageTitle: string | null, canonicalUrl: string) {
  const title = clean(pageTitle, 180);
  if (title) return title;
  try {
    return new URL(canonicalUrl).hostname.replace(/^www\./, "");
  } catch {
    return clean(canonicalUrl, 180) || "reviewed cited source";
  }
}

/**
 * Converts a human-reviewed Source Map state into the persisted opportunity
 * boundary consumed by Resolution Center. It deliberately does not invent a
 * /100 priority score: the legacy numeric fields remain zero until a separate,
 * inspectable scoring method is explicitly introduced.
 */
export function reviewedOpportunityBridge(input: {
  pageTitle: string | null;
  canonicalUrl: string;
  route: EntryRoute;
  clientPresent: boolean;
}): ReviewedOpportunityBridge {
  const label = sourceLabel(input.pageTitle, input.canonicalUrl);
  if (input.clientPresent) {
    return {
      actionable: false,
      title: `Reviewed source gap: ${label}`,
      nextAction: "Archived because a workspace reviewer verified that the client brand is present on this cited source.",
      influenceScore: 0,
      feasibilityScore: 0,
    };
  }

  return {
    actionable: true,
    title: `Reviewed source gap: ${label}`,
    nextAction: `Inspect the linked reviewed evidence, then use the recorded ${input.route} route only when the customer has the required permission and the route remains legitimate.`,
    influenceScore: 0,
    feasibilityScore: 0,
  };
}
