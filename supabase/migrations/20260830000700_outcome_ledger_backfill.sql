-- Backfill existing reviewed resolution history into the append-only Outcome
-- Ledger. Event keys intentionally match the live capture triggers so this is
-- idempotent and cannot double-count a record created while migrations run.
begin;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'observation',
  'resolution:' || asset.id::text || ':observation',
  asset.created_by, 'user', asset.created_at, asset.limitations,
  jsonb_build_object(
    'recommendationRecordRunId', asset.baseline_run_id,
    'boundary', 'Persisted reviewed Recommendation Record baseline; observation is not a causal claim.'
  )
from public.resolution_assets asset
where asset.baseline_run_id is not null
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'recommendation',
  'resolution:' || asset.id::text || ':recommendation',
  asset.created_by, 'user', asset.created_at, asset.limitations,
  jsonb_build_object('assetType', asset.asset_type, 'title', asset.title, 'problemStatement', asset.problem_statement, 'generationVersion', asset.generation_version)
from public.resolution_assets asset
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, resolution_asset_evidence_id, source_id, opportunity_id,
  event_type, event_key, actor_id, actor_type, occurred_at, limitations, payload
)
select
  link.organization_id, link.project_id, asset.baseline_run_id,
  asset.id, link.id, asset.source_id, asset.opportunity_id,
  'evidence', 'resolution-evidence:' || link.id::text,
  asset.created_by, 'user', link.created_at, asset.limitations,
  jsonb_build_object(
    'verification', link.evidence_snapshot ->> 'verification',
    'evidenceItemId', link.evidence_item_id,
    'sourceObservationId', link.source_observation_id,
    'evidenceLinkId', link.id
  )
from public.resolution_asset_evidence link
join public.resolution_assets asset on asset.id = link.resolution_asset_id
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'decision',
  'resolution:' || asset.id::text || ':decision:' || replace(asset.decision_at::text, ' ', 'T'),
  asset.decision_by, 'user', asset.decision_at, asset.limitations,
  jsonb_build_object('reviewDecision', asset.review_decision, 'note', asset.approval_note)
from public.resolution_assets asset
where asset.decision_at is not null
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'action',
  'resolution:' || asset.id::text || ':action:approved',
  asset.approved_by, 'user', asset.approved_at, asset.limitations,
  jsonb_build_object('action', 'approved', 'title', asset.title)
from public.resolution_assets asset
where asset.approved_at is not null
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'ownership',
  'resolution:' || asset.id::text || ':ownership:initial',
  coalesce(asset.created_by, opportunity.owner_id), 'user', coalesce(opportunity.updated_at, asset.created_at), asset.limitations,
  jsonb_build_object('ownerId', opportunity.owner_id, 'dueAt', opportunity.due_at, 'nextAction', opportunity.next_action)
from public.resolution_assets asset
join public.opportunities opportunity on opportunity.id = asset.opportunity_id
where opportunity.owner_id is not null
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, event_type, event_key,
  actor_id, actor_type, occurred_at, limitations, payload
)
select
  asset.organization_id, asset.project_id, asset.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, 'completion',
  'resolution:' || asset.id::text || ':completion',
  asset.applied_by, 'user', asset.applied_at, asset.limitations,
  jsonb_build_object('applicationReference', asset.application_reference, 'applicationNote', asset.application_note)
from public.resolution_assets asset
where asset.applied_at is not null
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, follow_up_id,
  event_type, event_key, actor_id, actor_type, occurred_at, limitations, payload
)
select
  follow_up.organization_id, follow_up.project_id, follow_up.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, follow_up.id,
  'measurement', 'follow-up:' || follow_up.id::text || ':requested',
  follow_up.requested_by, 'user', follow_up.requested_at, array[follow_up.limitation],
  jsonb_build_object('status', 'requested', 'baselineRunId', follow_up.baseline_run_id, 'followUpRunId', follow_up.rerun_id)
from public.resolution_follow_ups follow_up
join public.resolution_assets asset on asset.id = follow_up.resolution_asset_id
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, follow_up_id,
  event_type, event_key, actor_id, actor_type, occurred_at,
  comparison_eligible, comparison_reason, limitations, payload
)
select
  follow_up.organization_id, follow_up.project_id, follow_up.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, follow_up.id,
  'measurement', 'follow-up:' || follow_up.id::text || ':measurement:' || follow_up.status,
  coalesce(follow_up.recorded_by, follow_up.requested_by), 'user', coalesce(follow_up.completed_at, follow_up.requested_at),
  case when follow_up.status = 'complete' then true when follow_up.status = 'incomparable' then false else null end,
  case when follow_up.status in ('complete','incomparable') then coalesce(nullif(trim(follow_up.outcome ->> 'interpretation'), ''), follow_up.limitation) else 'Measurement ended with status ' || follow_up.status || '; no observed outcome is reported.' end,
  array[follow_up.limitation],
  jsonb_build_object('status', follow_up.status, 'baselineRunId', follow_up.baseline_run_id, 'followUpRunId', follow_up.rerun_id)
from public.resolution_follow_ups follow_up
join public.resolution_assets asset on asset.id = follow_up.resolution_asset_id
where follow_up.status in ('complete','incomparable','failed','cancelled')
on conflict (event_key) do nothing;

insert into public.outcome_ledger_events (
  organization_id, project_id, recommendation_record_run_id,
  resolution_asset_id, source_id, opportunity_id, follow_up_id,
  event_type, event_key, actor_id, actor_type, occurred_at,
  comparison_eligible, comparison_reason, limitations, payload
)
select
  follow_up.organization_id, follow_up.project_id, follow_up.baseline_run_id,
  asset.id, asset.source_id, asset.opportunity_id, follow_up.id,
  'outcome', 'follow-up:' || follow_up.id::text || ':outcome:' || follow_up.status,
  coalesce(follow_up.recorded_by, follow_up.requested_by), 'user', coalesce(follow_up.completed_at, follow_up.requested_at),
  follow_up.status = 'complete',
  coalesce(nullif(trim(follow_up.outcome ->> 'interpretation'), ''), follow_up.limitation),
  array[follow_up.limitation],
  jsonb_build_object('status', follow_up.status, 'baselineRunId', follow_up.baseline_run_id, 'followUpRunId', follow_up.rerun_id, 'outcome', follow_up.outcome)
from public.resolution_follow_ups follow_up
join public.resolution_assets asset on asset.id = follow_up.resolution_asset_id
where follow_up.status in ('complete','incomparable')
on conflict (event_key) do nothing;

commit;
