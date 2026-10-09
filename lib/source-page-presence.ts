import type { SourceInspectionResult } from "./source-inspection";

type SourcePageObservation = Pick<
  SourceInspectionResult,
  "access" | "pageTitle" | "pageDescription" | "pageText" | "pageTextCoverage"
>;

export type ObservedPagePresenceState = "unknown" | "present" | "absent";

/**
 * A positive mention is supportable in the text actually retrieved.
 * A negative observation is supportable only when the bounded representation
 * is complete: the inspected page is open and none of the visible text was
 * truncated or excluded from the stored extraction representation.
 *
 * This is NOT a claim about script-rendered content, the site's current state,
 * or what any model used to make its recommendation.
 */
export function assessObservedPagePresence(
  inspection: SourcePageObservation,
  brand: string,
  competitors: readonly string[] = [],
) {
  const usable = inspection.access === "open" || inspection.access === "partial";
  const text = usable
    ? [inspection.pageTitle, inspection.pageDescription, inspection.pageText]
      .filter(Boolean).join(" ").toLocaleLowerCase()
    : "";
  const normalizedBrand = brand.trim().toLocaleLowerCase();
  const clientPresent = Boolean(normalizedBrand) && text.includes(normalizedBrand);
  const competitorsPresent = competitors.filter((competitor) => {
    const term = competitor.trim().toLocaleLowerCase();
    return Boolean(term) && text.includes(term);
  });

  // The inspector attests coverage only for identical bounded static text,
  // without truncation or omitted boilerplate. Missing this attestation
  // means absence is unknown, even if text lengths happen to match.
  const fullTextCoverage = inspection.access === "open"
    && typeof inspection.pageText === "string"
    && inspection.pageTextCoverage === "complete";

  const pagePresenceState: ObservedPagePresenceState = clientPresent
    ? "present"
    : fullTextCoverage ? "absent" : "unknown";

  return { clientPresent, pagePresenceState, competitorsPresent, fullTextCoverage };
}
