-- Resolution evidence snapshots must be derived from persisted historical rows,
-- never from mutable client-supplied/current-library wording. The API may use a
-- current prompt row for convenience while assembling a draft, but the durable
-- evidence record is canonicalized here from the reviewed run answer that was
-- actually collected.
create or replace function public.validate_resolution_asset_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  asset public.resolution_assets%rowtype;
  item_title text;
  item_url text;
  item_verified_at timestamptz;
  source_title text;
  source_url text;
  observation_at timestamptz;
  answer_provider text;
  answer_model text;
  historical_question text;
  answer_excerpt text;
  answer_run_id uuid;
begin
  select * into asset
  from public.resolution_assets
  where id = coalesce(new.resolution_asset_id, old.resolution_asset_id);

  if asset.id is null or asset.status <> 'draft' then
    raise exception 'Evidence links can change only while a resolution is a draft';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.organization_id <> asset.organization_id or new.project_id <> asset.project_id then
    raise exception 'Resolution evidence must belong to the same workspace';
  end if;

  if new.evidence_item_id is not null then
    select evidence.title, evidence.source_url, evidence.verified_at
      into item_title, item_url, item_verified_at
    from public.evidence_items evidence
    where evidence.id = new.evidence_item_id
      and evidence.organization_id = asset.organization_id
      and evidence.project_id = asset.project_id
      and evidence.verification_status = 'verified'
      and evidence.source_url is not null
      and nullif(trim(evidence.usage_rights), '') is not null
      and (evidence.expires_at is null or evidence.expires_at > now());

    if item_url is null then
      raise exception 'Resolution assets can use only current verified evidence items';
    end if;

    new.evidence_snapshot := jsonb_build_object(
      'id', new.evidence_item_id,
      'kind', 'evidence_item',
      'title', item_title,
      'url', item_url,
      'observedAt', item_verified_at,
      'provider', null,
      'model', null,
      'question', null,
      'excerpt', null,
      'runId', null,
      'verification', 'verified'
    );
  end if;

  if new.source_observation_id is not null then
    select
      coalesce(nullif(trim(source.page_title), ''), source.canonical_url),
      source.canonical_url,
      observation.observed_at,
      answer.provider,
      answer.model,
      answer.prompt_text,
      answer.answer_text,
      answer.run_id
    into
      source_title,
      source_url,
      observation_at,
      answer_provider,
      answer_model,
      historical_question,
      answer_excerpt,
      answer_run_id
    from public.source_observations observation
    join public.run_answers answer
      on answer.id = observation.run_answer_id
      and answer.organization_id = observation.organization_id
    join public.runs run
      on run.id = answer.run_id
      and run.organization_id = observation.organization_id
    join public.sources source
      on source.id = observation.source_id
      and source.organization_id = observation.organization_id
    where observation.id = new.source_observation_id
      and observation.organization_id = asset.organization_id
      and observation.source_id = asset.source_id
      and observation.review_status = 'verified'
      and answer.review_status = 'verified'
      and nullif(trim(answer.prompt_text), '') is not null
      and nullif(trim(answer.provider), '') is not null
      and nullif(trim(answer.model), '') is not null
      and run.project_id = asset.project_id
      and run.status in ('review','complete','partial');

    if answer_run_id is null then
      raise exception 'Resolution assets can use only reviewed observations with persisted buyer-question, provider, and model provenance from the same project and opportunity source';
    end if;

    new.evidence_snapshot := jsonb_build_object(
      'id', new.source_observation_id,
      'kind', 'source_observation',
      'title', source_title,
      'url', source_url,
      'observedAt', observation_at,
      'provider', answer_provider,
      'model', answer_model,
      'question', historical_question,
      'excerpt', left(coalesce(answer_excerpt, ''), 500),
      'runId', answer_run_id,
      'verification', 'verified'
    );
  end if;

  return new;
end;
$$;
