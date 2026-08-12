-- Optimize tenant RLS policies so auth.uid() is evaluated once per statement
-- instead of once per row. This is semantically equivalent to the existing
-- policies and addresses Supabase auth_rls_initplan performance advisories.

alter policy account_deletion_requests_select_owner
on public.account_deletion_requests
using (
  requested_by = (select auth.uid())
  and public.has_org_role(organization_id, array['owner'::public.organization_role])
);

alter policy notification_preferences_select_self
on public.notification_preferences
using (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
);

alter policy notification_preferences_write_self
on public.notification_preferences
using (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
);

alter policy notifications_select_self
on public.notifications
using (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
);

alter policy notifications_update_self
on public.notifications
using (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  and public.is_org_member(organization_id)
);

alter policy members_insert_owner
on public.organization_members
with check (
  public.has_org_role(organization_id, array['owner'::public.organization_role])
  or (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.organizations o
      where o.id = organization_members.organization_id
        and o.created_by = (select auth.uid())
    )
  )
);

alter policy organizations_insert_creator
on public.organizations
with check (created_by = (select auth.uid()));

alter policy profiles_select_self
on public.profiles
using (id = (select auth.uid()));

alter policy profiles_update_self
on public.profiles
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

alter policy resolution_assets_insert_analyst
on public.resolution_assets
with check (
  status = 'draft'
  and created_by = (select auth.uid())
  and public.has_org_role(
    organization_id,
    array['owner'::public.organization_role, 'admin'::public.organization_role, 'analyst'::public.organization_role]
  )
);

alter policy resolution_follow_ups_insert_analyst
on public.resolution_follow_ups
with check (
  status = 'requested'
  and requested_by = (select auth.uid())
  and public.has_org_role(
    organization_id,
    array['owner'::public.organization_role, 'admin'::public.organization_role, 'analyst'::public.organization_role]
  )
);

alter policy resolution_follow_ups_update_analyst
on public.resolution_follow_ups
using (
  public.has_org_role(
    organization_id,
    array['owner'::public.organization_role, 'admin'::public.organization_role, 'analyst'::public.organization_role]
  )
)
with check (
  (recorded_by is null or recorded_by = (select auth.uid()))
  and public.has_org_role(
    organization_id,
    array['owner'::public.organization_role, 'admin'::public.organization_role, 'analyst'::public.organization_role]
  )
);
