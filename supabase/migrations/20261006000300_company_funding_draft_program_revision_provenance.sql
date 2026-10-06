-- Bind every new Company OS funding draft to current Funding Program Registry revisions.
begin;

alter table public.company_funding_draft_artifacts
  add column program_revision_ids uuid[] not null default '{}'::uuid[];

create or replace function public.validate_company_funding_draft_program_revision_provenance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if cardinality(new.program_revision_ids) <> cardinality(new.program_evidence_ids) then
    raise exception 'Company funding draft requires one program revision per program evidence record';
  end if;
  if (select count(distinct value) from unnest(new.program_revision_ids) as value)
       <> cardinality(new.program_revision_ids) then
    raise exception 'Company funding program revision identifiers must be unique';
  end if;

  if exists (
    select 1
    from unnest(
      new.program_evidence_ids,
      new.program_source_check_ids,
      new.program_source_review_ids,
      new.program_revision_ids
    ) with ordinality as requested(evidence_id, check_id, review_id, revision_id, ordinal)
    left join public.company_funding_program_revisions as revision
      on revision.id = requested.revision_id
     and revision.organization_id = new.organization_id
     and revision.project_id = new.project_id
     and revision.evidence_item_id = requested.evidence_id
     and revision.source_check_id = requested.check_id
     and revision.source_review_id = requested.review_id
    where revision.id is null
       or exists (
         select 1
         from public.company_funding_program_revisions as newer
         where newer.organization_id = new.organization_id
           and newer.project_id = new.project_id
           and newer.supersedes_revision_id = revision.id
       )
  ) then
    raise exception 'Company funding draft requires current registry revision provenance aligned to evidence and reviewed source receipts';
  end if;

  return new;
end;
$$;

create trigger validate_company_funding_draft_program_revision_before_write
  before insert or update on public.company_funding_draft_artifacts
  for each row execute function public.validate_company_funding_draft_program_revision_provenance();

comment on column public.company_funding_draft_artifacts.program_revision_ids is
  'Ordinally aligned current Funding Program Registry revisions for program_evidence_ids. Required for new inserts after the registry migration.';

commit;
