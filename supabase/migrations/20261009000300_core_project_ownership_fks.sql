-- FM-05 / phase 3: enforce organization ownership at the project's root
-- edges without changing existing FK names or ON DELETE CASCADE semantics.
-- Owner-gated: requires #332 lineage reconciliation + backup/restore proof.
--
-- Every replacement is an atomic DROP+ADD with the SAME relation name to
-- avoid ambiguity in PostgREST embedded relationships. If validation fails,
-- the entire transaction rolls back and restores the existing single-ID FKs.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- A parent key already exists in production and local migration replay:
-- public.projects(organization_id,id) UNIQUE.

-- Preflight every existing child relationship before acquiring FK locks.
do $$
declare
  table_name text;
  discrepancies bigint;
begin
  foreach table_name in array array['prompts','prompt_clusters','runs','jobs'] loop
    execute format(
      'select count(*) from public.%I a left join public.projects p on p.id = a.project_id where a.project_id is not null and (p.id is null or p.organization_id is distinct from a.organization_id)',
      table_name
    ) into discrepancies;
    if discrepancies <> 0 then
      raise exception 'FM-05: % has % project ownership mismatches; do not install composite FK',
        table_name, discrepancies;
    end if;
  end loop;
end
$$;

alter table public.prompts
  drop constraint prompts_project_id_fkey,
  add constraint prompts_project_id_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade not valid;
alter table public.prompts validate constraint prompts_project_id_fkey;

alter table public.prompt_clusters
  drop constraint prompt_clusters_project_id_fkey,
  add constraint prompt_clusters_project_id_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade not valid;
alter table public.prompt_clusters validate constraint prompt_clusters_project_id_fkey;

alter table public.runs
  drop constraint runs_project_id_fkey,
  add constraint runs_project_id_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade not valid;
alter table public.runs validate constraint runs_project_id_fkey;

alter table public.jobs
  drop constraint jobs_project_id_fkey,
  add constraint jobs_project_id_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade not valid;
alter table public.jobs validate constraint jobs_project_id_fkey;

commit;
