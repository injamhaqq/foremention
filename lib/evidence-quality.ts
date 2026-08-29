export type EvidenceQualityInput = {
  observedAt?: string | null;
  retrievedAt?: string | null;
  retrievability?: "available" | "partial" | "blocked" | "unknown";
  authorityCategory?: "primary" | "independent" | "community" | "unknown";
  corroborationCount?: number;
  reviewState?: "unreviewed" | "verified" | "excluded";
};

export type EvidenceQualityDimensions = {
  freshness: { label: "Fresh" | "Aging" | "Stale" | "Unknown"; days: number | null };
  retrievability: { label: "Available" | "Partial" | "Blocked" | "Unknown" };
  authority: { label: "Primary" | "Independent" | "Community" | "Unknown" };
  corroboration: { label: "None" | "Single" | "Multiple"; count: number };
  review: { label: "Reviewed" | "Unreviewed" | "Excluded" };
};

export function evidenceQuality(input: EvidenceQualityInput, now = new Date()): EvidenceQualityDimensions {
  const observed = input.observedAt ? new Date(input.observedAt) : null;
  const days = observed && Number.isFinite(observed.getTime()) ? Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 86_400_000)) : null;
  const freshness = days === null ? "Unknown" : days <= 30 ? "Fresh" : days <= 90 ? "Aging" : "Stale";
  const retrievability = input.retrievability === "available" ? "Available" : input.retrievability === "partial" ? "Partial" : input.retrievability === "blocked" ? "Blocked" : "Unknown";
  const authority = input.authorityCategory === "primary" ? "Primary" : input.authorityCategory === "independent" ? "Independent" : input.authorityCategory === "community" ? "Community" : "Unknown";
  const count = Math.max(0, Math.floor(Number(input.corroborationCount || 0)));
  const corroboration = count === 0 ? "None" : count === 1 ? "Single" : "Multiple";
  const review = input.reviewState === "verified" ? "Reviewed" : input.reviewState === "excluded" ? "Excluded" : "Unreviewed";
  return {
    freshness: { label: freshness, days },
    retrievability: { label: retrievability },
    authority: { label: authority },
    corroboration: { label: corroboration, count },
    review: { label: review },
  };
}

export function evidenceQualityExplanation(dimensions: EvidenceQualityDimensions) {
  return [
    `Freshness: ${dimensions.freshness.label}${dimensions.freshness.days === null ? "" : ` (${dimensions.freshness.days}d)`}`,
    `Retrievability: ${dimensions.retrievability.label}`,
    `Authority: ${dimensions.authority.label}`,
    `Corroboration: ${dimensions.corroboration.label} (${dimensions.corroboration.count})`,
    `Review: ${dimensions.review.label}`,
  ];
}
