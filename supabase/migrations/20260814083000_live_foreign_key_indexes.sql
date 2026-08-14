begin;

-- Index only live foreign-key paths that currently contain data and lack a
-- usable non-partial leading index. These indexes protect tenant/project/run
-- cleanup (CASCADE / SET NULL) from avoidable child-table scans without
-- pre-indexing empty future-facing tables.

create index if not exists citations_organization_id_fk_idx
  on public.citations (organization_id);

create index if not exists source_observations_organization_id_fk_idx
  on public.source_observations (organization_id);
create index if not exists source_observations_reviewer_id_fk_idx
  on public.source_observations (reviewer_id);
create index if not exists source_observations_run_answer_id_fk_idx
  on public.source_observations (run_answer_id);

create index if not exists jobs_organization_id_fk_idx
  on public.jobs (organization_id);
create index if not exists jobs_project_id_fk_idx
  on public.jobs (project_id);

create index if not exists source_map_entries_organization_id_fk_idx
  on public.source_map_entries (organization_id);
create index if not exists source_map_entries_source_id_fk_idx
  on public.source_map_entries (source_id);

create index if not exists run_attempts_organization_id_fk_idx
  on public.run_attempts (organization_id);
create index if not exists run_attempts_prompt_id_fk_idx
  on public.run_attempts (prompt_id);

create index if not exists ai_cost_events_run_id_fk_idx
  on public.ai_cost_events (run_id);

create index if not exists run_prompt_selections_organization_id_fk_idx
  on public.run_prompt_selections (organization_id);
create index if not exists run_prompt_selections_prompt_id_fk_idx
  on public.run_prompt_selections (prompt_id);

create index if not exists prompts_cluster_id_fk_idx
  on public.prompts (cluster_id);
create index if not exists prompts_project_id_fk_idx
  on public.prompts (project_id);

create index if not exists prompt_versions_organization_id_fk_idx
  on public.prompt_versions (organization_id);

create index if not exists runs_category_id_fk_idx
  on public.runs (category_id);
create index if not exists runs_project_id_fk_idx
  on public.runs (project_id);

create index if not exists competitors_organization_id_fk_idx
  on public.competitors (organization_id);

create index if not exists run_answers_organization_id_fk_idx
  on public.run_answers (organization_id);

create index if not exists usage_events_run_id_fk_idx
  on public.usage_events (run_id);

create index if not exists audit_logs_actor_id_fk_idx
  on public.audit_logs (actor_id);

create index if not exists source_maps_category_id_fk_idx
  on public.source_maps (category_id);
create index if not exists source_maps_organization_id_fk_idx
  on public.source_maps (organization_id);

create index if not exists organization_members_invited_by_fk_idx
  on public.organization_members (invited_by);

create index if not exists projects_created_by_fk_idx
  on public.projects (created_by);

create index if not exists prompt_clusters_organization_id_fk_idx
  on public.prompt_clusters (organization_id);

create index if not exists source_snapshots_created_by_fk_idx
  on public.source_snapshots (created_by);
create index if not exists source_snapshots_previous_snapshot_id_fk_idx
  on public.source_snapshots (previous_snapshot_id);
create index if not exists source_snapshots_run_id_fk_idx
  on public.source_snapshots (run_id);
create index if not exists source_snapshots_source_id_fk_idx
  on public.source_snapshots (source_id);

commit;
