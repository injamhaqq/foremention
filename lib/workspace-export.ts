import { supabaseRest } from "@/lib/supabase-rest";
import { rowsToCsv } from "@/lib/export-format";
import { createZipArchive } from "@/lib/zip-archive";

type ExportRow = Record<string, unknown>;

const datasets = [
  "projects", "categories", "domains", "competitors", "prompt_clusters", "prompts", "prompt_versions",
  "runs", "run_prompt_selections", "run_attempts", "run_answers", "citations", "sources", "source_observations",
  "source_maps", "source_map_entries", "opportunities", "opportunity_scores", "placements", "placement_events",
  "placement_activities", "outreach_actions", "evidence_items", "verified_claims", "verified_claim_evidence",
  "workspace_comments", "notifications", "usage_events", "ai_cost_events", "audit_logs",
] as const;

type WorkspaceExportDataset = (typeof datasets)[number];

// Most tenant-owned export tables use a UUID `id`. Two relationship/snapshot
// tables intentionally use composite keys instead, so ordering every table by
// `id` makes the complete workspace export fail at runtime. Keep pagination
// deterministic using the real persisted key for each exceptional dataset.
const datasetOrder: Partial<Record<WorkspaceExportDataset, string>> = {
  run_prompt_selections: "run_id.asc,prompt_id.asc",
  verified_claim_evidence: "claim_id.asc,evidence_item_id.asc",
};

async function loadAll(table: WorkspaceExportDataset, organizationId: string, token: string) {
  const all: ExportRow[] = [];
  const pageSize = 500;
  const order = datasetOrder[table] || "id.asc";
  for (let offset = 0; ; offset += pageSize) {
    const rows = await supabaseRest<ExportRow[]>(`${table}?select=*&organization_id=eq.${organizationId}&order=${order}&limit=${pageSize}&offset=${offset}`, { token });
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
}

export async function buildWorkspaceExport(input: { organizationId: string; organizationName: string; token: string }) {
  const organizationRows = await supabaseRest<ExportRow[]>(`organizations?select=*&id=eq.${input.organizationId}&limit=1`, { token: input.token });
  const loaded = await Promise.all(datasets.map(async (dataset) => [dataset, await loadAll(dataset, input.organizationId, input.token)] as const));
  const records = Object.fromEntries([["organization", organizationRows], ...loaded]) as Record<string, ExportRow[]>;
  const generatedAt = new Date().toISOString();
  const manifest = {
    format: "Foremention workspace export v1",
    generatedAt,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    datasets: Object.fromEntries(Object.entries(records).map(([name, rows]) => [name, rows.length])),
    exclusions: ["passwords", "authentication tokens", "provider credentials", "integration credentials", "webhook secrets", "invitation token hashes"],
    note: "This archive contains persisted records for one authorized organization. Provider observations remain distinct from human-reviewed conclusions.",
  };
  const files = [
    { name: "manifest.json", content: JSON.stringify(manifest, null, 2) },
    { name: "workspace.json", content: JSON.stringify({ manifest, records }, null, 2) },
    ...Object.entries(records).flatMap(([name, rows]) => [
      { name: `json/${name}.json`, content: JSON.stringify(rows, null, 2) },
      { name: `csv/${name}.csv`, content: rowsToCsv(rows) },
    ]),
  ];
  return { archive: createZipArchive(files), generatedAt, counts: manifest.datasets };
}
