# Chat 05 to Chat 01 — atomic invitation SQL handoff

**Proposal only. No production migration has been executed.**

Current invite handler now conditionally claims pending status before member creation, but these are separate SQL transactions. A failed membership write can strand the invitation. Chat 01 owns the eventual all-or-nothing RPC and migration.

## Schema confirmed by read-only catalog inspection (October 16, 2026)

- invitations: id uuid, organization_id uuid, email text, role organization_role, token_hash text unique, status text, expires_at timestamptz, accepted_at timestamptz, invited_by uuid.
- organization_members primary key: (organization_id,user_id); role is organization_role.
- Status check permits pending, accepted, revoked, expired.
- WARNING: UNIQUE(organization_id,email,status) means a second accepted invite can collide with an earlier accepted one. Preserve history. Prefer a migration to a partial unique pending-only normalized-address index after checking existing data compatibility.

## Required RPC acceptance contract

1. Authenticated route checks origin and verifies the actual Supabase Auth session. RPC receives only token hash and verified caller UUID, never a client-controlled target org.
2. Privileged RPC resolves confirmed email from auth.users; lock the matching invitation row SELECT ... FOR UPDATE. Validate pending state, expiry against current DB wall-clock after lock, exact normalized invited mailbox, and allowed invite role.
3. UPSERT organization_members using the locked invitation's organization ID and DB-side rank preserving the higher pre-existing role. Update invitation status accepted in that SAME transaction. If either write fails, roll back both. Return one stable receipt.
4. SECURITY DEFINER only if justified; fixed search_path='', qualified references, revoke default PUBLIC EXECUTE, deny anon and authenticated, grant service_role only. Prefer non-exposed schema when compatible. Verify grants after migration.
5. Serialize competing revoke/accept and accept/accept calls. Ensure a stale/revoked/expired invite cannot restore membership, and a failure cannot consume a valid invite without granting the member.
6. Make audit/notification idempotent; preserve legally approved receipt history without inventing obligations.

## Required real isolated DB tests

Two independent tenants, two projects each, owner/admin/analyst/viewer/reviewer/stakeholder/anonymous/stale session; wrong and unconfirmed mailbox; guessed IDs/tokens; replay; expiry while waiting on row lock; accept/revoke in both commit orders; accept/accept; FK failure rollback; existing owner never downgraded; prior accepted invitation with same address; RPC permission grants and fully scoped audit/notification.

Chat 05 owns the route cutover only after Chat 01 supplies the transactionally tested RPC. Do not merge/deploy the current claim-before-upsert mitigation as proof of full invitation lifecycle acceptance.