-- FM360 Chat03 shared-schema integration proposal: additive, no historical inference.
-- Existing schedule rows remain legacy_unknown (regardless of enabled state).
begin;
alter table public.measurement_schedules
  add column if not exists schedule_origin text not null default 'legacy_unknown',
  add column if not exists baseline_run_id uuid references public.runs(id) on delete set null,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists baseline_contract_json jsonb;

alter table public.measurement_schedules
  add constraint measurement_schedules_origin_fm360_check
  check (
    schedule_origin in ('legacy_unknown','trial','paid','manual')
    and (
      schedule_origin = 'legacy_unknown'
      or (
        model_snapshot is not null and length(trim(model_snapshot)) > 0
        and baseline_contract_json is not null
        and jsonb_typeof(baseline_contract_json) = 'object'
        and (
          schedule_origin = 'manual'
          or (baseline_run_id is not null and
              (schedule_origin <> 'trial' or trial_ends_at is not null))
        )
      )
    )
  );

-- Race-safe per-project automatic creation. No effect on existing legacy rows.
create unique index if not exists measurement_schedules_one_auto_per_project_fm360
  on public.measurement_schedules(organization_id,project_id)
  where schedule_origin in ('trial','paid');

-- Prevent a user-side direct PostgREST insertion of a falsely pinned automatic
-- schedule; the verified route uses server role AFTER checking the user's role.
drop policy if exists "measurement_schedules_insert_operator" on public.measurement_schedules;
create policy "measurement_schedules_insert_operator" on public.measurement_schedules
  for insert with check (
    schedule_origin = 'legacy_unknown'
    and exists (
      select 1 from public.organization_members member
      where member.organization_id = measurement_schedules.organization_id
        and member.user_id = (select auth.uid())
        and member.role::text in ('owner','admin','analyst')
    )
  );

-- Retain the historical API's enabled toggle; authenticated users cannot
-- silently rewrite server-verified origin/baseline/expiry/model evidence.
create or replace function public.protect_measurement_schedule_contract_fm360()
returns trigger language plpgsql set search_path = 'public','pg_temp' as $$
begin
  if current_user = 'authenticated' and
    (new.organization_id,new.project_id,new.category_id,new.schedule_origin,
     new.baseline_run_id,new.trial_ends_at,new.baseline_contract_json,
     new.model_snapshot,new.methodology_snapshot,new.question_ids,
     new.provider_ids,new.locale,new.market,new.cadence,new.timezone,
     new.next_run_at,new.last_run_at,new.last_run_id,new.created_by)
    is distinct from
    (old.organization_id,old.project_id,old.category_id,old.schedule_origin,
     old.baseline_run_id,old.trial_ends_at,old.baseline_contract_json,
     old.model_snapshot,old.methodology_snapshot,old.question_ids,
     old.provider_ids,old.locale,old.market,old.cadence,old.timezone,
     old.next_run_at,old.last_run_at,old.last_run_id,old.created_by)
  then
    raise exception 'Schedule contract is server-managed; only enabling or pausing is allowed.'
      using errcode='42501';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_measurement_schedule_contract_fm360 on public.measurement_schedules;
create trigger protect_measurement_schedule_contract_fm360
  before update on public.measurement_schedules
  for each row execute function public.protect_measurement_schedule_contract_fm360();
-- The durable run retains exact schedule provenance so the collection worker
-- can recheck entitlement again at actual provider-call time.
alter table public.runs
  add column if not exists originating_schedule_id uuid references public.measurement_schedules(id) on delete set null;
commit;
