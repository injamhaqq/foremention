import assert from "node:assert/strict";
import test from "node:test";
import {
  ACQUISITION_DISCOVERY_MAX_CANDIDATES,
  ACQUISITION_DISCOVERY_MAX_CREDITS,
  canonicalAcquisitionCompanyKey,
  normalizeAcquisitionDomain,
  runAcquisitionDiscovery,
} from "../lib/acquisition-discovery.ts";

test("normalizes domains and produces database-compatible canonical company keys", () => {
  assert.equal(normalizeAcquisitionDomain("HTTPS://WWW.Example.COM/path"), "example.com");
  assert.equal(canonicalAcquisitionCompanyKey("Example, Inc.", "www.example.com"), "domain-example.com");
  assert.equal(canonicalAcquisitionCompanyKey(" Example, Inc. ", null), "name-example-inc");
});

test("fails closed when no provider is configured", async () => {
  await assert.rejects(
    () => runAcquisitionDiscovery(null, { query: "growth-stage B2B SaaS" }),
    /ACQUISITION_DISCOVERY_PROVIDER_UNAVAILABLE/,
  );
});

test("caps provider budget and deterministically dedupes replayed companies", async () => {
  let providerInput;
  const provider = {
    id: "test-provider",
    async discover(input) {
      providerInput = input;
      return {
        creditsUsed: 2,
        candidates: [
          {
            companyName: "Example",
            domain: "https://www.example.com/about",
            sourceUrl: "https://example.com/about#team",
            retrievedAt: "2026-09-04T08:00:00Z",
            providerRequestId: "req-1",
          },
          {
            companyName: "Example Inc",
            domain: "example.com",
            sourceUrl: "https://example.com/pricing",
            retrievedAt: "2026-09-04T08:01:00Z",
            providerRequestId: "req-1",
          },
        ],
      };
    },
  };

  const result = await runAcquisitionDiscovery(provider, {
    query: "growth-stage B2B SaaS",
    maxCandidates: 999,
    maxCredits: 999,
  });

  assert.equal(providerInput.maxCandidates, ACQUISITION_DISCOVERY_MAX_CANDIDATES);
  assert.equal(providerInput.maxCredits, ACQUISITION_DISCOVERY_MAX_CREDITS);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].canonicalCompanyKey, "domain-example.com");
  assert.equal(result.candidates[0].sourceUrl, "https://example.com/about");
});

test("fails closed on missing provenance or malformed candidate identity", async () => {
  const provider = {
    id: "test-provider",
    async discover() {
      return {
        creditsUsed: 1,
        candidates: [
          {
            companyName: "Example",
            domain: "example.com",
            sourceUrl: "not-a-url",
            retrievedAt: "2026-09-04T08:00:00Z",
          },
        ],
      };
    },
  };

  await assert.rejects(
    () => runAcquisitionDiscovery(provider, { query: "B2B SaaS" }),
    /ACQUISITION_DISCOVERY_MALFORMED_CANDIDATE/,
  );
});

test("rejects non-HTTPS provenance because the research store requires HTTPS sources", async () => {
  const provider = {
    id: "test-provider",
    async discover() {
      return {
        creditsUsed: 1,
        candidates: [
          {
            companyName: "Example",
            domain: "example.com",
            sourceUrl: "http://example.com/about",
            retrievedAt: "2026-09-04T08:00:00Z",
          },
        ],
      };
    },
  };

  await assert.rejects(
    () => runAcquisitionDiscovery(provider, { query: "B2B SaaS" }),
    /ACQUISITION_DISCOVERY_MALFORMED_CANDIDATE/,
  );
});

test("fails closed when provider reports credit usage beyond the pre-call ceiling", async () => {
  const provider = {
    id: "test-provider",
    async discover({ maxCredits }) {
      return { creditsUsed: maxCredits + 1, candidates: [] };
    },
  };

  await assert.rejects(
    () => runAcquisitionDiscovery(provider, { query: "B2B SaaS", maxCredits: 3 }),
    /ACQUISITION_DISCOVERY_BUDGET_EXCEEDED/,
  );
});

test("discovery contract contains no send or lifecycle mutation capability", () => {
  const source = runAcquisitionDiscovery.toString();
  for (const forbidden of ["sendEmail", "sequence", "design_partner", "customer", "lifecycle"]) {
    assert.equal(source.includes(forbidden), false, `unexpected mutation capability: ${forbidden}`);
  }
});
