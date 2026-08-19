begin;

-- Automated page retrieval and human evidence review are different facts.
-- crawler_checked_at remains the timestamp of a retrieval/inspection. These
-- columns are the authoritative marker that a workspace member explicitly
-- reviewed the Source Map entry and accepted the page-level judgments.
alter table public.source_map_entries
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

create index if not exists source_map_entries_reviewed_by_idx
  on public.source_map_entries(reviewed_by)
  where reviewed_by is not null;

-- Preserve any legitimate historical human reviews already recorded in the
-- append-only audit trail. Automated source.inspected events are deliberately
-- excluded from this backfill.
with latest_review as (
  select distinct on (organization_id, entity_id)
    organization_id,
    entity_id,
    actor_id,
    created_at
  from public.audit_logs
  where action = 'source.reviewed'
    and entity_type = 'source_map_entry'
    and entity_id is not null
  order by organization_id, entity_id, created_at desc, id desc
)
update public.source_map_entries as entry
set reviewed_at = review.created_at,
    reviewed_by = review.actor_id
from latest_review as review
where entry.organization_id = review.organization_id
  and entry.id = review.entity_id
  and entry.reviewed_at is null;

comment on column public.source_map_entries.reviewed_at is
  'Timestamp of explicit human Source Map review. Never populated by automated crawler inspection.';
comment on column public.source_map_entries.reviewed_by is
  'Workspace user who performed the explicit Source Map review.';

commit;
