-- Bind tenant-owned child rows to parent rows from the same organization.
-- This closes direct Data API paths that could otherwise combine valid UUIDs
-- from different tenants even when each table has organization-scoped RLS.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.projects
  add constraint projects_organization_id_id_key unique (organization_id, id);
alter table public.evidence_items
  add constraint evidence_items_organization_id_id_key unique (organization_id, id);
alter table public.verified_claims
  add constraint verified_claims_organization_id_id_key unique (organization_id, id);
alter table public.workspace_webhook_endpoints
  add constraint workspace_webhook_endpoints_organization_id_id_key unique (organization_id, id);
alter table public.integrations
  add constraint integrations_organization_id_id_key unique (organization_id, id);

alter table public.evidence_items
  drop constraint if exists evidence_items_project_id_fkey,
  add constraint evidence_items_org_project_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade;

alter table public.verified_claims
  drop constraint if exists verified_claims_project_id_fkey,
  drop constraint if exists verified_claims_evidence_item_id_fkey,
  add constraint verified_claims_org_project_fkey
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id)
    on delete cascade,
  add constraint verified_claims_org_evidence_fkey
    foreign key (organization_id, evidence_item_id)
    references public.evidence_items (organization_id, id)
    on delete set null;

alter table public.verified_claim_evidence
  drop constraint if exists verified_claim_evidence_claim_id_fkey,
  drop constraint if exists verified_claim_evidence_evidence_item_id_fkey,
  add constraint verified_claim_evidence_org_claim_fkey
    foreign key (organization_id, claim_id)
    references public.verified_claims (organization_id, id)
    on delete cascade,
  add constraint verified_claim_evidence_org_evidence_fkey
    foreign key (organization_id, evidence_item_id)
    references public.evidence_items (organization_id, id)
    on delete cascade;

alter table public.workspace_webhook_deliveries
  drop constraint if exists workspace_webhook_deliveries_endpoint_id_fkey,
  add constraint workspace_webhook_deliveries_org_endpoint_fkey
    foreign key (organization_id, endpoint_id)
    references public.workspace_webhook_endpoints (organization_id, id)
    on delete cascade;

alter table public.integration_activity_deliveries
  drop constraint if exists integration_activity_deliveries_integration_id_fkey,
  add constraint integration_activity_deliveries_org_integration_fkey
    foreign key (organization_id, integration_id)
    references public.integrations (organization_id, id)
    on delete cascade;

create index if not exists evidence_items_org_project_idx
  on public.evidence_items (organization_id, project_id);
create index if not exists verified_claims_org_project_idx
  on public.verified_claims (organization_id, project_id);
create index if not exists verified_claims_org_evidence_idx
  on public.verified_claims (organization_id, evidence_item_id);
create index if not exists verified_claim_evidence_org_evidence_idx
  on public.verified_claim_evidence (organization_id, evidence_item_id);
create index if not exists workspace_webhook_deliveries_org_endpoint_idx
  on public.workspace_webhook_deliveries (organization_id, endpoint_id);
create index if not exists integration_activity_deliveries_org_integration_idx
  on public.integration_activity_deliveries (organization_id, integration_id);

commit;
