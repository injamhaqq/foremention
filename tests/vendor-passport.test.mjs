import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildVendorPassport, classifyPassportClaim, serializeVendorPassport } from "../lib/vendor-passport.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const GENERATED_AT = "2026-08-05T00:00:00.000Z";
const NOW = new Date(GENERATED_AT).getTime();

const organization = { name: "Northstar HR", website: "https://northstarhr.example", category: "HR software for distributed teams" };
const goodClaim = {
  id: "00000000-0000-4000-8000-000000000001",
  approvedWording: "Northstar HR supports payroll in 14 countries.",
  limitations: "Accurate as of the linked documentation page.",
  publicUse: true,
  claimVerificationStatus: "verified",
  verifiedAt: "2026-08-01T00:00:00.000Z",
  expiresAt: null,
  evidenceUrl: "https://northstarhr.example/docs/payroll-countries",
  evidenceTitle: "Payroll country coverage",
  evidenceUsageRights: "Owned first-party documentation.",
  evidenceVerificationStatus: "verified",
};

const build = (claims) => buildVendorPassport({ organization, claims, generatedAt: GENERATED_AT });

test("a verified, publicly approved claim is published with its citation", () => {
  const passport = build([goodClaim]);
  assert.equal(passport.included, 1);
  assert.equal(passport.excluded.length, 0);
  const [claim] = passport.document.subjectOf;
  assert.equal(claim.text, goodClaim.approvedWording);
  assert.equal(claim.citation.url, goodClaim.evidenceUrl);
  assert.equal(claim.citation.usageInfo, goodClaim.evidenceUsageRights);
  assert.equal(claim.dateCreated, goodClaim.verifiedAt);
});

test("every ineligible claim is withheld with a truthful reason", () => {
  const cases = [
    [{ ...goodClaim, publicUse: false }, "not_approved_for_public_use"],
    [{ ...goodClaim, claimVerificationStatus: "disputed" }, "not_verified"],
    [{ ...goodClaim, verifiedAt: null }, "not_verified"],
    [{ ...goodClaim, verifiedAt: "not-a-date" }, "not_verified"],
    [{ ...goodClaim, expiresAt: "not-a-date" }, "not_verified"],
    [{ ...goodClaim, approvedWording: "   " }, "not_verified"],
    [{ ...goodClaim, evidenceVerificationStatus: "unverified" }, "not_verified"],
    [{ ...goodClaim, expiresAt: "2026-08-04T00:00:00.000Z" }, "expired"],
    [{ ...goodClaim, evidenceUrl: null }, "missing_evidence"],
    [{ ...goodClaim, evidenceUsageRights: "  " }, "missing_evidence"],
  ];
  for (const [claim, reason] of cases) {
    assert.equal(classifyPassportClaim(claim, NOW), reason);
    const passport = build([claim]);
    assert.equal(passport.included, 0, `${reason} must not publish`);
    assert.equal(passport.excluded[0].reason, reason);
  }
});

test("an approved outcome promise is still refused", () => {
  const promises = [
    "ChatGPT will recommend Northstar HR to buyers.",
    "We guarantee more traffic within 30 days.",
    "Northstar HR ranks #1 for HR software.",
    "Our platform increases revenue for every customer.",
    "ChatGPT recommends Northstar HR to every HR buyer.",
    "Northstar HR doubles leads for every customer.",
  ];
  for (const approvedWording of promises) {
    const passport = build([{ ...goodClaim, approvedWording }]);
    assert.equal(passport.included, 0, `must refuse: ${approvedWording}`);
    assert.equal(passport.excluded[0].reason, "unsupported_outcome_claim");
  }
});

test("missing company facts are reported as unverified rather than invented", () => {
  const passport = buildVendorPassport({
    organization: { name: "", website: null, category: null },
    claims: [],
    generatedAt: GENERATED_AT,
  });
  assert.deepEqual(passport.unverifiedFields, ["name", "url", "category", "verifiedStatements"]);
  assert.equal(passport.document.name, undefined);
  assert.equal(passport.document.url, undefined);
  assert.equal(passport.document.description, undefined);
  assert.deepEqual(passport.document.subjectOf, []);
});

test("a non-http website is treated as unverified, not published", () => {
  const passport = buildVendorPassport({
    organization: { ...organization, website: "javascript:alert(1)" },
    claims: [goodClaim],
    generatedAt: GENERATED_AT,
  });
  assert.equal(passport.document.url, undefined);
  assert.ok(passport.unverifiedFields.includes("url"));
});

test("URLs carrying credentials are withheld instead of leaking them", () => {
  const passport = buildVendorPassport({
    organization: { ...organization, website: "https://user:secret@northstarhr.example" },
    claims: [{ ...goodClaim, evidenceUrl: "https://user:secret@northstarhr.example/proof" }],
    generatedAt: GENERATED_AT,
  });
  assert.equal(passport.document.url, undefined);
  assert.equal(passport.included, 0);
  assert.equal(passport.excluded[0].reason, "missing_evidence");
});

test("the record carries provenance and an explicit non-promise boundary", () => {
  const provenance = build([goodClaim]).document["foremention:provenance"];
  assert.equal(provenance.verifiedStatementCount, 1);
  assert.equal(provenance.generatedAt, GENERATED_AT);
  assert.deepEqual(provenance.publisherSuppliedFields, ["name", "url", "description"]);
  assert.match(provenance.boundary, /publisher-supplied workspace context/);
  assert.match(provenance.boundary, /does not assert rankings, citations, traffic, leads, or revenue/);
  assert.match(provenance.boundary, /does not claim any AI provider will recommend/);
});

test("passport generation is deterministic and order-independent", () => {
  const second = { ...goodClaim, id: "00000000-0000-4000-8000-000000000002", approvedWording: "Northstar HR is SOC 2 Type II audited." };
  const forward = serializeVendorPassport(build([goodClaim, second]));
  const reversed = serializeVendorPassport(build([second, goodClaim]));
  assert.equal(forward, reversed);
  assert.equal(forward, serializeVendorPassport(build([goodClaim, second])));
});

test("serialized JSON-LD cannot break out of its script element", () => {
  const unsafe = { ...goodClaim, approvedWording: "Documented support </script><script>alert(1)</script> & maintenance." };
  const serialized = serializeVendorPassport(build([unsafe]));
  assert.doesNotMatch(serialized, /<\/script>|<script>|&/i);
  assert.match(serialized, /\\u003c\/script\\u003e/);
  assert.equal(JSON.parse(serialized).subjectOf[0].text, unsafe.approvedWording);
});

test("an invalid generation timestamp is rejected instead of creating false provenance", () => {
  assert.throws(() => buildVendorPassport({ organization, claims: [goodClaim], generatedAt: "not-a-date" }), /valid generation timestamp/i);
});

test("the passport page is tenant-scoped, demo-isolated, and never self-publishes", async () => {
  const [page, panel, navigation] = await Promise.all([
    text("app/app/passport/page.tsx"),
    text("components/vendor-passport-panel.tsx"),
    text("components/workspace-navigation.tsx"),
  ]);
  assert.match(page, /requireViewer\("\/app\/passport"\)/);
  assert.match(page, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(page, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(page, /verification_status/);
  assert.match(page, /viewer\.mode === "demo"/);
  assert.match(page, /your team publishes it on a domain you control/);
  assert.doesNotMatch(page, /inngest|getProvider\(|service_role|serviceRole/);
  assert.doesNotMatch(panel, /fetch\(|supabase/i);
  assert.match(navigation, /\/app\/passport/);
});
