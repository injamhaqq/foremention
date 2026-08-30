import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const migrationPath = "supabase/migrations/20260830000300_enterprise_security_governance.sql";
const expectedFiles = [
  migrationPath,
  "lib/enterprise-governance.ts",
  "lib/trust-capabilities.ts",
  "app/trust/page.tsx",
  "docs/billion-dollar-build/06-enterprise-security-governance.md",
  "docs/enterprise-procurement-package.md",
];

test("enterprise governance release includes the required control-plane artifacts", () => {
  for (const path of expectedFiles) assert.equal(existsSync(new URL(path, root)), true, `${path} must exist`);
});

test("enterprise database control plane is tenant-scoped, fail-closed, RLS protected, and audit events are immutable", async () => {
  const sql = await read(migrationPath);
  for (const relation of [
    "organization_security_settings",
    "organization_domains",
    "organization_permission_overrides",
    "service_accounts",
    "scim_connections",
    "audit_events",
    "data_governance_settings",
    "data_governance_requests",
  ]) {
    assert.match(sql, new RegExp(`create table (?:if not exists )?public\\.${relation}`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.${relation} enable row level security`, "i"));
  }
  assert.match(sql, /verification_status[^\n]+pending/i);
  assert.match(sql, /scim_connections[\s\S]+unconfigured/i);
  assert.match(sql, /service_accounts[\s\S]+disabled/i);
  assert.match(sql, /data_residency_region text/i);
  assert.match(sql, /create or replace function public\.has_org_permission/i);
  assert.match(sql, /create or replace function public\.append_audit_event/i);
  assert.match(sql, /raise exception 'audit events are immutable'/i);
  assert.match(sql, /revoke all on public\.audit_events from anon, authenticated/i);
  assert.match(sql, /grant select on public\.audit_events to authenticated/i);
  assert.match(sql, /grant insert on public\.audit_events to service_role/i);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]*audit_events to authenticated/i);
});

test("authorization vocabulary is explicit and deny-by-default for unknown permissions", async () => {
  const governance = await read("lib/enterprise-governance.ts");
  for (const permission of [
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
  ]) assert.match(governance, new RegExp(permission.replace(".", "\\.")));
  assert.match(governance, /return false;/);
  assert.match(governance, /owner/);
  assert.match(governance, /analyst/);
  assert.match(governance, /viewer/);
});

test("SSO and SCIM cannot be represented as active from code presence alone", async () => {
  const sso = await read("lib/enterprise-sso.ts");
  const governance = await read("lib/enterprise-governance.ts");
  assert.match(sso, /SSO is not configured\./);
  assert.match(sso, /configuredSsoDomains\(\)\.length > 0/);
  assert.match(governance, /scim.*unconfigured/i);
  assert.match(governance, /serviceAccounts.*disabled/i);
});

test("trust capability manifest explicitly prevents unsupported enterprise claims", async () => {
  const trust = await read("lib/trust-capabilities.ts");
  for (const unavailable of ["SOC 2", "ISO 27001", "SCIM", "Contractual SLA", "Data residency guarantee"]) {
    assert.match(trust, new RegExp(unavailable, "i"));
  }
  assert.match(trust, /status: "unavailable"/);
  assert.match(trust, /certification: false/);
  assert.match(trust, /human review/i);
  assert.match(trust, /tenant isolation/i);
});

test("public trust center separates implemented controls from unavailable assurances", async () => {
  const page = await read("app/trust/page.tsx");
  for (const phrase of [
    "Security architecture",
    "Tenant isolation",
    "Human review",
    "Data deletion and export",
    "Provider handling",
    "Subprocessors",
    "Responsible disclosure",
    "Unavailable today",
  ]) assert.match(page, new RegExp(phrase, "i"));
  assert.match(page, /not a compliance certification/i);
});

test("procurement package is maintained as evidence-backed readiness, not invented legal fact", async () => {
  const [buildDoc, procurement] = await Promise.all([
    read("docs/billion-dollar-build/06-enterprise-security-governance.md"),
    read("docs/enterprise-procurement-package.md"),
  ]);
  for (const section of [
    "Threat model",
    "Asset inventory",
    "Risk register",
    "PII inventory",
    "Data lineage",
    "Retention",
    "Incident response",
    "Backup",
    "Disaster recovery",
  ]) assert.match(buildDoc, new RegExp(section, "i"));
  for (const section of [
    "Security questionnaire",
    "Architecture overview",
    "Data-flow",
    "Subprocessor",
    "DPA readiness",
    "MSA readiness",
    "SLA framework",
    "Vendor-risk evidence",
  ]) assert.match(procurement, new RegExp(section, "i"));
  assert.match(procurement, /not legal advice/i);
  assert.match(procurement, /not currently certified/i);
});
