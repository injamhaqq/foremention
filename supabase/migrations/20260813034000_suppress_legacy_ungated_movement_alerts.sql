-- The legacy background collector computes chronological run differences before
-- human review. Those attempts must never become customer alerts because they
-- do not pass Foremention's exact question/provider/model/methodology gate.
begin;

create or replace function public.suppress_legacy_ungated_movement_notification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return null;
end;
$$;

drop trigger if exists suppress_legacy_ungated_movement_notification on public.notifications;
create trigger suppress_legacy_ungated_movement_notification
  before insert on public.notifications
  for each row
  when (
    new.event_key like 'brand_presence_changed:%'
    or new.event_key like 'new_sources:%'
    or new.event_key like 'lost_sources:%'
    or new.event_key like 'competitor_movement:%'
  )
  execute function public.suppress_legacy_ungated_movement_notification();

comment on function public.suppress_legacy_ungated_movement_notification() is
  'Defense-in-depth: suppresses legacy run-movement alerts that are generated before human review and do not pass exact comparability. Safe post-review change products must use distinct event keys.';

-- Remove only system-generated legacy movement notices. Customer-authored data,
-- reviewed evidence, run history, Source Maps, and operational run-ready/failure
-- notifications are untouched.
delete from public.notifications
where event_key like 'brand_presence_changed:%'
   or event_key like 'new_sources:%'
   or event_key like 'lost_sources:%'
   or event_key like 'competitor_movement:%';

commit;
