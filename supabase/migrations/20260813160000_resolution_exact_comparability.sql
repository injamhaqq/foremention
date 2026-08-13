-- Resolution remeasurement must use the same evidence-comparability boundary as
-- Foremention's reviewed movement graph: same methodology version and the exact
-- persisted buyer-question/provider/exact-model matrix. If the boundary cannot
-- be proven, keep the observations but mark the follow-up incomparable rather
-- than calculating a before/after outcome.
create or replace function public.validate_resolution_follow_up() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
  baseline_provider_ids text[];
  rerun_provider_ids text[];
  baseline_run public.runs%rowtype;
  follow_up_run public.runs%rowtype;
begin
  select * into asset from public.resolution_assets where id = new.resolution_asset_id;
  if asset.id is null or asset.status <> 'applied' or asset.organization_id <> new.organization_id or asset.project_id <> new.project_id then
    raise exception 'Follow-up measurement requires an applied resolution in the same workspace';
  end if;
  if new.baseline_run_id <> asset.baseline_run_id then raise exception 'Follow-up baseline must match the resolution evidence baseline'; end if;

  if tg_op = 'UPDATE' then
    if old.organization_id is distinct from new.organization_id
      or old.project_id is distinct from new.project_id
      or old.resolution_asset_id is distinct from new.resolution_asset_id
      or old.baseline_run_id is distinct from new.baseline_run_id
      or old.requested_by is distinct from new.requested_by
      or old.requested_at is distinct from new.requested_at
      or (old.rerun_id is not null and old.rerun_id is distinct from new.rerun_id)
    then
      raise exception 'Follow-up identity, baseline, requester, and attached run are immutable';
    end if;
    if old.status in ('complete','incomparable','failed','cancelled') and (
      old.status is distinct from new.status
      or old.completed_at is distinct from new.completed_at
      or old.outcome is distinct from new.outcome
      or old.recorded_by is distinct from new.recorded_by
    ) then
      raise exception 'A terminal follow-up measurement is immutable';
    end if;
  end if;

  select provider_ids into baseline_provider_ids from public.runs
    where id = new.baseline_run_id and organization_id = new.organization_id and project_id = new.project_id and status in ('review','complete','partial');
  if baseline_provider_ids is null then raise exception 'Follow-up baseline must be a reviewed workspace run'; end if;

  if new.rerun_id is not null then
    select * into follow_up_run from public.runs
      where id = new.rerun_id and organization_id = new.organization_id and project_id = new.project_id;
    rerun_provider_ids := follow_up_run.provider_ids;
    if rerun_provider_ids is null or rerun_provider_ids <> baseline_provider_ids then raise exception 'Follow-up run must use the baseline providers'; end if;
    if follow_up_run.id = new.baseline_run_id or follow_up_run.created_at < new.requested_at then
      raise exception 'Follow-up run must be created after the comparable measurement request';
    end if;
    if exists (
      (select prompt_id from public.run_prompt_selections where run_id = new.baseline_run_id
       except select prompt_id from public.run_prompt_selections where run_id = new.rerun_id)
      union all
      (select prompt_id from public.run_prompt_selections where run_id = new.rerun_id
       except select prompt_id from public.run_prompt_selections where run_id = new.baseline_run_id)
    ) then raise exception 'Follow-up run must use the baseline buyer questions'; end if;
  end if;

  if new.status = 'complete' then
    select * into baseline_run from public.runs where id = new.baseline_run_id;
    select * into follow_up_run from public.runs where id = new.rerun_id;
    if follow_up_run.status not in ('complete','partial') then raise exception 'Follow-up outcome requires a completed comparable run'; end if;

    if nullif(trim(baseline_run.methodology_version), '') is null
      or nullif(trim(follow_up_run.methodology_version), '') is null
      or baseline_run.methodology_version is distinct from follow_up_run.methodology_version
      or not exists (select 1 from public.run_answers where run_id = baseline_run.id)
      or not exists (select 1 from public.run_answers where run_id = follow_up_run.id)
      or exists (
        select 1 from public.run_answers
        where run_id in (baseline_run.id, follow_up_run.id)
          and (
            review_status::text is distinct from 'verified'
            or nullif(trim(prompt_key), '') is null
            or nullif(trim(prompt_text), '') is null
            or nullif(trim(provider), '') is null
            or nullif(trim(model), '') is null
          )
      )
      or exists (
        (select distinct prompt_key, prompt_text, provider, model
           from public.run_answers where run_id = baseline_run.id
         except
         select distinct prompt_key, prompt_text, provider, model
           from public.run_answers where run_id = follow_up_run.id)
        union all
        (select distinct prompt_key, prompt_text, provider, model
           from public.run_answers where run_id = follow_up_run.id
         except
         select distinct prompt_key, prompt_text, provider, model
           from public.run_answers where run_id = baseline_run.id)
      )
    then
      new.status := 'incomparable';
      new.outcome := jsonb_build_object(
        'baselineRunId', baseline_run.id,
        'followUpRunId', follow_up_run.id,
        'interpretation', 'Foremention could not verify the same methodology and exact persisted buyer-question/provider/model matrix across both reviewed runs, so it did not calculate a comparable before-and-after result.'
      );
    else
      new.outcome := jsonb_build_object(
        'baselineRunId', baseline_run.id,
        'followUpRunId', follow_up_run.id,
        'baselineCompletedAt', baseline_run.completed_at,
        'followUpCompletedAt', follow_up_run.completed_at,
        'brandPresencePct', jsonb_build_object('before', baseline_run.brand_presence_pct, 'after', follow_up_run.brand_presence_pct, 'delta', follow_up_run.brand_presence_pct - baseline_run.brand_presence_pct),
        'firstMentionPct', jsonb_build_object('before', baseline_run.first_mention_pct, 'after', follow_up_run.first_mention_pct, 'delta', follow_up_run.first_mention_pct - baseline_run.first_mention_pct),
        'citationCount', jsonb_build_object('before', baseline_run.citation_count, 'after', follow_up_run.citation_count, 'delta', follow_up_run.citation_count - baseline_run.citation_count),
        'newSourceCount', jsonb_build_object('before', baseline_run.new_source_count, 'after', follow_up_run.new_source_count, 'delta', follow_up_run.new_source_count - baseline_run.new_source_count),
        'interpretation', 'Observed before-and-after association only. This record does not establish that the applied resolution caused the change.'
      );
    end if;
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status in ('failed','cancelled') and new.rerun_id is not null and not exists (
    select 1 from public.runs run where run.id = new.rerun_id and run.status::text = new.status
  ) then
    raise exception 'Follow-up failure state must match the recorded run';
  end if;

  if tg_op = 'UPDATE' and old.status <> new.status and not (
    (old.status = 'requested' and new.status in ('queued','failed','cancelled'))
    or (old.status = 'queued' and new.status in ('complete','incomparable','failed','cancelled'))
  ) then raise exception 'Follow-up state transition is not valid'; end if;
  return new;
end;
$$;
