import type { SourceMapEntry } from "@/lib/types";

export type SourceCredibility = {
  score: number;
  confidence: "low" | "medium" | "high";
  signals: string[];
  missing: string[];
};

export function estimateSourceCredibility(source: SourceMapEntry): SourceCredibility {
  const signals: string[] = [];
  const missing = ["independent domain-authority measurement", "page publication date", "verified update frequency"];
  let score = 10;
  const domain = source.domain.toLocaleLowerCase();
  const type = source.type.toLocaleLowerCase();
  if (/\.(gov|edu)(\.|$)/.test(domain)) { score += 20; signals.push("public-institution or education domain"); }
  else if (/research|journal|publication|news|review|benchmark/.test(type)) { score += 14; signals.push(`publisher type recorded as ${source.type}`); }
  else { score += 6; signals.push(`publisher type recorded as ${source.type}`); }
  const recurrence = Math.min(25, source.evidenceCount * 5);
  score += recurrence; signals.push(`${source.evidenceCount} provider-returned citation observation${source.evidenceCount === 1 ? "" : "s"}`);
  const coverage = Math.min(20, new Set(source.engines).size * 7);
  score += coverage; signals.push(`${new Set(source.engines).size} observed provider${new Set(source.engines).size === 1 ? "" : "s"}`);
  if (source.crawlerAccess === "open") { score += 15; signals.push("automated page retrieval was open"); }
  else if (source.crawlerAccess === "partial") { score += 8; signals.push("automated page retrieval was partial"); }
  else if (source.crawlerAccess === "blocked") signals.push("automated page retrieval was blocked");
  else signals.push("page reachability has not been checked");
  if (source.reviewedAt) { score += 10; signals.push(`explicit human review recorded ${source.reviewedAt}`); }
  else missing.push("explicit human page review");
  const confidence: SourceCredibility["confidence"] = source.reviewedAt && source.engines.length >= 2 && source.evidenceCount >= 3 ? "high" : source.reviewedAt || source.evidenceCount > 1 ? "medium" : "low";
  return { score: Math.min(100, score), confidence, signals, missing };
}
