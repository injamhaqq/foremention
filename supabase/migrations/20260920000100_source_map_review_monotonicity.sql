begin;

-- Once a Source Map has crossed the human-review boundary it is monotonic:
-- a slower observed-map rebuild may refresh non-review fields, but it may not
-- regress the map back to observed/draft or replace the reviewed label.
create or replace function public.normalize_source_map_review_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and old.review_state = 'reviewed'
     and (
       new.review_state = 'observed'
       or new.name like 'Observed collection %'
     ) then
    new.review_state := 'reviewed';
    if new.name like 'Observed collection %' then
      new.name := old.name;
    end if;
    if old.status = 'published' and new.status = 'draft' then
      new.status := 'published';
    end if;
  elsif new.name like 'Reviewed collection %' then
    new.review_state := 'reviewed';
  elsif new.name like 'Observed collection %' then
    new.review_state := 'observed';
  end if;

  -- Observed evidence remains inspectable but cannot enter reviewed decision
  -- surfaces merely because an application write attempted publication.
  if new.review_state = 'observed' and new.status = 'published' then
    new.status := 'draft';
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_source_map_review_state() from public, anon, authenticated;

-- Repair only maps whose run has already completed/partially completed and
-- whose persisted answer + citation observations are all human-verified.
update public.source_maps sm
set
  name = 'Reviewed collection ' || upper(substr(sm.run_id::text, 1, 8)),
  review_state = 'reviewed',
  status = 'published'
where sm.run_id is not null
  and sm.review_state = 'observed'
  and sm.status = 'draft'
  and exists (
    select 1
    from public.runs r
    where r.id = sm.run_id
      and r.organization_id = sm.organization_id
      and r.status in ('complete', 'partial')
  )
  and exists (
    select 1
    from public.run_answers ra
    where ra.run_id = sm.run_id
      and ra.organization_id = sm.organization_id
  )
  and not exists (
    select 1
    from public.run_answers ra
    where ra.run_id = sm.run_id
      and ra.organization_id = sm.organization_id
      and ra.review_status <> 'verified'
  )
  and exists (
    select 1
    from public.source_observations so
    join public.run_answers ra on ra.id = so.run_answer_id
    where ra.run_id = sm.run_id
      and so.organization_id = sm.organization_id
      and so.review_status = 'verified'
  )
  and not exists (
    select 1
    from public.source_observations so
    join public.run_answers ra on ra.id = so.run_answer_id
    where ra.run_id = sm.run_id
      and so.organization_id = sm.organization_id
      and so.review_status <> 'verified'
  );

commit;
