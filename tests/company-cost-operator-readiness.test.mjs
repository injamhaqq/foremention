import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("only the existing trusted company operator can load and render cross-org cost data", async () => {
  const [page, loader, component] = await Promise.all([
    read("app/app/agents/page.tsx"),
    read("lib/company-operational-cost-readiness.ts"),
    read("components/company-operational-cost-card.tsx"),
  ]);
  assert.match(page, /viewer\.mode === "supabase" && isCompanyOperatorEmail\(viewer\.email\)/);
  assert.match(page, /companyOperator[\s\S]*loadCompanyOperationalCostReadiness\(\)/);
  assert.match(page, /\{companyOperator && <CompanyOperationalCostCard snapshot=\{costReadiness\} \/>\}/);
  assert.match(loader, /company_operational_cost_readiness\?select=\*&limit=1/);
  assert.match(loader, /serviceRole: true/);
  assert.doesNotMatch(component, /use client|fetch\(/i);
});

test("cost readiness must explicitly distinguish internal accounting from verified delivery cost", async () => {
  const component = await read("components/company-operational-cost-card.tsx");
  assert.match(component, /internal and automated-test provider traffic/);
  assert.match(component, /not invoiced expenditure or external customer value/);
  assert.match(component, /Verified all-in cost per decision/);
  assert.match(component, /=== null \? "Not verified"/);
  assert.match(component, /diagnostics are unavailable/);
  assert.match(component, /do not interpret unavailable total cost as zero/);
  assert.match(component, /value === null \|\| value === undefined/);
});

test("company view has explicit service-role-only read grants after default-privilege lockdown", async () => {
  const sql = await read("supabase/migrations/20260926081000_company_cost_view_read_grants.sql");
  assert.match(sql, /revoke all on table public\.company_operational_cost_readiness from service_role/);
  assert.match(sql, /grant select on table public\.company_operational_cost_readiness to service_role/);
  assert.match(sql, /revoke all on table public\.company_operational_cost_readiness from public, anon, authenticated/);
  assert.doesNotMatch(sql, /insert into|update public\.|delete from/i);
});
