begin;

-- Runs belong to a project. The legacy uniqueness indexes were organization-wide,
-- which caused valid requests in sibling projects to collide. Keep historical
-- NULL-project rows in one legacy bucket while making current project rows
-- independently idempotent.
drop index if exists public.runs_organization_idempotency_idx;

create unique index runs_workspace_idempotency_idx
  on public.runs (
    organization_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    idempotency_key
  )
  where idempotency_key is not null;

drop index if exists public.runs_organization_active_request_idx;

create unique index runs_workspace_active_request_idx
  on public.runs (
    organization_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    active_request_key
  )
  where active_request_key is not null
    and status in ('queued', 'running');

commit;
