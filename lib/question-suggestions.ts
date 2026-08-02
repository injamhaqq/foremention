import type { SourceMapEntry } from "@/lib/types";

export type SourceQuestionSuggestion = { cluster: string; text: string; why: string };

export function buildSourceMapQuestionSuggestions(category: string, entries: SourceMapEntry[]): SourceQuestionSuggestion[] {
  if (!entries.length) return [];
  const top = [...entries].sort((left, right) => right.evidenceCount - left.evidenceCount || left.rank - right.rank);
  const domains = Array.from(new Set(top.map((entry) => entry.domain).filter(Boolean)));
  const types = Array.from(new Set(top.map((entry) => entry.type).filter(Boolean)));
  const competitors = Array.from(new Set(top.flatMap((entry) => entry.competitors).filter(Boolean)));
  const providers = Array.from(new Set(top.flatMap((entry) => entry.engines).filter(Boolean)));
  const domain = domains[0] || "independent category sources";
  const sourceType = types[0] || "independent sources";
  const competitor = competitors[0] || "established alternatives";
  const provider = providers[0] || "AI answer providers";
  return [
    { cluster: "Source framing", text: `Which ${category} products does ${domain} recommend, and what evidence does it cite?`, why: `The current Source Map repeatedly observed ${domain}.` },
    { cluster: "Comparison", text: `How does ${competitor} compare with other ${category} options for a growing team?`, why: `${competitor} was recorded in reviewed Source Map evidence.` },
    { cluster: "Evidence", text: `What proof do ${sourceType} sources use when evaluating ${category}?`, why: `The mapped evidence includes the ${sourceType} publisher type.` },
    { cluster: "Provider", text: `Which ${category} brands does ${provider} recommend across evidence-led comparisons?`, why: `${provider} appears in the current collection evidence.` },
    { cluster: "Coverage", text: `Which credible sources compare ${category} vendors but do not mention every relevant option?`, why: "Tests the reviewed competitor-present and brand-absent pattern without assuming causation." },
  ];
}
