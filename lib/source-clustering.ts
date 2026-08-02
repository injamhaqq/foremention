import type { SourceMapEntry } from "@/lib/types";

export type SourceCluster = { id: string; label: string; sourceCount: number; domains: string[]; observations: number; entries: SourceMapEntry[] };

function publisherCluster(source: SourceMapEntry) {
  const value = `${source.type} ${source.domain}`.toLocaleLowerCase();
  if (/\.(gov|edu)(\.|$)|government|university|education/.test(value)) return ["public-institution", "Public institutions"] as const;
  if (/research|journal|benchmark|report|news|publication|editorial/.test(value)) return ["research-editorial", "Research and editorial"] as const;
  if (/review|comparison|directory|marketplace/.test(value)) return ["review-comparison", "Reviews and comparisons"] as const;
  if (/community|forum|reddit|social/.test(value)) return ["community", "Communities"] as const;
  if (/vendor|product|company|software|saas/.test(value)) return ["vendor", "Vendor and product pages"] as const;
  return ["other-web", "Other web sources"] as const;
}

export function clusterSources(entries: SourceMapEntry[]): SourceCluster[] {
  const groups = new Map<string, { label: string; entries: SourceMapEntry[] }>();
  for (const entry of entries) {
    const [id, label] = publisherCluster(entry);
    const group = groups.get(id) || { label, entries: [] };
    group.entries.push(entry); groups.set(id, group);
  }
  return [...groups.entries()].map(([id, group]) => ({
    id, label: group.label, sourceCount: group.entries.length,
    domains: [...new Set(group.entries.map((entry) => entry.domain))].sort(),
    observations: group.entries.reduce((sum, entry) => sum + entry.evidenceCount, 0),
    entries: [...group.entries].sort((a, b) => b.evidenceCount - a.evidenceCount || a.domain.localeCompare(b.domain)),
  })).sort((a, b) => b.observations - a.observations || a.label.localeCompare(b.label));
}
