-- FM-05 / #484 phase 1: actor-bound human Source Map review.
-- Additive RPC only; do not revoke the legacy member table write grant yet.
-- Production use remains gated on issue #332, backup/restore and FM-00 approval.
begin;

create or replace function public.review_source_map_entry(
  p_entry_id uuid,
  p_organization_id uuid,
  p_project_id uuid,
  p_category_id uuid,
  p_client_present boolean,
  p_competitors text[],
  p_route text,
  p_feasibility text,
  p_influence text,
  p_note text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_entry record;
  v_now timestamptz;
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;
  if not public.has_org_role(
    p_organization_id,
    array['owner','admin','analyst']::public.organization_role[]
  ) then
    raise exception 'Source review requires owner, admin, or analyst membership';
  end if;
  if p_entry_id is null or p_project_id is null or p_category_id is null then
    raise exception 'Source Map review requires a scoped entry, project and category';
  end if;

  if p_client_present is null
     or p_route is null or p_route not in (
       'editorial outreach','comparison inclusion','expert contribution',
       'original research','legitimate review','community participation'
     )
     or p_feasibility is null or p_feasibility not in ('high','medium','low','unknown')
     or p_influence is null or p_influence not in ('high','medium','low','unknown')
     or coalesce(cardinality(p_competitors),0) > 20
     or exists (
       select 1 from unnest(coalesce(p_competitors,array[]::text[])) competitor
       where competitor is null or length(btrim(competitor)) not between 1 and 120
     )
     or length(coalesce(p_note,'')) > 2000
  then
    raise exception 'Invalid Source Map review fields';
  end if;

  -- The caller cannot elevate access by inventing organization/project ids.
  -- All five record edges must resolve to the exact active published map.
  -- Row lock serializes concurrent reviews of the same evidence entry.
  select
    e.id, e.source_id, e.client_present,
    e.rank, e.citation_observations, e.engines, e.page_presence_state,
    e.reference_origin, e.source_map_id
  into v_entry
  from public.source_map_entries e
  join public.source_maps m
    on m.id=e.source_map_id and m.organization_id=e.organization_id
  join public.runs r
    on r.id=m.run_id and r.organization_id=m.organization_id
  join public.sources s
    on s.id=e.source_id and s.organization_id=e.organization_id
  where e.id=p_entry_id
    and e.organization_id=p_organization_id
    and m.organization_id=p_organization_id
    and m.category_id=p_category_id
    and m.status='published'
    and m.review_state='reviewed'
    and r.project_id=p_project_id
    and r.category_id=p_category_id
  for update of e;

  if not found then
    raise exception 'Source Map entry does not belong to an authorized published project';
  end if;

  v_now := now();
  update public.source_map_entries e
  set client_present=p_client_present,
      competitors_present=coalesce(p_competitors,array[]::text[]),
      entry_route=p_route,
      feasibility=p_feasibility::public.feasibility_level,
      influence=p_influence::public.feasibility_level,
      analyst_note=nullif(btrim(p_note),''),
      reviewed_at=v_now,
      reviewed_by=v_actor
  where e.id=v_entry.id and e.organization_id=p_organization_id;

  -- No collector-owned columns are writable through this function.
  -- Derive reviewer and review time exclusively in the database.
  return jsonb_build_object(
    'id',v_entry.id,
    'source_id',v_entry.source_id,
    'reviewed_by',v_actor,
    'reviewed_at',v_now,
    'client_present',p_client_present
  );
end;
$$;

revoke all on function public.review_source_map_entry(
  uuid,uuid,uuid,uuid,boolean,text[],text,text,text,text
) from public, anon, authenticated;
grant execute on function public.review_source_map_entry(
  uuid,uuid,uuid,uuid,boolean,text[],text,text,text,text
) to authenticated, service_role;

commit;
