begin;

-- Interactive runs belong to a project, so the same client idempotency key may
-- legitimately be reused in sibling projects. Historical NULL-project rows stay
-- in one legacy bucket. The legacy weekly collector remains organization-wide,
-- so a second partial unique index preserves its existing one-per-org/week rule.
drop index if exists public.runs_organization_idempotency_idx;

create unique index runs_workspace_idempotency_idx
  on public.runs (
    organization_id,
    coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    idempotency_key
  )
  where idempotency_key is not null;

create unique index runs_organization_weekly_idempotency_idx
  on public.runs (organization_id, idempotency_key)
  where idempotency_key like 'weekly:%';

commit;
