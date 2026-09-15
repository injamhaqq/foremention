import { supabaseRest } from "@/lib/supabase-rest";
import { rowsToCsv } from "@/lib/export-format";
import { createZipArchive } from "@/lib/zip-archive";

type ExportRow = Record<string, unknown>;

// Explicit allowlist: customer-owned workspace records that are safe to include
// in an owner-authorized export. Secret-bearing auth/integration/webhook material
// is deliberately not discovered dynamically and therefore cannot drift into the
// archive just because a new database table is added.
const datasets = [
  "organization_members", "organization_entitlements", "organization_domains", "notification_preferences",
  "data_governance_settings", "data_governance_requests",
  "projects", "categories", "domains", "competitors", "prompt_clusters", "prompts", "prompt_versions",
  "runs", "run_prompt_selections", "run_attempts", "run_answers", "citations", "sources", "source_observations",
  "answer_brand_mentions", "source_brand_mentions", "citation_observations", "source_snapshots", "source_routes", "source_contacts",
  "source_maps", "source_map_entries", "opportunities", "opportunity_scores", "placements", "placement_events",
  "placement_activities", "outreach_actions", "evidence_items", "verified_claims", "verified_claim_evidence",
  "approvals", "record_shares", "measurement_schedules",
  "company_truth_entities", "company_truth_assertions",
  "change_specifications", "change_specification_evidence", "change_execution_assets",
  "resolution_assets", "resolution_asset_evidence", "resolution_follow_ups", "change_verification_assessments",
  "design_partner_execution_cycles", "cross_business_evidence", "change_specification_cross_business_evidence",
  "change_verification_cross_business_evidence", "next_best_change_batches", "next_best_change_evaluations",
  "outcome_ledger_events", "eligibility_requirements", "eligibility_evaluations", "indexing_checks",
  "customer_success_profiles", "customer_success_reviews", "crm_attribution_events",
  "workspace_comments", "notifications", "usage_events", "ai_cost_events", "audit_logs",
] as const;

type WorkspaceExportDataset = (typeof datasets)[number];

// Most tenant-owned export tables use a UUID `id`. Relationship/snapshot and
// singleton settings tables intentionally use composite keys instead, so
// pagination must follow the actual persisted key rather than assume `id`.
const datasetOrder: Partial<Record<WorkspaceExportDataset, string>> = {
  organization_members: "organization_id.asc,user_id.asc",
  organization_entitlements: "organization_id.asc",
  notification_preferences: "organization_id.asc,user_id.asc",
  data_governance_settings: "organization_id.asc",
  run_prompt_selections: "run_id.asc,prompt_key.asc",
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

async function loadSourceSnapshotObservationLinks(snapshotRows: ExportRow[], token: string) {
  const snapshotIds = snapshotRows
    .map((row) => typeof row.id === "string" ? row.id : null)
    .filter((value): value is string => Boolean(value));
  if (!snapshotIds.length) return [] as ExportRow[];

  const rows: ExportRow[] = [];
  const chunkSize = 100;
  const pageSize = 500;
  for (let start = 0; start < snapshotIds.length; start += chunkSize) {
    const ids = snapshotIds.slice(start, start + chunkSize).join(",");
    for (let offset = 0; ; offset += pageSize) {
      const page = await supabaseRest<ExportRow[]>(
        `source_snapshot_observations?select=*&source_snapshot_id=in.(${ids})&order=source_snapshot_id.asc,source_observation_id.asc&limit=${pageSize}&offset=${offset}`,
        { token },
      );
      rows.push(...page);
      if (page.length < pageSize) break;
    }
  }
  return rows.sort((left, right) => {
    const leftKey = `${String(left.source_snapshot_id || "")}\u0000${String(left.source_observation_id || "")}`;
    const rightKey = `${String(right.source_snapshot_id || "")}\u0000${String(right.source_observation_id || "")}`;
    return leftKey.localeCompare(rightKey);
  });
}

export async function buildWorkspaceExport(input: { organizationId: string; organizationName: string; token: string }) {
  const organizationRows = await supabaseRest<ExportRow[]>(`organizations?select=*&id=eq.${input.organizationId}&limit=1`, { token: input.token });
  const loaded = await Promise.all(datasets.map(async (dataset) => [dataset, await loadAll(dataset, input.organizationId, input.token)] as const));
  const records = Object.fromEntries([["organization", organizationRows], ...loaded]) as Record<string, ExportRow[]>;
  records.source_snapshot_observations = await loadSourceSnapshotObservationLinks(records.source_snapshots || [], input.token);

  const generatedAt = new Date().toISOString();
  const manifest = {
    format: "Foremention workspace export v2",
    generatedAt,
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    datasets: Object.fromEntries(Object.entries(records).map(([name, rows]) => [name, rows.length])),
    exclusions: [
      "passwords", "authentication tokens", "provider credentials", "integration credentials",
      "webhook secrets", "invitation token hashes", "service-account key material",
    ],
    note: "This archive contains persisted customer-owned workspace records, membership/entitlement state needed for controlled recovery, evidence provenance, decision history, and human follow-up links. Provider observations remain distinct from human-reviewed conclusions.",
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
