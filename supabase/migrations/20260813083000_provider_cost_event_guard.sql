-- Keep conservative failed-attempt estimates for budget/circuit safety without
-- allowing tokenless failed retries to be summed into runs.actual_cost_usd.
-- Successful attempts (including estimated successful usage) and any future
-- provider-reported billed costs remain eligible for ai_cost_events.

create or replace function public.guard_provider_cost_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  linked_attempt_status text;
begin
  if new.run_attempt_id is null then
    return new;
  end if;

  select attempt.status::text
    into linked_attempt_status
  from public.run_attempts as attempt
  where attempt.id = new.run_attempt_id;

  if linked_attempt_status in ('failed', 'rate_limited')
    and new.cost_source = 'estimated'
    and new.input_tokens is null
    and new.output_tokens is null
    and new.total_tokens is null then
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_provider_cost_event on public.ai_cost_events;
create trigger guard_provider_cost_event
before insert or update on public.ai_cost_events
for each row
execute function public.guard_provider_cost_event();

revoke all on function public.guard_provider_cost_event() from public;
revoke all on function public.guard_provider_cost_event() from anon;
revoke all on function public.guard_provider_cost_event() from authenticated;

comment on function public.guard_provider_cost_event() is
  'Suppresses tokenless estimated cost events linked to failed/rate-limited provider attempts so run actual_cost_usd reflects recorded successful/provider-billed spend rather than retry ceilings.';
