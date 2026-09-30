/**
 * Legacy CEO scorecard field qualified_accounts counts an INTERNAL status flag.
 * The existing view does NOT join a verified contact route, first-party buyer
 * conversation, recorded ICP assessment or budget owner. Preserve the numeric
 * operating observation without promoting it to a qualified pipeline claim.
 * A real evidence-qualified account denominator remains UNKNOWN until the
 * independent service-only scorecard proposed in #371 is released.
 */
type ScorecardValue = string | number | boolean | null;
export type LegacyCeoScorecard = Record<string, ScorecardValue>;

function nonNegativeInteger(value: ScorecardValue | undefined): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

export function presentLegacyCeoScorecard(raw: LegacyCeoScorecard) {
  const { qualified_accounts: legacyQualified, ...unambiguous } = raw;
  const legacyFlaggedCount = nonNegativeInteger(legacyQualified);
  const recordedConversationEvents = nonNegativeInteger(raw.conversations);

  // Do not leak the misleading unqualified legacy key into a downstream
  // daily operating payload that may later be quoted to a board or investor.
  return {
    company: {
      ...unambiguous,
      internally_qualification_flagged_accounts: legacyFlaggedCount,
    },
    commercialQualificationEvidence: {
      internally_qualification_flagged_accounts: legacyFlaggedCount,
      recorded_conversation_events: recordedConversationEvents,
      public_research_candidates: null,
      research_triage_qualified_candidates: null,
      verified_contact_route_candidates: null,
      conversation_evidence_qualified_accounts: null,
      verified_sales_qualified_accounts: null,
      evidence_status: "independent_account_level_qualification_not_established" as const,
      interpretation: "The legacy internal qualification flag is research/operations triage, NOT verified buyer intent, verified contactability, a qualified sales opportunity, customer activation or revenue. Recorded conversation events are event counts, not independently qualified unique accounts. Independent account-level denominators require a separately verified first-party evidence view.",
    },
  };
}
