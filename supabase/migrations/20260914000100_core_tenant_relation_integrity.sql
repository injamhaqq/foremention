begin;

-- P0 tenant-boundary hardening for the core measurement/evidence graph.
-- RLS protects browser access, but service-role/background writers bypass RLS.
-- These composite foreign keys make organization ownership a database invariant
-- even for privileged writers that know another tenant's UUID.

create unique index if not exists categories_organization_id_id_uidx
  on public.categories (organization_id, id);
create unique index if not exists prompts_organization_id_id_uidx
  on public.prompts (organization_id, id);
create unique index if not exists runs_organization_id_id_uidx
  on public.runs (organization_id, id);
create unique index if not exists run_answers_organization_id_id_uidx
  on public.run_answers (organization_id, id);
create unique index if not exists sources_organization_id_id_uidx
  on public.sources (organization_id, id);
create unique index if not exists source_maps_organization_id_id_uidx
  on public.source_maps (organization_id, id);
create unique index if not exists placements_organization_id_id_uidx
  on public.placements (organization_id, id);

alter table public.prompts
  add constraint prompts_organization_category_fk
  foreign key (organization_id, category_id)
  references public.categories (organization_id, id)
  on delete cascade
  not valid;
alter table public.prompts validate constraint prompts_organization_category_fk;

alter table public.runs
  add constraint runs_organization_category_fk
  foreign key (organization_id, category_id)
  references public.categories (organization_id, id)
  on delete cascade
  not valid;
alter table public.runs validate constraint runs_organization_category_fk;

alter table public.run_answers
  add constraint run_answers_organization_run_fk
  foreign key (organization_id, run_id)
  references public.runs (organization_id, id)
  on delete cascade
  not valid;
alter table public.run_answers validate constraint run_answers_organization_run_fk;

-- Preserve the existing prompt deletion behavior while keeping organization_id.
alter table public.run_answers
  add constraint run_answers_organization_prompt_fk
  foreign key (organization_id, prompt_id)
  references public.prompts (organization_id, id)
  on delete set null (prompt_id)
  not valid;
alter table public.run_answers validate constraint run_answers_organization_prompt_fk;

alter table public.citations
  add constraint citations_organization_answer_fk
  foreign key (organization_id, run_answer_id)
  references public.run_answers (organization_id, id)
  on delete cascade
  not valid;
alter table public.citations validate constraint citations_organization_answer_fk;

alter table public.citations
  add constraint citations_organization_source_fk
  foreign key (organization_id, source_id)
  references public.sources (organization_id, id)
  on delete cascade
  not valid;
alter table public.citations validate constraint citations_organization_source_fk;

alter table public.source_maps
  add constraint source_maps_organization_category_fk
  foreign key (organization_id, category_id)
  references public.categories (organization_id, id)
  on delete cascade
  not valid;
alter table public.source_maps validate constraint source_maps_organization_category_fk;

alter table public.source_map_entries
  add constraint source_map_entries_organization_map_fk
  foreign key (organization_id, source_map_id)
  references public.source_maps (organization_id, id)
  on delete cascade
  not valid;
alter table public.source_map_entries validate constraint source_map_entries_organization_map_fk;

alter table public.source_map_entries
  add constraint source_map_entries_organization_source_fk
  foreign key (organization_id, source_id)
  references public.sources (organization_id, id)
  on delete cascade
  not valid;
alter table public.source_map_entries validate constraint source_map_entries_organization_source_fk;

-- Nullable links keep their tenant owner when the referenced object is deleted.
alter table public.placements
  add constraint placements_organization_source_fk
  foreign key (organization_id, source_id)
  references public.sources (organization_id, id)
  on delete set null (source_id)
  not valid;
alter table public.placements validate constraint placements_organization_source_fk;

alter table public.placement_events
  add constraint placement_events_organization_placement_fk
  foreign key (organization_id, placement_id)
  references public.placements (organization_id, id)
  on delete cascade
  not valid;
alter table public.placement_events validate constraint placement_events_organization_placement_fk;

alter table public.run_attempts
  add constraint run_attempts_organization_run_fk
  foreign key (organization_id, run_id)
  references public.runs (organization_id, id)
  on delete cascade
  not valid;
alter table public.run_attempts validate constraint run_attempts_organization_run_fk;

alter table public.run_attempts
  add constraint run_attempts_organization_prompt_fk
  foreign key (organization_id, prompt_id)
  references public.prompts (organization_id, id)
  on delete set null (prompt_id)
  not valid;
alter table public.run_attempts validate constraint run_attempts_organization_prompt_fk;

alter table public.answer_brand_mentions
  add constraint answer_brand_mentions_organization_answer_fk
  foreign key (organization_id, run_answer_id)
  references public.run_answers (organization_id, id)
  on delete cascade
  not valid;
alter table public.answer_brand_mentions validate constraint answer_brand_mentions_organization_answer_fk;

alter table public.source_brand_mentions
  add constraint source_brand_mentions_organization_source_fk
  foreign key (organization_id, source_id)
  references public.sources (organization_id, id)
  on delete cascade
  not valid;
alter table public.source_brand_mentions validate constraint source_brand_mentions_organization_source_fk;

alter table public.source_observations
  add constraint source_observations_organization_source_fk
  foreign key (organization_id, source_id)
  references public.sources (organization_id, id)
  on delete cascade
  not valid;
alter table public.source_observations validate constraint source_observations_organization_source_fk;

alter table public.source_observations
  add constraint source_observations_organization_answer_fk
  foreign key (organization_id, run_answer_id)
  references public.run_answers (organization_id, id)
  on delete set null (run_answer_id)
  not valid;
alter table public.source_observations validate constraint source_observations_organization_answer_fk;

alter table public.source_observations
  add constraint source_observations_organization_prompt_fk
  foreign key (organization_id, prompt_id)
  references public.prompts (organization_id, id)
  on delete set null (prompt_id)
  not valid;
alter table public.source_observations validate constraint source_observations_organization_prompt_fk;

commit;
