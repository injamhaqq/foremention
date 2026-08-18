import type { SourceMapEntry } from "@/lib/types";

export type SourceQuestionSuggestion = { cluster: string; text: string; why: string };

export function buildSourceMapQuestionSuggestions(category: string, entries: SourceMapEntry[]): SourceQuestionSuggestion[] {
  if (!entries.length) return [];
  const top = [...entries].sort((left, right) => right.evidenceCount - left.evidenceCount || left.rank - right.rank);
  const reviewed = top.filter((entry) => Boolean(entry.reviewedAt));
  const domains = Array.from(new Set(top.map((entry) => entry.domain).filter(Boolean)));
  const types = Array.from(new Set(top.map((entry) => entry.type).filter(Boolean)));
  const competitors = Array.from(new Set(reviewed.flatMap((entry) => entry.competitors).filter(Boolean)));
  const providers = Array.from(new Set(top.flatMap((entry) => entry.engines).filter(Boolean)));
  const reviewedGaps = reviewed.filter((entry) => !entry.clientPresent);
  const domain = domains[0] || "independent category sources";
  const sourceType = types[0] || "independent sources";
  const competitor = competitors[0] || "established alternatives";
  const provider = providers[0] || "AI answer providers";
  return [
    { cluster: "Source framing", text: `Which ${category} products does ${domain} recommend, and what evidence does it cite?`, why: `The current Source Map observed ${domain} in returned citation evidence.` },
    { cluster: "Comparison", text: `How does ${competitor} compare with other ${category} options for a growing team?`, why: competitors.length ? `${competitor} was recorded in explicitly human-reviewed Source Map evidence.` : "No competitor has passed human source review yet, so this uses a neutral comparison placeholder rather than inventing a reviewed competitor fact." },
    { cluster: "Evidence", text: `What proof do ${sourceType} sources use when evaluating ${category}?`, why: `The observed citation evidence includes the ${sourceType} publisher type.` },
    { cluster: "Provider", text: `Which ${category} brands does ${provider} recommend across evidence-led comparisons?`, why: `${provider} appears in the current collection evidence.` },
    { cluster: "Coverage", text: `Which credible sources compare ${category} vendors but do not mention every relevant option?`, why: reviewedGaps.length ? `${reviewedGaps.length} cited page${reviewedGaps.length === 1 ? " has" : "s have"} an explicit human review confirming a brand-absent pattern.` : "Tests a possible coverage gap without claiming that unreviewed pages exclude the brand." },
  ];
}
