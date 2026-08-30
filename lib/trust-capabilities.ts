export type TrustCapabilityStatus = "implemented" | "configuration_required" | "architecture_ready" | "unavailable";

export type TrustCapability = {
  name: string;
  status: TrustCapabilityStatus;
  certification: boolean;
  summary: string;
  evidence: readonly string[];
};

/**
 * Canonical claim boundary for enterprise/security surfaces. Public pages and
 * procurement material should describe a control more strongly only after this
 * manifest and its cited implementation evidence are deliberately updated.
 */
export const trustCapabilities: readonly TrustCapability[] = [
  {
    name: "Tenant isolation",
    status: "implemented",
    certification: false,
    summary: "Organization-scoped access is protected by PostgreSQL row-level security and tenant-relation integrity controls.",
    evidence: ["Supabase RLS migrations", "organization membership policies", "tenant relation integrity migration"],
  },
  {
    name: "Human review",
    status: "implemented",
    certification: false,
    summary: "Evidence review and Recommendation Record publication remain explicit workflow boundaries rather than autonomous external publication.",
    evidence: ["evidence review states", "Recommendation Record workflow", "review truth migration"],
  },
  {
    name: "Data deletion and export controls",
    status: "implemented",
    certification: false,
    summary: "Owner-controlled export and delayed deletion architecture exists, including non-identifying deletion receipts.",
    evidence: ["GDPR deletion migration", "data export routes", "enterprise governance audit vocabulary"],
  },
  {
    name: "Enterprise SSO",
    status: "configuration_required",
    certification: false,
    summary: "The SSO path fails closed and is available only for explicitly configured domains and authentication infrastructure.",
    evidence: ["lib/enterprise-sso.ts", "SSO API route"],
  },
  {
    name: "Domain verification",
    status: "architecture_ready",
    certification: false,
    summary: "Tenant-scoped DNS verification state is modeled, but no domain is represented as verified until verification actually succeeds.",
    evidence: ["organization_domains governance table"],
  },
  {
    name: "Fine-grained permissions",
    status: "implemented",
    certification: false,
    summary: "Owner/analyst/viewer defaults are supplemented by tenant-scoped permission overrides with unknown permissions denied by default.",
    evidence: ["has_org_permission database function", "enterprise authorization vocabulary"],
  },
  {
    name: "Immutable audit trail",
    status: "implemented",
    certification: false,
    summary: "Tenant-scoped audit events are append-only for application actors and protected against updates and deletes.",
    evidence: ["audit_events table", "service-role-only append RPC", "immutability triggers"],
  },
  {
    name: "Service accounts",
    status: "architecture_ready",
    certification: false,
    summary: "Service-account principals, scopes and credential hashes are modeled disabled-by-default; issuance is not exposed as a self-serve feature.",
    evidence: ["service_accounts governance table", "organization security settings"],
  },
  {
    name: "SCIM",
    status: "unavailable",
    certification: false,
    summary: "SCIM connection state is modeled for future controlled provisioning, but automatic SCIM provisioning is not currently represented as available.",
    evidence: ["scim_connections governance table defaults to unconfigured"],
  },
  {
    name: "SOC 2",
    status: "unavailable",
    certification: false,
    summary: "Foremention does not currently claim SOC 2 certification or a completed SOC 2 examination.",
    evidence: ["public enterprise-readiness claim boundary"],
  },
  {
    name: "ISO 27001",
    status: "unavailable",
    certification: false,
    summary: "Foremention does not currently claim ISO 27001 certification.",
    evidence: ["public enterprise-readiness claim boundary"],
  },
  {
    name: "Contractual SLA",
    status: "unavailable",
    certification: false,
    summary: "No general contractual SLA is represented as active; service levels require an executed customer agreement.",
    evidence: ["procurement SLA framework"],
  },
  {
    name: "Data residency guarantee",
    status: "unavailable",
    certification: false,
    summary: "The governance model can record a future residency configuration, but Foremention does not currently promise a customer-selectable residency region.",
    evidence: ["data_governance_settings.data_residency_region", "subprocessor transparency page"],
  },
] as const;

export function trustCapabilitiesByStatus(status: TrustCapabilityStatus) {
  return trustCapabilities.filter((capability) => capability.status === status);
}

export function trustCapability(name: string) {
  return trustCapabilities.find((capability) => capability.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
}
