export type ForementionPackage = "private_beta" | "core" | "signal" | "intelligence" | "custom";

export type EntitlementKey =
  | "recurring_measurement"
  | "record_sharing"
  | "team_collaboration"
  | "multi_project"
  | "category_benchmarks"
  | "enterprise_sso"
  | "advanced_exports"
  | "api_access";

export type OrganizationEntitlement = {
  status?: string | null;
  packageKey?: ForementionPackage | null;
  featureKeys?: string[] | null;
  expiresAt?: string | null;
};

const PACKAGE_CAPABILITIES: Record<ForementionPackage, ReadonlySet<EntitlementKey>> = {
  private_beta: new Set(["recurring_measurement", "record_sharing", "team_collaboration", "advanced_exports"]),
  core: new Set(["recurring_measurement", "record_sharing", "team_collaboration", "advanced_exports"]),
  signal: new Set(["recurring_measurement", "record_sharing", "team_collaboration", "multi_project", "category_benchmarks", "advanced_exports"]),
  intelligence: new Set(["recurring_measurement", "record_sharing", "team_collaboration", "multi_project", "category_benchmarks", "enterprise_sso", "advanced_exports", "api_access"]),
  custom: new Set(["recurring_measurement", "record_sharing", "team_collaboration", "multi_project", "category_benchmarks", "enterprise_sso", "advanced_exports", "api_access"]),
};

export function hasEntitlement(entitlement: OrganizationEntitlement | null | undefined, key: EntitlementKey, now = new Date()) {
  if (!entitlement) return false;
  if (entitlement.status && entitlement.status !== "active") return false;
  if (entitlement.expiresAt) {
    const expiry = new Date(entitlement.expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry <= now) return false;
  }
  const featureKeys = new Set((entitlement.featureKeys || []).filter((value): value is EntitlementKey => value in {
    recurring_measurement: true,
    record_sharing: true,
    team_collaboration: true,
    multi_project: true,
    category_benchmarks: true,
    enterprise_sso: true,
    advanced_exports: true,
    api_access: true,
  }));
  if (featureKeys.has(key)) return true;
  const packageKey = entitlement.packageKey || "private_beta";
  return PACKAGE_CAPABILITIES[packageKey]?.has(key) || false;
}

export function packageCapabilities(packageKey: ForementionPackage) {
  return Array.from(PACKAGE_CAPABILITIES[packageKey]);
}
