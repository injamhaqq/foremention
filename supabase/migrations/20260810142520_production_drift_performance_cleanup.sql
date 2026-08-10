-- Cover the foreign keys introduced by production reconciliation and keep
-- read policies separate from write policies so Postgres evaluates only the
-- authorization checks required for each operation.
begin;

create index if not exists verified_claim_evidence_evidence_item_idx
  on public.verified_claim_evidence (evidence_item_id);
create index if not exists workspace_webhook_endpoints_created_by_idx
  on public.workspace_webhook_endpoints (created_by);
create index if not exists workspace_comments_author_idx
  on public.workspace_comments (author_id);
create index if not exists integration_activity_deliveries_integration_idx
  on public.integration_activity_deliveries (integration_id);

drop policy if exists "verified_claim_evidence_write_analyst"
  on public.verified_claim_evidence;
drop policy if exists "verified_claim_evidence_insert_analyst"
  on public.verified_claim_evidence;
create policy "verified_claim_evidence_insert_analyst"
  on public.verified_claim_evidence for insert to authenticated
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );
drop policy if exists "verified_claim_evidence_update_analyst"
  on public.verified_claim_evidence;
create policy "verified_claim_evidence_update_analyst"
  on public.verified_claim_evidence for update to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );
drop policy if exists "verified_claim_evidence_delete_analyst"
  on public.verified_claim_evidence;
create policy "verified_claim_evidence_delete_analyst"
  on public.verified_claim_evidence for delete to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );

drop policy if exists "workspace_webhook_endpoints_write_admin"
  on public.workspace_webhook_endpoints;
drop policy if exists "workspace_webhook_endpoints_insert_admin"
  on public.workspace_webhook_endpoints;
create policy "workspace_webhook_endpoints_insert_admin"
  on public.workspace_webhook_endpoints for insert to authenticated
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
  );
drop policy if exists "workspace_webhook_endpoints_update_admin"
  on public.workspace_webhook_endpoints;
create policy "workspace_webhook_endpoints_update_admin"
  on public.workspace_webhook_endpoints for update to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
  )
  with check (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
  );
drop policy if exists "workspace_webhook_endpoints_delete_admin"
  on public.workspace_webhook_endpoints;
create policy "workspace_webhook_endpoints_delete_admin"
  on public.workspace_webhook_endpoints for delete to authenticated
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin']::public.organization_role[]
    )
  );

commit;
