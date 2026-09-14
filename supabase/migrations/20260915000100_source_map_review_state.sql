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

create or replace function public.normalize_source_map_review_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name like 'Reviewed collection %' then
    new.review_state := 'reviewed';
  elsif new.name like 'Observed collection %' then
    new.review_state := 'observed';
  end if;

  -- Existing application code publishes both observed and reviewed generations.
  -- Keep observed maps inspectable as drafts, but never expose them as reviewed
  -- decision evidence merely because a publication PATCH was attempted.
  if new.review_state = 'observed' and new.status = 'published' then
    new.status := 'draft';
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_source_map_review_state() from public, anon, authenticated;

drop trigger if exists normalize_source_map_review_state_before_write on public.source_maps;
create trigger normalize_source_map_review_state_before_write
  before insert or update of name, status, review_state on public.source_maps
  for each row execute function public.normalize_source_map_review_state();

alter table public.source_maps
  drop constraint if exists source_maps_published_requires_reviewed_check;
alter table public.source_maps
  add constraint source_maps_published_requires_reviewed_check
  check (status <> 'published' or review_state = 'reviewed');

create index if not exists source_maps_reviewed_published_idx
  on public.source_maps (organization_id, category_id, created_at desc)
  where status = 'published' and review_state = 'reviewed';

commit;
