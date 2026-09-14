-- Resolve deterministic Supabase performance-advisor findings without changing
-- policy commands, target roles, or tenant authorization semantics.
begin;

-- Wrap direct auth.uid() calls in scalar subqueries so Postgres evaluates them
-- once per statement rather than once per row. ALTER POLICY preserves the
-- existing command and role scope of each policy.
alter policy "customer_success_reviews_insert_analyst"
  on public.customer_success_reviews
  with check (
    public.has_org_role(organization_id, array['owner','analyst']::public.organization_role[])
    and actor_id = (select auth.uid())
  );

alter policy "data_requests_select"
  on public.data_governance_requests
  using (
    private.has_org_permission(organization_id, 'security.read'::text)
    or requested_by = (select auth.uid())
  );

alter policy "data_requests_insert"
  on public.data_governance_requests
  with check (
    requested_by = (select auth.uid())
    and public.is_org_member(organization_id)
  );

alter policy "change_specifications_insert_analyst"
  on public.change_specifications
  with check (
    status = 'draft'
    and created_by = (select auth.uid())
    and public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );

alter policy "change_specifications_delete_creator_draft"
  on public.change_specifications
  using (
    status = 'draft'
    and created_by = (select auth.uid())
    and public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );

alter policy "change_execution_assets_write_analyst"
  on public.change_execution_assets
  using (
    public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  )
  with check (
    created_by = (select auth.uid())
    and public.has_org_role(
      organization_id,
      array['owner','admin','analyst']::public.organization_role[]
    )
  );

-- ai_cost_events_run_idx already provides the identical btree(run_id) index.
drop index if exists public.ai_cost_events_run_id_fk_idx;

commit;
