import { supabaseRest } from "@/lib/supabase-rest";

export const ENTERPRISE_PERMISSIONS = [
  "org.read",
  "org.admin",
  "members.manage",
  "security.read",
  "security.manage",
  "audit.read",
  "data.export",
  "data.delete",
  "records.publish",
  "evidence.review",
] as const;

export type EnterprisePermission = typeof ENTERPRISE_PERMISSIONS[number];
export type OrganizationRole = "owner" | "analyst" | "viewer";
export type PermissionEffect = "allow" | "deny" | null;

const rolePermissions: Record<OrganizationRole, readonly EnterprisePermission[]> = {
  owner: ENTERPRISE_PERMISSIONS,
  analyst: ["org.read", "security.read", "records.publish", "evidence.review"],
  viewer: ["org.read"],
};

export function isEnterprisePermission(value: string): value is EnterprisePermission {
  return ENTERPRISE_PERMISSIONS.includes(value as EnterprisePermission);
}

/**
 * Application mirror of the database authorization vocabulary. Database RLS
 * remains authoritative; this helper is only for consistent server/UI gating.
 * Unknown permissions always fail closed.
 */
export function roleHasPermission(role: OrganizationRole, permission: string) {
  if (!isEnterprisePermission(permission)) return false;
  return rolePermissions[role].includes(permission);
}

export function resolveOrganizationPermission(input: {
  role: OrganizationRole;
  permission: string;
  override?: PermissionEffect;
}) {
  if (!isEnterprisePermission(input.permission)) return false;
  if (input.override === "deny") return false;
  if (input.override === "allow") return true;
  return roleHasPermission(input.role, input.permission);
}

export const enterpriseControlDefaults = {
  sso: "disabled",
  domainVerification: "pending",
  scim: "unconfigured",
  serviceAccounts: "disabled",
  ssoEnforced: false,
  scimEnabled: false,
  serviceAccountsEnabled: false,
  sessionMaxAgeMinutes: 480,
  inactivityTimeoutMinutes: 60,
  requireReauthenticationForSensitiveActions: true,
  benchmarkEligible: false,
  anonymizationRequired: true,
  customerContentTrainingAllowed: false,
  dataResidencyRegion: null,
} as const;

export type EnterpriseAuditCategory =
  | "authentication"
  | "administration"
  | "security"
  | "evidence"
  | "record"
  | "data"
  | "system";

export type EnterpriseAuditAction =
  | "auth.sign_in"
  | "auth.sign_out"
  | "auth.sign_out_all"
  | "member.provisioned"
  | "member.role_changed"
  | "member.deprovisioned"
  | "domain.verification_requested"
  | "domain.verified"
  | "security.settings_changed"
  | "sso.configuration_changed"
  | "scim.configuration_changed"
  | "service_account.created"
  | "service_account.revoked"
  | "evidence.reviewed"
  | "record.published"
  | "record.unpublished"
  | "data.export_requested"
  | "data.export_completed"
  | "data.deletion_requested"
  | "data.deletion_completed"
  | "permission.override_changed";

export type EnterpriseAuditEvent = {
  organizationId: string;
  category: EnterpriseAuditCategory;
  action: EnterpriseAuditAction;
  actor:
    | { type: "user"; userId: string }
    | { type: "service_account"; serviceAccountId: string }
    | { type: "system" };
  targetType?: string;
  targetId?: string;
  requestId?: string;
  ipHash?: string;
  userAgentHash?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

/**
 * Append an immutable enterprise audit event through the service-role-only RPC.
 * Callers pass hashes for IP/user-agent identifiers; raw network identifiers do
 * not belong in the durable audit table.
 */
export async function appendEnterpriseAuditEvent(event: EnterpriseAuditEvent) {
  const actorUserId = event.actor.type === "user" ? event.actor.userId : null;
  const actorServiceAccountId = event.actor.type === "service_account" ? event.actor.serviceAccountId : null;
  const rows = await supabaseRest<string[]>("rpc/append_audit_event", {
    method: "POST",
    serviceRole: true,
    body: {
      p_organization_id: event.organizationId,
      p_category: event.category,
      p_action: event.action,
      p_actor_type: event.actor.type,
      p_actor_user_id: actorUserId,
      p_actor_service_account_id: actorServiceAccountId,
      p_target_type: event.targetType ?? null,
      p_target_id: event.targetId ?? null,
      p_request_id: event.requestId ?? null,
      p_ip_hash: event.ipHash ?? null,
      p_user_agent_hash: event.userAgentHash ?? null,
      p_metadata: event.metadata ?? {},
      p_occurred_at: event.occurredAt ?? new Date().toISOString(),
    },
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export function normalizeWorkDomain(value: string) {
  const domain = value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain) ? domain : null;
}

export function sessionPolicyIsValid(input: { sessionMaxAgeMinutes: number; inactivityTimeoutMinutes: number }) {
  if (!Number.isInteger(input.sessionMaxAgeMinutes) || !Number.isInteger(input.inactivityTimeoutMinutes)) return false;
  if (input.sessionMaxAgeMinutes < 15 || input.sessionMaxAgeMinutes > 43_200) return false;
  if (input.inactivityTimeoutMinutes < 5 || input.inactivityTimeoutMinutes > 10_080) return false;
  return input.inactivityTimeoutMinutes <= input.sessionMaxAgeMinutes;
}
