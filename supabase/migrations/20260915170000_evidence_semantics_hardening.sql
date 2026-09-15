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

comment on column public.source_map_entries.page_presence_state is
  'Page-level brand-presence state. unknown means retrieval/review did not support either presence or absence.';
comment on column public.source_map_entries.reference_origin is
  'Origin of the source reference. provider_citation means the URL was returned by the answer provider; page inspection is separate evidence.';

commit;
