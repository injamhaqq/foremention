-- Prevent the same organization from starting the same provider/question set
-- twice while an earlier collection is queued or running. Historical and
-- terminal runs remain reusable for future comparison runs.
alter table public.runs
  add column if not exists active_request_key text;

create unique index if not exists runs_organization_active_request_idx
  on public.runs (organization_id, active_request_key)
  where active_request_key is not null
    and status in ('queued', 'running');
