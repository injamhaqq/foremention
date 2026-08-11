-- Preserve the tenant component of the composite relationship when optional
-- evidence is deleted. Without a column list, SET NULL targets both columns
-- and conflicts with the non-null organization_id tenant boundary.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.verified_claims
  drop constraint verified_claims_org_evidence_fkey,
  add constraint verified_claims_org_evidence_fkey
    foreign key (organization_id, evidence_item_id)
    references public.evidence_items (organization_id, id)
    on delete set null (evidence_item_id);

commit;
