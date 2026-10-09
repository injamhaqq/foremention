import assert from "node:assert/strict";
import test from "node:test";
import { assessObservedPagePresence } from "../lib/source-page-presence.ts";
import { inspectSourceUrl } from "../lib/source-inspection.ts";

const open = (overrides = {}) => ({
  access: "open",
  pageTitle: null,
  pageDescription: null,
  pageText: "Independent buyer's guide for teams",
  pageTextCoverage: "complete",
  ...overrides,
});

const inspect = (html, options = {}) => inspectSourceUrl("https://example.com", {
  fetcher: async () => new Response(html, {
    status: options.status ?? 200,
    headers: { "content-type": "text/html" },
  }),
  resolver: async () => ["93.184.216.34"],
  includePageText: true,
  ...(options.inspectOptions || {}),
});

test("fully inspected static text can support absence in the retrieved representation", () => {
  const result = assessObservedPagePresence(open(), "Acme", ["Contoso"]);
  assert.equal(result.pagePresenceState, "absent");
  assert.equal(result.fullTextCoverage, true);
  assert.deepEqual(result.competitorsPresent, []);
});

test("an observed positive mention remains present even on partial retrieval", () => {
  const result = assessObservedPagePresence(
    open({ access: "partial", pageText: "Acme and Contoso", pageTextCoverage: "partial" }),
    "Acme", ["Contoso"],
  );
  assert.equal(result.pagePresenceState, "present");
  assert.deepEqual(result.competitorsPresent, ["Contoso"]);
  assert.equal(result.fullTextCoverage, false);
});

test("partial response never proves a brand absent", () => {
  const result = assessObservedPagePresence(open({ access: "partial", pageTextCoverage: "partial" }), "Acme");
  assert.equal(result.pagePresenceState, "unknown");
  assert.equal(result.clientPresent, false);
});

test("missing coverage attestation never proves absence even for matching text lengths", () => {
  for (const coverage of [undefined, "partial", "invalid"]) {
    const result = assessObservedPagePresence(
      open({ pageTextCoverage: coverage }), "Acme",
    );
    assert.equal(result.pagePresenceState, "unknown");
    assert.equal(result.fullTextCoverage, false);
  }
});

test("blocked or unknown retrieval never promotes supplied page metadata into an observation", () => {
  for (const access of ["blocked", "unknown"]) {
    const result = assessObservedPagePresence(
      open({ access, pageTitle: "Acme", pageText: "Acme" }),
      "Acme", ["Acme"],
    );
    assert.equal(result.pagePresenceState, "unknown");
    assert.deepEqual(result.competitorsPresent, []);
  }
});

test("missing page text does not prove absence even if erroneously attested complete", () => {
  assert.equal(assessObservedPagePresence(
    open({ pageText: undefined }), "Acme",
  ).pagePresenceState, "unknown");
});

test("title-only positive can be observed without implying full-page coverage", () => {
  const result = assessObservedPagePresence(
    open({ access: "partial", pageTitle: "Acme official guide", pageText: "Excerpt", pageTextCoverage: "partial" }),
    "Acme",
  );
  assert.equal(result.pagePresenceState, "present");
  assert.equal(result.fullTextCoverage, false);
});

test("actual static HTML inspection attests exact untruncated returned visible text", async () => {
  const result = await inspect("<html><body><h1>Independent guide</h1></body></html>");
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "complete");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "absent");
});

test("real boilerplate exclusion invalidates absent-from-page evidence", async () => {
  const result = await inspect("<html><body><nav>Acme</nav><main>Independent guide</main></body></html>");
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("real extracted-text truncation invalidates an absence assertion", async () => {
  const result = await inspect("<html><body>" + "Public content ".repeat(100) + "</body></html>", {
    inspectOptions: { maxExtractedTextChars: 1000 },
  });
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("real partial HTTP response never attests complete text", async () => {
  const result = await inspect("<html><body>Independent guide</body></html>", { status: 206 });
  assert.equal(result.access, "partial");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("real oversized visible-text cap is not mistaken for complete coverage", async () => {
  const result = await inspect("<html><body>" + "Public content ".repeat(6200) + "</body></html>", {
    inspectOptions: { maxBytes: 150000, maxExtractedTextChars: 40000 },
  });
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("plain text with angle-bracketed source terms cannot prove absence", async () => {
  const result = await inspectSourceUrl("https://example.com/readme.txt", {
    fetcher: async () => new Response("Comparison notes for <Acme> and other brands", {
      headers: { "content-type": "text/plain" },
    }),
    resolver: async () => ["93.184.216.34"],
    includePageText: true,
  });
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("blank but HTTP 200 static HTML is unknown, not absent", async () => {
  const result = await inspect("<html><body>   </body></html>");
  assert.equal(result.access, "open");
  assert.equal(result.pageText, "");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("JavaScript-only application shell is unknown, not evidence of brand absence", async () => {
  const result = await inspect("<html><body><div id=\"root\"></div><script>document.getElementById('root').textContent='Acme';</script></body></html>");
  assert.equal(result.access, "open");
  assert.equal(result.pageText, "");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("blank HTTP 200 plain text cannot support an absence finding", async () => {
  const result = await inspectSourceUrl("https://example.com/blank.txt", {
    fetcher: async () => new Response("   ", { headers: { "content-type": "text/plain" } }),
    resolver: async () => ["93.184.216.34"],
    includePageText: true,
  });
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("page title without readable body does not establish missing-brand evidence", async () => {
  const result = await inspect(
    "<html><head><title>Loading your dashboard</title></head><body><div id=\"root\"></div><script>document.querySelector('#root').textContent='Acme';</script></body></html>"
  );
  assert.equal(result.access, "open");
  assert.match(result.pageText, /Loading your dashboard/);
  assert.equal(result.pageTextCoverage, "partial");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "unknown");
});

test("meaningful static body text still permits bounded negative observation", async () => {
  const result = await inspect("<html><head><title>Welcome</title></head><body><main><p>A static article about reliable evidence collection.</p></main></body></html>");
  assert.equal(result.access, "open");
  assert.equal(result.pageTextCoverage, "complete");
  assert.equal(assessObservedPagePresence(result, "Acme").pagePresenceState, "absent");
});
