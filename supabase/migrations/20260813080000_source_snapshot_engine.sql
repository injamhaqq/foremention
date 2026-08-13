-- Immutable, tenant-safe metadata snapshots for cited public pages.
-- Foremention stores bounded fingerprints and retrieval metadata by default,
-- not broad page archives or raw page bodies.
begin;

create table if not exists public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.sources(id) on delete cascade,
  run_id uuid references public.runs(id) on delete set null,
  previous_snapshot_id uuid references public.source_snapshots(id) on delete set null,
  snapshot_key text unique,
  canonical_url text not null,
  final_url text not null,
  retrieved_at timestamptz not null,
  access public.crawler_access not null default 'unknown',
  http_status integer check (http_status is null or http_status between 100 and 599),
  content_type text,
  page_title text,
  redirect_count integer not null default 0 check (redirect_count >= 0),
  content_length integer check (content_length is null or content_length >= 0),
  content_signature text check (content_signature is null or content_signature ~ '^[0-9a-f]{8}$'),
  content_hash text check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  representation_version text not null default 'bounded-visible-text-v1',
  change_state text not null default 'unknown' check (change_state in ('initial','unchanged','changed','unreachable','unknown')),
  change_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.source_snapshots is
  'Immutable bounded page-retrieval metadata. Raw page bodies are not retained by default; review state remains linked through source observations.';
comment on column public.source_snapshots.content_signature is
  'A bounded similarity fingerprint of normalized visible text; not stored page content.';
comment on column public.source_snapshots.content_hash is
  'A SHA-256 hash of the bounded normalized visible-text representation; not stored page content.';
comment on column public.source_snapshots.previous_snapshot_id is
  'The immediately preceding persisted snapshot for the same workspace source when known.';

create index if not exists source_snapshots_org_source_retrieved_idx
  on public.source_snapshots (organization_id, source_id, retrieved_at desc);
create index if not exists source_snapshots_run_source_idx
  on public.source_snapshots (run_id, source_id)
  where run_id is not null;

create table if not exists public.source_snapshot_observations (
  source_snapshot_id uuid not null references public.source_snapshots(id) on delete cascade,
  source_observation_id uuid not null references public.source_observations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (source_snapshot_id, source_observation_id)
);

create index if not exists source_snapshot_observations_observation_idx
  on public.source_snapshot_observations (source_observation_id, source_snapshot_id);

alter table public.source_snapshots enable row level security;
alter table public.source_snapshot_observations enable row level security;

drop policy if exists "source_snapshots_select_member" on public.source_snapshots;
drop policy if exists "source_snapshots_insert_analyst" on public.source_snapshots;
create policy "source_snapshots_select_member"
  on public.source_snapshots for select
  using (public.is_org_member(source_snapshots.organization_id));
create policy "source_snapshots_insert_analyst"
  on public.source_snapshots for insert
  with check (
    public.has_org_role(source_snapshots.organization_id, array['owner','analyst']::public.organization_role[])
    and exists (
      select 1 from public.sources s
      where s.id = source_snapshots.source_id
        and s.organization_id = source_snapshots.organization_id
    )
    and (
      source_snapshots.run_id is null
      or exists (
        select 1 from public.runs r
        where r.id = source_snapshots.run_id
          and r.organization_id = source_snapshots.organization_id
      )
    )
    and (
      source_snapshots.previous_snapshot_id is null
      or exists (
        select 1 from public.source_snapshots previous
        where previous.id = source_snapshots.previous_snapshot_id
          and previous.organization_id = source_snapshots.organization_id
          and previous.source_id = source_snapshots.source_id
      )
    )
  );

drop policy if exists "source_snapshot_observations_select_member" on public.source_snapshot_observations;
drop policy if exists "source_snapshot_observations_insert_analyst" on public.source_snapshot_observations;
create policy "source_snapshot_observations_select_member"
  on public.source_snapshot_observations for select
  using (
    exists (
      select 1 from public.source_snapshots snapshot
      where snapshot.id = source_snapshot_observations.source_snapshot_id
        and public.is_org_member(snapshot.organization_id)
    )
  );
create policy "source_snapshot_observations_insert_analyst"
  on public.source_snapshot_observations for insert
  with check (
    exists (
      select 1
      from public.source_snapshots snapshot
      join public.source_observations observation
        on observation.id = source_snapshot_observations.source_observation_id
       and observation.organization_id = snapshot.organization_id
       and observation.source_id = snapshot.source_id
      where snapshot.id = source_snapshot_observations.source_snapshot_id
        and public.has_org_role(snapshot.organization_id, array['owner','analyst']::public.organization_role[])
    )
  );

-- Authenticated customers can read and append evidence snapshots, but cannot
-- rewrite or erase historical snapshot content. Service-role maintenance still
-- follows the existing controlled backend path.
grant select, insert on public.source_snapshots to authenticated;
grant select, insert on public.source_snapshot_observations to authenticated;
revoke update, delete on public.source_snapshots from authenticated;
revoke update, delete on public.source_snapshot_observations from authenticated;

commit;
