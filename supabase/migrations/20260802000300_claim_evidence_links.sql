-- A claim may be supported by multiple verified evidence items while retaining the legacy primary link.
begin;

create table if not exists public.verified_claim_evidence (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  claim_id uuid not null references public.verified_claims(id) on delete cascade,
  evidence_item_id uuid not null references public.evidence_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (claim_id, evidence_item_id)
);

insert into public.verified_claim_evidence (organization_id, claim_id, evidence_item_id)
select organization_id, id, evidence_item_id from public.verified_claims where evidence_item_id is not null
on conflict do nothing;

create index if not exists verified_claim_evidence_org_idx on public.verified_claim_evidence (organization_id, claim_id);
alter table public.verified_claim_evidence enable row level security;
create policy "verified_claim_evidence_select_member" on public.verified_claim_evidence for select using (public.is_org_member(organization_id));
create policy "verified_claim_evidence_write_analyst" on public.verified_claim_evidence for all
  using (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin','analyst']::public.organization_role[]));
grant select, insert, update, delete on public.verified_claim_evidence to authenticated;

commit;
