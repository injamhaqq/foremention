-- Support ticket RLS initplan optimization.
-- Preserve both original security predicates and the existing policy roles:
-- requesters may only view/insert their own tickets inside an organization
-- of which they remain a member. auth.uid() is stable per statement, whereas
-- organization membership must remain row-dependent.
begin;

alter policy support_tickets_select_requester on public.support_tickets
  using (
    requester_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

alter policy support_tickets_insert_requester on public.support_tickets
  with check (
    requester_id = (select auth.uid())
    and public.is_org_member(organization_id)
  );

commit;
