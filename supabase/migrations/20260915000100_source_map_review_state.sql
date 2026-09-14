begin;

-- F04: publication is a display lifecycle, not evidence verification.
-- Keep the concepts explicit and enforce that only human-reviewed maps can be
-- published into customer decision surfaces.
alter table public.source_maps
  add column if not exists review_state text not null default 'observed';

alter table public.source_maps
  drop constraint if exists source_maps_review_state_check;
alter table public.source_maps
  add constraint source_maps_review_state_check
  check (review_state in ('observed','reviewed'));

-- Existing reviewed maps were deterministically named by the reviewed generator.
-- Preserve that historical review signal, then withdraw automatically observed
-- maps from published decision surfaces.
update public.source_maps
set review_state = 'reviewed'
where name like 'Reviewed collection %';

update public.source_maps
set status = 'draft'
where status = 'published'
  and review_state = 'observed';

alter table public.source_maps
  drop constraint if exists source_maps_published_requires_reviewed_check;
alter table public.source_maps
  add constraint source_maps_published_requires_reviewed_check
  check (status <> 'published' or review_state = 'reviewed');

create index if not exists source_maps_reviewed_published_idx
  on public.source_maps (organization_id, category_id, created_at desc)
  where status = 'published' and review_state = 'reviewed';

commit;
