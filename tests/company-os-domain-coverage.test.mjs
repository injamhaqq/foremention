import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPANY_OS_DOMAIN_IDS,
  COMPANY_OS_DOMAINS,
  validateCompanyOsDomains,
} from "../lib/company-os/domains.ts";

test("company OS represents the whole company, not only agent infrastructure", () => {
  const result = validateCompanyOsDomains();
  assert.equal(result.valid, true);
  assert.equal(result.count, COMPANY_OS_DOMAIN_IDS.length);

  for (const required of [
    "product",
    "engineering",
    "security_trust",
    "sales",
    "customer_experience",
    "capital_fundraising",
    "finance",
    "legal_corporate_affairs",
    "people_talent",
    "distribution_influence_network",
    "resource_compute",
    "evolution",
    "enterprise_value_scale",
  ]) {
    assert.ok(COMPANY_OS_DOMAIN_IDS.includes(required));
  }
});

test("funding OS includes more than investor outreach", () => {
  const capital = COMPANY_OS_DOMAINS.find((domain) => domain.id === "capital_fundraising");
  for (const capability of [
    "funding_radar",
    "investor_research",
    "accelerators",
    "fellowships",
    "grants",
    "competitions",
    "startup_credits",
    "application_factory",
  ]) {
    assert.ok(capital?.coreCapabilities.includes(capability));
  }
});

test("company intelligence explicitly searches for unknown missing capabilities", () => {
  const intelligence = COMPANY_OS_DOMAINS.find(
    (domain) => domain.id === "knowledge_quality_company_intelligence",
  );
  assert.ok(intelligence?.coreCapabilities.includes("coverage_auditor"));
  assert.ok(intelligence?.coreCapabilities.includes("unknown_unknown_engine"));
});

test("distribution is a first-class OS domain", () => {
  const distribution = COMPANY_OS_DOMAINS.find(
    (domain) => domain.id === "distribution_influence_network",
  );
  for (const capability of [
    "founder_brand",
    "corporate_social",
    "social_listening",
    "community",
    "media_pr",
    "analyst_relations",
    "podcasts",
    "events",
    "relationship_graph",
  ]) {
    assert.ok(distribution?.coreCapabilities.includes(capability));
  }
});
