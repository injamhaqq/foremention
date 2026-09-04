import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildScrapeGraphContactRequest,
  extractScrapeGraphContactCandidates,
} from "../lib/acquisition-contact-scrapegraph-contract.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const retrievedAt = "2026-09-04T11:00:00.000Z";

test("contact search is company-domain bounded and requests only public business routes", () => {
  const request = buildScrapeGraphContactRequest({ companyName: "Example", domain: "example.com", maxResults: 3 });
  assert.equal(request.numResults, 3);
  assert.match(request.query, /example\.com/);
  assert.match(request.prompt, /public business/i);
  assert.match(request.prompt, /company-domain/i);
  assert.match(request.prompt, /sourceUrl/i);
});

test("extracted contacts must cite a URL returned by the same provider response", () => {
  const payload = {
    status: "success",
    data: {
      results: [{ url: "https://example.com/team" }],
      json_data: {
        contacts: [{
          fullName: "Sam Rivera",
          jobTitle: "VP Marketing",
          email: "sam@example.com",
          sourceUrl: "https://example.com/team",
          confidence: 93,
        }],
      },
    },
  };
  const contacts = extractScrapeGraphContactCandidates(payload, "example.com", retrievedAt);
  assert.equal(contacts[0].email, "sam@example.com");
});

test("provider source mismatch fails closed", () => {
  const payload = {
    status: "success",
    data: {
      results: [{ url: "https://example.com/team" }],
      json: { contacts: [{ fullName: "Sam Rivera", jobTitle: "VP Marketing", email: "sam@example.com", sourceUrl: "https://other.example.net/team", confidence: 93 }] },
    },
  };
  assert.throws(() => extractScrapeGraphContactCandidates(payload, "example.com", retrievedAt), /ACQUISITION_CONTACT_PROVIDER_SOURCE_MISMATCH/);
});

test("runtime adapter keeps provider key server-side and enforces pre-call budget", async () => {
  const source = await text("lib/acquisition-contact-scrapegraph.ts");
  assert.match(source, /SGAI_API_KEY/);
  assert.match(source, /ACQUISITION_CONTACT_BUDGET_EXHAUSTED_BEFORE_PROVIDER_CALL/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SGAI|localStorage|document\./);
});
