-- Close material Supabase security/performance advisor findings without
-- weakening RLS or changing customer-visible authorization semantics.
begin;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Keep the privileged implementations out of the PostgREST-exposed public
-- schema. Existing RLS policy dependencies follow the function OID when it is
-- moved, so their semantics are preserved without policy rewrites.
alter function public.complete_onboarding(jsonb) set schema private;
alter function public.has_org_role(uuid, public.organization_role[]) set schema private;
alter function public.is_org_member(uuid) set schema private;

revoke all on function private.complete_onboarding(jsonb) from public, anon;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public, anon;
revoke all on function private.is_org_member(uuid) from public, anon;
grant execute on function private.complete_onboarding(jsonb) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;

-- The public RPC remains callable by the authenticated app but executes as the
-- caller. Only the non-exposed private implementation owns elevated rights.
create or replace function public.complete_onboarding(payload jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.complete_onboarding(payload);
$$;

create or replace function public.has_org_role(
  check_org_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.has_org_role(check_org_id, allowed_roles);
$$;

create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_org_member(check_org_id);
$$;

revoke all on function public.complete_onboarding(jsonb) from public, anon;
revoke all on function public.has_org_role(uuid, public.organization_role[]) from public, anon;
revoke all on function public.is_org_member(uuid) from public, anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
grant execute on function public.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;

-- Target only foreign keys currently reported by the production advisor and
-- confirmed to exist in the live schema. Indexing the referencing side keeps
-- deletes/joins bounded without speculative index proliferation.
create index if not exists ai_cost_events_run_attempt_idx
  on public.ai_cost_events (run_attempt_id);
create index if not exists ai_cost_events_run_idx
  on public.ai_cost_events (run_id);
create index if not exists invitations_invited_by_idx
  on public.invitations (invited_by);
create index if not exists placement_events_actor_idx
  on public.placement_events (actor_id);
create index if not exists resolution_asset_evidence_evidence_item_idx
  on public.resolution_asset_evidence (evidence_item_id);
create index if not exists resolution_assets_approved_by_idx
  on public.resolution_assets (approved_by);
create index if not exists resolution_follow_ups_rerun_idx
  on public.resolution_follow_ups (rerun_id);
create index if not exists run_attempts_run_idx
  on public.run_attempts (run_id);
create index if not exists source_observations_source_idx
  on public.source_observations (source_id);
create index if not exists source_snapshot_observations_source_observation_idx
  on public.source_snapshot_observations (source_observation_id);

commit;