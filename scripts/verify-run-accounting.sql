\set ON_ERROR_STOP on

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

insert into auth.users (id) values
  ('fa100000-0000-4000-8000-000000000001'::uuid);

insert into public.organizations (id, name, slug, created_by) values
  ('fa200000-0000-4000-8000-000000000001'::uuid, 'Run Accounting Fixture', 'run-accounting-fixture', 'fa100000-0000-4000-8000-000000000001'::uuid);

insert into public.organization_members (organization_id, user_id, role) values
  ('fa200000-0000-4000-8000-000000000001'::uuid, 'fa100000-0000-4000-8000-000000000001'::uuid, 'admin');

insert into public.categories (id, organization_id, name) values
  ('fa300000-0000-4000-8000-000000000001'::uuid, 'fa200000-0000-4000-8000-000000000001'::uuid, 'Accounting Category');

insert into public.organization_entitlements (
  organization_id,
  status,
  monthly_run_units,
  monthly_ai_spend_cap_usd,
  max_concurrent_runs
) values (
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'active',
  20,
  2.00,
  1
);

insert into public.runs (
  id, organization_id, category_id, status, requested_units,
  estimated_max_cost_usd, created_by
) values
  ('fa400000-0000-4000-8000-000000000001'::uuid, 'fa200000-0000-4000-8000-000000000001'::uuid, 'fa300000-0000-4000-8000-000000000001'::uuid, 'queued', 1, 0, 'fa100000-0000-4000-8000-000000000001'::uuid),
  ('fa400000-0000-4000-8000-000000000002'::uuid, 'fa200000-0000-4000-8000-000000000001'::uuid, 'fa300000-0000-4000-8000-000000000001'::uuid, 'queued', 1, 0, 'fa100000-0000-4000-8000-000000000001'::uuid),
  ('fa400000-0000-4000-8000-000000000003'::uuid, 'fa200000-0000-4000-8000-000000000001'::uuid, 'fa300000-0000-4000-8000-000000000001'::uuid, 'queued', 1, 0, 'fa100000-0000-4000-8000-000000000001'::uuid);

-- Admin is a valid run operator and retrying the same quota reservation is idempotent.
select public.reserve_run_quota_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  1,
  'fa400000-0000-4000-8000-000000000001'::uuid,
  'fa100000-0000-4000-8000-000000000001'::uuid
);
select public.reserve_run_quota_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  1,
  'fa400000-0000-4000-8000-000000000001'::uuid,
  'fa100000-0000-4000-8000-000000000001'::uuid
);

do $$
begin
  if (
    select coalesce(sum(units), 0)
    from public.usage_events
    where organization_id = 'fa200000-0000-4000-8000-000000000001'::uuid
      and run_id = 'fa400000-0000-4000-8000-000000000001'::uuid
  ) <> 1 then
    raise exception 'Retrying one run quota reservation double-counted usage';
  end if;
end
$$;

select public.reserve_run_budget_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa400000-0000-4000-8000-000000000001'::uuid,
  0.10,
  'fa100000-0000-4000-8000-000000000001'::uuid
);

do $$
begin
  if not exists (
    select 1 from public.runs
    where id = 'fa400000-0000-4000-8000-000000000001'::uuid
      and estimated_max_cost_usd = 0.10
      and capacity_reserved_at is not null
  ) then
    raise exception 'First candidate did not receive a durable capacity reservation';
  end if;
end
$$;

-- A second candidate may reserve quota, but the serialized budget gate must not
-- allow it to become a second active reservation when max_concurrent_runs = 1.
select public.reserve_run_quota_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  1,
  'fa400000-0000-4000-8000-000000000002'::uuid,
  'fa100000-0000-4000-8000-000000000001'::uuid
);

do $$
declare
  denied boolean := false;
begin
  begin
    perform public.reserve_run_budget_server(
      'fa200000-0000-4000-8000-000000000001'::uuid,
      'fa400000-0000-4000-8000-000000000002'::uuid,
      0.10,
      'fa100000-0000-4000-8000-000000000001'::uuid
    );
  exception when others then
    denied := position('maximum number of active collection runs' in sqlerrm) > 0;
  end;
  if not denied then
    raise exception 'Second queued candidate was not rejected by the serialized concurrency gate';
  end if;
end
$$;

select public.release_queued_run_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa400000-0000-4000-8000-000000000002'::uuid,
  'Fixture cleanup',
  'fa100000-0000-4000-8000-000000000001'::uuid
);

-- Release the first reservation, then prove a truthful zero-dollar reservation
-- still occupies capacity through the explicit marker rather than price > 0.
select public.release_queued_run_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa400000-0000-4000-8000-000000000001'::uuid,
  'Fixture cleanup',
  'fa100000-0000-4000-8000-000000000001'::uuid
);

select public.reserve_run_quota_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  1,
  'fa400000-0000-4000-8000-000000000003'::uuid,
  'fa100000-0000-4000-8000-000000000001'::uuid
);
select public.reserve_run_budget_server(
  'fa200000-0000-4000-8000-000000000001'::uuid,
  'fa400000-0000-4000-8000-000000000003'::uuid,
  0,
  'fa100000-0000-4000-8000-000000000001'::uuid
);

do $$
begin
  if not exists (
    select 1 from public.runs
    where id = 'fa400000-0000-4000-8000-000000000003'::uuid
      and estimated_max_cost_usd = 0
      and capacity_reserved_at is not null
  ) then
    raise exception 'Zero-dollar run did not receive an explicit capacity reservation';
  end if;
  if exists (
    select 1 from public.usage_events
    where organization_id = 'fa200000-0000-4000-8000-000000000001'::uuid
      and run_id = 'fa400000-0000-4000-8000-000000000002'::uuid
  ) then
    raise exception 'Released queued run retained quota usage';
  end if;
end
$$;

rollback;
