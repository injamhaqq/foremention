-- Keep Source Snapshot write permissions aligned with the existing live-inspection role contract.
begin;

drop policy if exists "source_snapshots_insert_analyst" on public.source_snapshots;
create policy "source_snapshots_insert_analyst"
  on public.source_snapshots for insert
  with check (
    public.has_org_role(source_snapshots.organization_id, array['owner','admin','analyst']::public.organization_role[])
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

drop policy if exists "source_snapshot_observations_insert_analyst" on public.source_snapshot_observations;
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
        and public.has_org_role(snapshot.organization_id, array['owner','admin','analyst']::public.organization_role[])
    )
  );

commit;