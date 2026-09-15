begin;

-- F01 introduced composite, tenant-safe foreign keys for the core evidence graph.
-- The older single-column foreign keys enforce only a subset of the same
-- relationship and leave PostgREST with two valid relationship paths between
-- the same table pairs. Remove those redundant paths so embedded reads resolve
-- deterministically through the organization-scoped composite constraints.
--
-- The canonical composite constraints are intentionally preserved.

alter table public.prompts
  drop constraint if exists prompts_category_id_fkey;

alter table public.runs
  drop constraint if exists runs_category_id_fkey;

alter table public.run_answers
  drop constraint if exists run_answers_run_id_fkey,
  drop constraint if exists run_answers_prompt_id_fkey;

alter table public.citations
  drop constraint if exists citations_run_answer_id_fkey,
  drop constraint if exists citations_source_id_fkey;

alter table public.source_maps
  drop constraint if exists source_maps_category_id_fkey;

alter table public.source_map_entries
  drop constraint if exists source_map_entries_source_map_id_fkey,
  drop constraint if exists source_map_entries_source_id_fkey;

alter table public.placements
  drop constraint if exists placements_source_id_fkey;

alter table public.placement_events
  drop constraint if exists placement_events_placement_id_fkey;

alter table public.run_attempts
  drop constraint if exists run_attempts_run_id_fkey,
  drop constraint if exists run_attempts_prompt_id_fkey;

alter table public.answer_brand_mentions
  drop constraint if exists answer_brand_mentions_run_answer_id_fkey;

alter table public.source_brand_mentions
  drop constraint if exists source_brand_mentions_source_id_fkey;

alter table public.source_observations
  drop constraint if exists source_observations_source_id_fkey,
  drop constraint if exists source_observations_run_answer_id_fkey,
  drop constraint if exists source_observations_prompt_id_fkey;

commit;
