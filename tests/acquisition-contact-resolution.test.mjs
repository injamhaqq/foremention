import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeAcquisitionContactCandidates,
  selectBestAcquisitionContact,
} from "../lib/acquisition-contact-resolution.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const retrievedAt = "2026-09-04T11:00:00.000Z";

test("accepts only public HTTPS company-domain business contact routes", () => {
  const contacts = normalizeAcquisitionContactCandidates([
    {
      fullName: "Sam Rivera",
      jobTitle: "VP Marketing",
      email: "sam@example.com",
      sourceUrl: "https://example.com/company/team",
      retrievedAt,
      confidence: 94,
    },
  ], "example.com");
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].email, "sam@example.com");
  assert.equal(contacts[0].buyerRole, "economic_buyer");
});

test("rejects personal/free-mail and cross-company email routes", () => {
  for (const email of ["sam@gmail.com", "sam@other-company.com"]) {
    assert.throws(
      () => normalizeAcquisitionContactCandidates([{
        fullName: "Sam Rivera",
        jobTitle: "VP Marketing",
        email,
        sourceUrl: "https://example.com/team",
        retrievedAt,
        confidence: 90,
      }], "example.com"),
      /ACQUISITION_CONTACT_ROUTE_DOMAIN_MISMATCH/,
    );
  }
});

test("selects economic buyer before champion when evidence confidence is comparable", () => {
  const contacts = normalizeAcquisitionContactCandidates([
    { fullName: "Alex Kim", jobTitle: "Head of SEO", email: "alex@example.com", sourceUrl: "https://example.com/team", retrievedAt, confidence: 96 },
    { fullName: "Sam Rivera", jobTitle: "VP Marketing", email: "sam@example.com", sourceUrl: "https://example.com/team", retrievedAt, confidence: 90 },
  ], "example.com");
  assert.equal(selectBestAcquisitionContact(contacts)?.email, "sam@example.com");
});

test("fails closed for roles outside the initial buyer/champion hypothesis", () => {
  assert.throws(
    () => normalizeAcquisitionContactCandidates([{
      fullName: "Taylor Lee",
      jobTitle: "Software Engineer",
      email: "taylor@example.com",
      sourceUrl: "https://example.com/team",
      retrievedAt,
      confidence: 98,
    }], "example.com"),
    /ACQUISITION_CONTACT_ROLE_OUTSIDE_INITIAL_HYPOTHESIS/,
  );
});

test("outreach control schema dedupes source-backed contacts by account + normalized email", async () => {
  const migration = await text("supabase/migrations/20260904000200_acquisition_outreach_control.sql");
  assert.match(migration, /create unique index if not exists commercial_contacts_account_email_unique/i);
  assert.match(migration, /on public\.commercial_contacts \(account_id, lower\(email\)\)/i);
  assert.match(migration, /where email is not null/i);
});
