-- F03: once a provider attempt reaches a terminal billable state, persist its
-- cost ledger in the same database transaction as the attempt. Answer/evidence
-- persistence remains a later idempotent step, so a failed database write after
-- a delivered provider response cannot erase the recorded charge or trigger a
-- second provider call.
begin;

create or replace function public.ledger_run_attempt_cost() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('complete','failed','rate_limited')
    and new.completed_at is not null
    and new.estimated_cost_usd is not null
  then
    insert into public.ai_cost_events (
      organization_id,
      run_id,
      run_attempt_id,
      provider,
      model,
      input_tokens,
      output_tokens,
      total_tokens,
      estimated_cost_usd,
      cost_source,
      observed_at
    ) values (
      new.organization_id,
      new.run_id,
      new.id,
      new.provider,
      new.model,
      new.usage_input_tokens,
      new.usage_output_tokens,
      new.usage_total_tokens,
      new.estimated_cost_usd,
      coalesce(new.cost_source, 'estimated'),
      new.completed_at
    )
    on conflict (run_attempt_id) do update set
      organization_id = excluded.organization_id,
      run_id = excluded.run_id,
      provider = excluded.provider,
      model = excluded.model,
      input_tokens = excluded.input_tokens,
      output_tokens = excluded.output_tokens,
      total_tokens = excluded.total_tokens,
      estimated_cost_usd = excluded.estimated_cost_usd,
      cost_source = excluded.cost_source,
      observed_at = excluded.observed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists ledger_run_attempt_cost_after_write on public.run_attempts;
create trigger ledger_run_attempt_cost_after_write
  after insert or update of status, estimated_cost_usd, cost_source, completed_at on public.run_attempts
  for each row execute function public.ledger_run_attempt_cost();

revoke all on function public.ledger_run_attempt_cost() from public, anon, authenticated;

commit;
