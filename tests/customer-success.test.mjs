import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("Customer Success stays inside Settings and does not create a sixth global object", async () => {
  const [page, navigation] = await Promise.all([
    text("app/app/settings/customer-success/page.tsx"),
    text("components/workspace-navigation.tsx"),
  ]);
  assert.match(page, /Settings · Customer Success/);
  assert.match(page, /requireViewer\("\/app\/settings\/customer-success"\)/);
  assert.match(page, /without turning Foremention into project-management software/);
  assert.doesNotMatch(navigation, /href: "\/app\/settings\/customer-success"/);
});

test("Customer Success mutations are role-gated, tenant-scoped, and protected against cross-site writes", async () => {
  const route = await text("app/api/customer-success/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/g);
  assert.match(route, /\["owner", "admin", "analyst"\]/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /viewer\.mode === "demo"/);
  assert.match(route, /fictional demo cannot create customer-success facts/i);
});

test("health, adoption, and renewal risk cannot be asserted without a written basis", async () => {
  const route = await text("app/api/customer-success/route.ts");
  assert.match(route, /A health score requires a written evidence basis/);
  assert.match(route, /A non-unknown adoption state requires a written evidence basis/);
  assert.match(route, /A non-unknown renewal risk requires a written evidence basis/);
  assert.match(route, /healthScore < 0 \|\| healthScore > 100/);
});

test("manual QBR and success reviews are prevented from becoming dollar ROI", async () => {
  const route = await text("app/api/customer-success/route.ts");
  assert.match(route, /Economic value is intentionally withheld from this manual endpoint/);
  assert.match(route, /economic_value_status: "not_demonstrated"/);
  assert.match(route, /economic_value_amount: null/);
  assert.match(route, /economic_value_currency: null/);
  assert.match(route, /health_score_snapshot/);
  assert.match(route, /renewal_risk_snapshot/);
});

test("the Customer Success UI covers the requested core lifecycle without fake customers", async () => {
  const component = await text("components/customer-success-settings.tsx");
  for (const phrase of ["Account goal", "Onboarding plan", "Ongoing success plan", "Champion", "Executive sponsor", "Activation", "Adoption", "Health score", "Renewal risk", "Next QBR", "Renewal date", "Expansion opportunity", "Advocate readiness", "Notification controls", "QBR & business-value review history"]) {
    assert.match(component, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
  assert.match(component, /No customer-success review has been recorded/);
  assert.match(component, /does not create sample QBRs or renewal outcomes/);
  assert.match(component, /Economic ROI remains unclaimed/);
});
