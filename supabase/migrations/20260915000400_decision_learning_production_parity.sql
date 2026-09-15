-- Repair the September 2 decision-learning schema before production adoption.
-- Historical migrations remain immutable; this forward migration fixes stale
-- run provenance, neutralizes directional semantics, and makes newly introduced
-- actor RLS checks init-plan safe without changing role authorization.
begin;

create or replace function public.validate_eligibility_requirement() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  change_row public.change_specifications%rowtype;
  evidence public.evidence_items%rowtype;
  observation public.source_observations%rowtype;
  answer public.run_answers%rowtype;
  becoming_verified boolean;
begin
  select * into change_row from public.change_specifications where id = new.change_specification_id;
  if not found or change_row.organization_id <> new.organization_id or change_row.project_id <> new.project_id then
    raise exception 'Eligibility requirement must belong to the same Change Specification workspace';
  end if;
  if auth.uid() is not null and new.created_by <> auth.uid() then
    raise exception 'Eligibility requirement creator must match authenticated actor';
  end if;
  new.attribute_key := lower(trim(new.attribute_key));
  becoming_verified := new.review_status = 'verified' and (tg_op = 'INSERT' or old.review_status <> 'verified');

  if becoming_verified then
    if num_nonnulls(new.evidence_item_id, new.source_observation_id) <> 1 then
      raise exception 'Verified eligibility requirement requires exactly one evidence source';
    end if;
    if new.evidence_item_id is not null then
      select * into evidence
      from public.evidence_items
      where id = new.evidence_item_id
        and organization_id = new.organization_id
        and project_id = new.project_id
        and verification_status = 'verified'
        and source_url is not null
        and nullif(trim(usage_rights), '') is not null
        and (expires_at is null or expires_at > now());
      if not found then
        raise exception 'Verified eligibility requirement requires current verified same-workspace evidence';
      end if;
      new.source_snapshot := jsonb_build_object(
        'kind', 'evidence_item', 'evidenceItemId', evidence.id, 'title', evidence.title,
        'sourceUrl', evidence.source_url, 'verifiedAt', evidence.verified_at, 'expiresAt', evidence.expires_at
      );
    else
      select * into observation
      from public.source_observations
      where id = new.source_observation_id
        and organization_id = new.organization_id
        and review_status = 'verified';
      if not found or observation.run_answer_id is null then
        raise exception 'Verified eligibility requirement requires a verified source observation';
      end if;
      select answer_row.* into answer
      from public.run_answers as answer_row
      join public.runs as run on run.id = answer_row.run_id
      where answer_row.id = observation.run_answer_id
        and answer_row.organization_id = new.organization_id
        and answer_row.review_status = 'verified'
        and run.organization_id = new.organization_id
        and run.project_id = new.project_id
        and nullif(trim(answer_row.prompt_text), '') is not null
        and nullif(trim(answer_row.provider), '') is not null
        and nullif(trim(answer_row.model), '') is not null;
      if not found then
        raise exception 'Verified eligibility requirement source observation must preserve reviewed answer provider, model, prompt text, and run provenance';
      end if;
      new.source_snapshot := jsonb_build_object(
        'kind', 'source_observation', 'sourceObservationId', observation.id,
        'observedAt', observation.observed_at, 'provider', answer.provider, 'model', answer.model,
        'promptText', answer.prompt_text, 'runId', answer.run_id
      );
    end if;
    if auth.uid() is not null and coalesce(new.verified_by, auth.uid()) <> auth.uid() then
      raise exception 'Eligibility requirement verifier must match authenticated actor';
    end if;
    new.verified_by := coalesce(auth.uid(), new.verified_by);
    if new.verified_by is null then raise exception 'Verified eligibility requirement requires a verifier'; end if;
    new.verified_at := now();
  end if;

  if tg_op = 'UPDATE' and old.review_status = 'verified' then
    if new.organization_id <> old.organization_id or new.project_id <> old.project_id or new.change_specification_id <> old.change_specification_id or new.entity_type <> old.entity_type or new.attribute_key <> old.attribute_key or new.operator <> old.operator or new.expected_value_json <> old.expected_value_json or new.importance <> old.importance or new.evidence_item_id is distinct from old.evidence_item_id or new.source_observation_id is distinct from old.source_observation_id or new.source_snapshot <> old.source_snapshot or new.created_by <> old.created_by or new.verified_by is distinct from old.verified_by or new.verified_at is distinct from old.verified_at or new.created_at <> old.created_at then
      raise exception 'Verified eligibility requirement is immutable';
    end if;
    if new.review_status <> 'verified' then raise exception 'Verified eligibility requirement cannot be rewritten'; end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

alter table public.change_verification_assessments
  drop constraint if exists change_verification_assessments_verification_state_check;

update public.change_verification_assessments
set verification_state = case verification_state
  when 'IMPROVED' then 'HIGHER_OBSERVED'
  when 'WORSENED' then 'LOWER_OBSERVED'
  when 'UNCHANGED' then 'NO_DIRECTIONAL_CHANGE'
  else verification_state
end
where verification_state in ('IMPROVED','WORSENED','UNCHANGED');

alter table public.change_verification_assessments
  add constraint change_verification_assessments_verification_state_check
  check (verification_state in (
    'HIGHER_OBSERVED',
    'LOWER_OBSERVED',
    'MIXED_OBSERVED',
    'NO_DIRECTIONAL_CHANGE',
    'INSUFFICIENT_EVIDENCE'
  ));

alter policy company_truth_entities_insert
  on public.company_truth_entities
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
  );

alter policy company_truth_assertions_insert
  on public.company_truth_assertions
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
    and verification_state = 'unverified'
  );

alter policy eligibility_requirements_insert
  on public.eligibility_requirements
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
    and review_status = 'draft'
  );

alter policy eligibility_evaluations_insert
  on public.eligibility_evaluations
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and evaluated_by = (select auth.uid())
  );

alter policy cross_business_evidence_insert
  on public.cross_business_evidence
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
    and verification_state = 'unverified'
  );

alter policy change_specification_cross_business_insert
  on public.change_specification_cross_business_evidence
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
  );

alter policy next_best_change_batches_insert
  on public.next_best_change_batches
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and evaluated_by = (select auth.uid())
  );

alter policy design_partner_execution_cycles_insert
  on public.design_partner_execution_cycles
  with check (
    public.has_org_role(organization_id, array['owner','admin']::public.organization_role[])
    and created_by = (select auth.uid())
  );

alter policy change_verification_assessments_insert
  on public.change_verification_assessments
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and assessed_by = (select auth.uid())
  );

alter policy change_verification_cross_business_insert
  on public.change_verification_cross_business_evidence
  with check (
    public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[])
    and created_by = (select auth.uid())
  );

drop view if exists public.change_learning_summaries;
create view public.change_learning_summaries with (security_invoker = true) as
select
  assessment.organization_id,
  assessment.project_id,
  coalesce(nullif(trim(specification.control_surface), ''), 'unspecified') as learning_key,
  specification.control_class,
  count(*)::bigint as assessment_count,
  count(*) filter (where assessment.comparison_eligible)::bigint as comparable_assessment_count,
  count(*) filter (where assessment.verification_state = 'HIGHER_OBSERVED')::bigint as higher_observed_count,
  count(*) filter (where assessment.verification_state = 'LOWER_OBSERVED')::bigint as lower_observed_count,
  count(*) filter (where assessment.verification_state = 'MIXED_OBSERVED')::bigint as mixed_observed_count,
  count(*) filter (where assessment.verification_state = 'NO_DIRECTIONAL_CHANGE')::bigint as no_directional_change_count,
  count(*) filter (where assessment.verification_state = 'INSUFFICIENT_EVIDENCE')::bigint as insufficient_evidence_count,
  count(distinct link.cross_business_evidence_id)::bigint as verified_cross_business_evidence_count,
  min(assessment.assessed_at) as first_assessed_at,
  max(assessment.assessed_at) as latest_assessed_at
from public.change_verification_assessments assessment
join public.change_specifications specification on specification.id = assessment.change_specification_id
left join public.change_verification_cross_business_evidence link on link.assessment_id = assessment.id
group by assessment.organization_id, assessment.project_id, coalesce(nullif(trim(specification.control_surface), ''), 'unspecified'), specification.control_class;

grant select on table public.change_learning_summaries to authenticated, service_role;

-- The scorecard is service-role only; rebuild it so aggregate names retain the
-- same neutral observed-direction semantics as individual assessment records.
drop view if exists public.design_partner_program_scorecard;
create view public.design_partner_program_scorecard as
with verified_external as (
  select classification.organization_id
  from public.company_organization_classifications classification
  where classification.classification in ('design_partner','customer')
    and classification.included_in_company_kpis = true
    and exists (
      select 1 from public.commercial_accounts account
      where account.customer_organization_id = classification.organization_id
    )
),
cycle_progress as (
  select cycle.*, progress.has_applied_reference, progress.has_verification_assessment
  from public.design_partner_execution_cycles cycle
  join public.design_partner_execution_progress progress on progress.cycle_id = cycle.id
  join verified_external external on external.organization_id = cycle.organization_id
),
assessments as (
  select assessment.*
  from public.change_verification_assessments assessment
  join verified_external external on external.organization_id = assessment.organization_id
)
select
  (select count(*) from verified_external)::bigint as verified_external_organizations,
  (select count(distinct organization_id) from cycle_progress)::bigint as started_cycle_organizations,
  (select count(*) from cycle_progress where lifecycle_state = 'completed')::bigint as completed_execution_cycles,
  (select count(distinct change_specification_id) from cycle_progress where has_applied_reference)::bigint as distinct_executed_company_changes,
  (select count(*) from assessments where comparison_eligible)::bigint as comparable_verified_cycles,
  (select count(*) from assessments where verification_state = 'HIGHER_OBSERVED')::bigint as higher_observed_count,
  (select count(*) from assessments where verification_state = 'LOWER_OBSERVED')::bigint as lower_observed_count,
  (select count(*) from assessments where verification_state = 'MIXED_OBSERVED')::bigint as mixed_observed_count,
  (select count(*) from assessments where verification_state = 'NO_DIRECTIONAL_CHANGE')::bigint as no_directional_change_count,
  (select count(*) from assessments where verification_state = 'INSUFFICIENT_EVIDENCE')::bigint as insufficient_evidence_count;

revoke all on table public.design_partner_program_scorecard from public, anon, authenticated;
grant select on table public.design_partner_program_scorecard to service_role;

comment on view public.change_learning_summaries is 'Descriptive distribution of persisted observed-direction verification assessments by company change surface. No success probability, business-value judgment, or causal effect estimate.';
comment on view public.design_partner_program_scorecard is 'Service-role-only aggregate of explicitly verified external design-partner/customer execution using neutral observed-direction states. Zero remains zero.';

commit;
