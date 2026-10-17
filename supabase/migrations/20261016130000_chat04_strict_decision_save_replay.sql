-- FM360 / Chat04 - Forward-only strict idempotency correction.
-- Original 20261013140000 remains immutable. This migration corrects BOTH the
-- ordinary existing-row replay and a concurrent ON CONFLICT winner.
-- No data migration, delete, backfill, or new public write grants.
begin;

-- Strictly full-field replay identity, including the authenticated original actor,
-- the initial approval intent, owner/action/due date, canonical Change Specification,
-- and normalized body. Not granted to API roles; callable from the definer RPC.
create or replace function private.match_record_decision_save_request(
  p_stored public.record_decisions,
  p_baseline_run_id uuid,
  p_decision_kind text,
  p_decision_state text,
  p_rationale text,
  p_owner_id uuid,
  p_owner_role text,
  p_action_summary text,
  p_due_date date,
  p_change_specification_id uuid,
  p_approve boolean,
  p_actor uuid
) returns boolean
language sql stable
security invoker
set search_path = ''
as $sql$
  select (
    p_stored.id is not null
    and p_stored.baseline_run_id is not distinct from p_baseline_run_id
    and p_stored.decision_kind is not distinct from p_decision_kind
    and p_stored.decision_state is not distinct from p_decision_state
    and p_stored.rationale is not distinct from btrim(p_rationale)
    and p_stored.change_specification_id is not distinct from p_change_specification_id
    and p_stored.decided_by is not distinct from p_actor
    and p_stored.approved_by is not distinct from (
      case when coalesce(p_approve, false) and p_decision_kind = 'change_specification'
        then p_actor else null::uuid end
    )
    and (p_stored.approved_at is not null) = (
      coalesce(p_approve, false) and p_decision_kind = 'change_specification'
    )
    and p_stored.owner_id is not distinct from p_owner_id
    and p_stored.owner_role is not distinct from nullif(btrim(p_owner_role), '')
    and p_stored.action_summary is not distinct from nullif(btrim(p_action_summary), '')
    and p_stored.due_date is not distinct from p_due_date
  );
$sql$;
revoke all on function private.match_record_decision_save_request(
  public.record_decisions, uuid, text, text, text, uuid, text, text, date, uuid, boolean, uuid
) from public, anon, authenticated;

create or replace function public.save_record_decision(
  p_organization_id uuid,
  p_project_id uuid,
  p_baseline_run_id uuid,
  p_save_key text,
  p_decision_kind text,
  p_decision_state text,
  p_rationale text,
  p_owner_id uuid default null,
  p_owner_role text default null,
  p_action_summary text default null,
  p_due_date date default null,
  p_change_specification_id uuid default null,
  p_approve boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_existing public.record_decisions%rowtype;
  v_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = 'PT401';
  end if;
  if not private.has_org_role(p_organization_id, array['owner','admin','analyst']::public.organization_role[]) then
    raise exception 'Your workspace role cannot save decisions' using errcode = 'PT403';
  end if;
  if coalesce(p_approve, false)
    and not private.has_org_role(p_organization_id, array['owner','admin']::public.organization_role[]) then
    raise exception 'Only owners and admins can approve decisions' using errcode = 'PT403';
  end if;
  if not exists (
    select 1 from public.projects project
    where project.id = p_project_id and project.organization_id = p_organization_id and project.status = 'active'
  ) then
    raise exception 'Project not found in this workspace' using errcode = 'PT404';
  end if;
  if p_owner_id is not null and not exists (
    select 1 from public.organization_members member
    where member.organization_id = p_organization_id and member.user_id = p_owner_id
  ) then
    raise exception 'Decision owner must be a workspace member' using errcode = 'PT400';
  end if;

  select * into v_existing from public.record_decisions decision
  where decision.organization_id = p_organization_id
    and decision.project_id = p_project_id
    and decision.save_key = p_save_key;
  if found then
    if not private.match_record_decision_save_request(
      v_existing, p_baseline_run_id, p_decision_kind, p_decision_state, p_rationale,
      p_owner_id, p_owner_role, p_action_summary, p_due_date, p_change_specification_id,
      p_approve, v_actor
    ) then
      raise exception 'This save key belongs to a different decision' using errcode = 'PT409';
    end if;
    return jsonb_build_object('id', v_existing.id, 'outcome', 'existing');
  end if;

  insert into public.record_decisions (
    organization_id, project_id, baseline_run_id, save_key, decision_kind, decision_state, rationale,
    change_specification_id, decided_by, decided_at, approved_by, approved_at,
    owner_id, owner_role, action_summary, due_date
  ) values (
    p_organization_id, p_project_id, p_baseline_run_id, p_save_key, p_decision_kind, p_decision_state, btrim(p_rationale),
    p_change_specification_id, v_actor, now(),
    case when coalesce(p_approve, false) and p_decision_kind = 'change_specification' then v_actor end,
    case when coalesce(p_approve, false) and p_decision_kind = 'change_specification' then now() end,
    p_owner_id, nullif(btrim(p_owner_role), ''), nullif(btrim(p_action_summary), ''), p_due_date
  )
  on conflict (organization_id, project_id, save_key) do nothing
  returning id into v_id;

  if v_id is null then
    -- Concurrent replay with the same key won the insert; return it if it is the same decision.
    select * into v_existing from public.record_decisions decision
    where decision.organization_id = p_organization_id
      and decision.project_id = p_project_id
      and decision.save_key = p_save_key;
    if not private.match_record_decision_save_request(
      v_existing, p_baseline_run_id, p_decision_kind, p_decision_state, p_rationale,
      p_owner_id, p_owner_role, p_action_summary, p_due_date, p_change_specification_id,
      p_approve, v_actor
    ) then
      raise exception 'This save key belongs to a different decision' using errcode = 'PT409';
    end if;
    return jsonb_build_object('id', v_existing.id, 'outcome', 'existing');
  end if;
  return jsonb_build_object('id', v_id, 'outcome', 'created');
end;
$$;
revoke all on function public.save_record_decision(uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean) from public, anon, authenticated;
grant execute on function public.save_record_decision(uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean) to authenticated, service_role;

comment on function public.save_record_decision(
  uuid, uuid, uuid, text, text, text, text, uuid, text, text, date, uuid, boolean
) is 'Chat04 strict atomic idempotency: save keys replay only identical initial payload by the original actor.';

commit;
