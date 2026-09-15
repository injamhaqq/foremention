-- F06: a comparable follow-up must preserve the persisted buyer-question context,
-- including locale and market. The existing comparator already verifies methodology,
-- prompt text, provider and exact model; this trigger closes the remaining fixture gap.
begin;

create or replace function public.validate_resolution_follow_up_context() returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.rerun_id is null then
    return new;
  end if;

  if exists (
    (select prompt_key, prompt_text, locale, market
       from public.run_prompt_selections
       where run_id = new.baseline_run_id
     except
     select prompt_key, prompt_text, locale, market
       from public.run_prompt_selections
       where run_id = new.rerun_id)
    union all
    (select prompt_key, prompt_text, locale, market
       from public.run_prompt_selections
       where run_id = new.rerun_id
     except
     select prompt_key, prompt_text, locale, market
       from public.run_prompt_selections
       where run_id = new.baseline_run_id)
  ) then
    raise exception 'Follow-up run changed the persisted buyer-question locale or market context';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_resolution_follow_up_context_before_write on public.resolution_follow_ups;
create trigger validate_resolution_follow_up_context_before_write
  before insert or update of rerun_id, status on public.resolution_follow_ups
  for each row execute function public.validate_resolution_follow_up_context();

commit;
