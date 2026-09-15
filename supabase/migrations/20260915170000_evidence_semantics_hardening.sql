-- F04: keep page-presence truth separate from citation existence and crawler reachability.
-- Existing unreviewed false booleans are not backfilled as absence; only explicit
-- human reviews or observed positives are promoted to present/absent states.
begin;

alter table public.source_map_entries
  add column if not exists page_presence_state text not null default 'unknown',
  add column if not exists reference_origin text not null default 'provider_citation';

alter table public.source_map_entries
  drop constraint if exists source_map_entries_page_presence_state_check;
alter table public.source_map_entries
  add constraint source_map_entries_page_presence_state_check
  check (page_presence_state in ('unknown','present','absent'));

alter table public.source_map_entries
  drop constraint if exists source_map_entries_reference_origin_check;
alter table public.source_map_entries
  add constraint source_map_entries_reference_origin_check
  check (reference_origin in ('provider_citation'));

update public.source_map_entries
set page_presence_state = case
  when reviewed_at is not null and client_present then 'present'
  when reviewed_at is not null and not client_present then 'absent'
  when client_present then 'present'
  else 'unknown'
end;

create or replace function public.normalize_source_map_entry_presence_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  -- A dated human review is authoritative for page presence. Automated writes
  -- must supply page_presence_state explicitly; a legacy false boolean alone is
  -- never promoted to a supported absence.
  if new.reviewed_at is not null then
    new.page_presence_state := case when new.client_present then 'present' else 'absent' end;
  elsif new.client_present then
    new.page_presence_state := 'present';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_source_map_entry_presence_state_before_write on public.source_map_entries;
create trigger normalize_source_map_entry_presence_state_before_write
  before insert or update of client_present, reviewed_at, page_presence_state on public.source_map_entries
  for each row execute function public.normalize_source_map_entry_presence_state();

comment on column public.source_map_entries.page_presence_state is
  'Page-level brand-presence state. unknown means retrieval/review did not support either presence or absence.';
comment on column public.source_map_entries.reference_origin is
  'Origin of the source reference. provider_citation means the URL was returned by the answer provider; page inspection is separate evidence.';

commit;
