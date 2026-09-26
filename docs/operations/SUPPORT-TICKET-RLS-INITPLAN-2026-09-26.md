# Support-ticket RLS advisor remediation

26 September 2026: Supabase performance advisor reported two `auth_rls_initplan` warnings on `support_tickets` SELECT and INSERT policies.

Both policies originally require `requester_id = auth.uid()` and `public.is_org_member(organization_id)`. They serve a real authenticated multi-tenant support workflow, so do not revoke the function or open the policies.

The follow-up migration changes only the stable actor check to `requester_id = (select auth.uid())`, preserving organization-specific membership checks, the unchanged policies and their roles. This allows Postgres to evaluate the auth lookup once as an initplan rather than per returned row; it is not a license to cache a tenant-membership decision across rows.

Acceptance: after exact-head CI/security/browser checks, apply to the existing production Supabase schema, compare `pg_policies` semantics and run performance and security advisors again. Keep the separate authenticated SECURITY DEFINER `update_prompt_versioned` warning under explicit authorization review: it performs authenticated role checks, so blindly revoking its caller access could break real question editing. The Auth leaked-password setting is a separate dashboard/provider-plan action and is not silently changed here.
