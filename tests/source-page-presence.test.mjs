import assert from "node:assert/strict";
import test from "node:test";
import { assessObservedPagePresence } from "../lib/source-page-presence.ts";

const open = (overrides = {}) => ({
  access: "open",
  pageTitle: null,
  pageDescription: null,
  pageText: "Independent buyer's guide for teams",
  contentLength: "Independent buyer's guide for teams".length,
  ...overrides,
});

test("complete bounded page text can support an absent-from-observation state", () => {
  const result = assessObservedPagePresence(open(), "Acme", ["Contoso"]);
  assert.equal(result.pagePresenceState, "absent");
  assert.equal(result.fullTextCoverage, true);
  assert.deepEqual(result.competitorsPresent, []);
});

test("observed positive mention remains present even when page inspection was partial", () => {
  const result = assessObservedPagePresence(
    open({ access: "partial", pageText: "Acme and Contoso", contentLength: 2000 }),
    "Acme", ["Contoso"],
  );
  assert.equal(result.pagePresenceState, "present");
  assert.deepEqual(result.competitorsPresent, ["Contoso"]);
  assert.equal(result.fullTextCoverage, false);
});

test("partial response never proves a brand absent", () => {
  const result = assessObservedPagePresence(open({ access: "partial" }), "Acme");
  assert.equal(result.pagePresenceState, "unknown");
  assert.equal(result.clientPresent, false);
});

test("bounded or boilerplate-stripped page text never proves absence", () => {
  const result = assessObservedPagePresence(open({ contentLength: 90000 }), "Acme");
  assert.equal(result.pagePresenceState, "unknown");
});

test("blocked or unknown retrieval never promotes supplied metadata into an observation", () => {
  for (const access of ["blocked", "unknown"]) {
    const result = assessObservedPagePresence(
      open({ access, pageTitle: "Acme", pageText: "Acme", contentLength: 4 }),
      "Acme", ["Acme"],
    );
    assert.equal(result.pagePresenceState, "unknown");
    assert.deepEqual(result.competitorsPresent, []);
  }
});

test("missing extracted text and malformed content length fail closed", () => {
  for (const contentLength of [undefined, -1, NaN, 1.5]) {
    assert.equal(assessObservedPagePresence(
      open({ pageText: undefined, contentLength }), "Acme",
    ).pagePresenceState, "unknown");
  }
});

test("a title-only positive may be observed without claiming page-wide coverage", () => {
  const result = assessObservedPagePresence(
    open({ access: "partial", pageTitle: "Acme official guide", pageText: "Excerpt", contentLength: 5000 }),
    "Acme",
  );
  assert.equal(result.pagePresenceState, "present");
  assert.equal(result.fullTextCoverage, false);
});
