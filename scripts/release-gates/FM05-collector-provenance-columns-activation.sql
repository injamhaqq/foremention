-- ACTIVATION CANDIDATE ONLY. This file must not be auto-applied by migration replay to production.
-- Materialize as a separately approved forward-only migration after the matching app rollout,
-- #332 reconciliation and restore proof (same gate as FM05-source-review-activation.sql).
--
-- A11 / FM-05 phase 4: collector provenance cannot be rewritten by member mutations.
--
-- Collector-owned facts on `sources` (canonical URL, domain, type, first/last
-- observation) and on `placements` (the bound source, its URL, baseline and
-- remeasurement runs, citation timeline) are written only by service-role
-- collectors or security-definer RPCs. Members keep exactly the columns the
-- app's human workflows write with the viewer token:
--   * POST /api/sources/[id]/inspect  -> sources inspection columns
--   * PATCH /api/placements           -> placements.stage
-- Member INSERT of placements stays allowed (POST /api/placements), but the
-- source URL/title and author are derived from the bound same-tenant source
-- inside the database, so a forged request cannot rewrite them.
-- RLS SELECT policies and every service_role privilege are untouched.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- sources: no member insert/delete; update limited to bounded inspection results.
revoke insert, update, delete on table public.sources from authenticated;
grant update (
  page_title,
  crawler_access,
  crawler_checked_at,
  content_signature,
  content_length,
  last_reachable_at,
  last_content_change_at
) on table public.sources to authenticated;

-- placements: member update limited to human workflow columns.
revoke update on table public.placements from authenticated;
grant update (
  stage,
  owner_id,
  pitch_date,
  accepted_date,
  published_url,
  published_at,
  notes,
  due_at,
  priority
) on table public.placements to authenticated;

create or replace function public.bind_member_placement_provenance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source record;
begin
  -- Service-role collectors, restores and security-definer RPCs keep their
  -- own explicit values; only direct member (PostgREST) inserts are bound.
  if current_user <> 'authenticated' then
    return new;
  end if;
  if new.source_id is null then
    raise exception 'A member-created action must be bound to a mapped source'
      using errcode = '42501';
  end if;
  select s.canonical_url, s.page_title
    into v_source
    from public.sources s
    where s.id = new.source_id
      and s.organization_id = new.organization_id;
  if not found then
    raise exception 'Action source does not belong to this workspace'
      using errcode = '42501';
  end if;
  new.source_url := v_source.canonical_url;
  new.page_title := v_source.page_title;
  new.created_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists placements_bind_member_provenance on public.placements;
create trigger placements_bind_member_provenance
  before insert on public.placements
  for each row execute function public.bind_member_placement_provenance();

commit;
