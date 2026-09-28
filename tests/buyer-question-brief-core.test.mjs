import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildBuyerQuestionBrief,
  canonicalBriefCitation,
  containsLiteralCompetitorName,
} from "../lib/buyer-question-brief-core.ts";

const run = { id: "run-1", status: "complete", created_at: "2026-09-27T12:00:00Z", methodology_version: "3.0" };
const answer = (overrides = {}) => ({
  run_id: "run-1", prompt_key: "comparison", prompt_text: "Best platform for verified B2B source research?",
  provider: "test-provider", model: "test-model", review_status: "verified",
  answer_text: "Alpha is one option; check its documentation.", brand_present: false,
  citations_json: [{ url: "https://research.example/compared/#fragment" }], ...overrides,
});
const competitor = [{ id: "alpha", name: "Alpha", active: true }, { id: "sap", name: "SAP", active: true }];
const source = [{ url: "https://research.example/compared/", reviewedAt: "2026-09-27", clientPresent: false, competitors: ["Alpha"] }];
const runBrief = (overrides = {}) => buildBuyerQuestionBrief({ run, verifiedAnswers: [answer()], competitors: competitor, reviewedSources: source, ...overrides });

test("verified answer and same-run human-reviewed cited page produce inspectable—not causal—candidate", () => {
  const result = runBrief();
  assert.equal(result.state, "available");
  assert.equal(result.verifiedAnswerSlots, 1);
  assert.equal(result.questions.length, 1);
  const q = result.questions[0];
  assert.equal(q.attention, "reviewed_source_to_inspect");
  assert.deepEqual(q.competitorNameCandidates, [{ name: "Alpha", observedAnswerSlots: 1 }]);
  assert.equal(q.reviewedCitationGaps[0].url, "https://research.example/compared");
  assert.equal(q.reviewedCitationGaps[0].reviewBasis, "human_reviewed_cited_page");
  assert.match(result.limitation, /not market share/);
});

test("unreviewed, wrong-page, competitor-mismatch, and customer-present answers cannot become reviewed page gaps", () => {
  assert.equal(runBrief({ reviewedSources: [{ ...source[0], reviewedAt: null }] }).questions[0].attention, "candidate_answer_gap");
  assert.equal(runBrief({ reviewedSources: [{ ...source[0], url: "https://other.example/compared" }] }).questions[0].reviewedCitationGaps.length, 0);
  assert.equal(runBrief({ reviewedSources: [{ ...source[0], competitors: ["SAP"] }] }).questions[0].reviewedCitationGaps.length, 0);
  const present = runBrief({ verifiedAnswers: [answer({ brand_present: true })] }).questions[0];
  assert.equal(present.customerPresent, 1);
  assert.equal(present.reviewedCitationGaps.length, 0);
  assert.equal(present.attention, "observation_only");
});

test("missing citations produce no fabricated page evidence", () => {
  const q = runBrief({ verifiedAnswers: [answer({ citations_json: [] })] }).questions[0];
  assert.equal(q.returnedCitationUrls, 0);
  assert.equal(q.reviewedCitationGaps.length, 0);
  assert.equal(q.attention, "candidate_answer_gap");
});

test("literal-name candidates require exact Unicode word boundaries, never substrings", () => {
  assert.equal(containsLiteralCompetitorName("We received this ASAP", "SAP"), false);
  assert.equal(containsLiteralCompetitorName("SAP is compared", "SAP"), true);
  assert.equal(containsLiteralCompetitorName("Notionable isn't a brand", "Notion"), false);
  assert.equal(containsLiteralCompetitorName("The reviewer considered C++ today", "C++"), true);
  assert.equal(containsLiteralCompetitorName("The brand is Acme   Cloud", "Acme Cloud"), true);
  assert.equal(containsLiteralCompetitorName("আমরা বাংলা পণ্য", "বাংলা"), true);
});

test("malformed, credential-bearing, private loopback and non-web URLs cannot be rendered", () => {
  for (const url of ["javascript:alert(1)", "file:///etc/secret", "https://user:pass@example.com/", "http://localhost:8080/", "https://127.0.0.1/", "http://[::1]/"]) {
    assert.equal(canonicalBriefCitation(url), null);
  }
  assert.equal(canonicalBriefCitation("https://RESEARCH.EXAMPLE/compared/#fragment"), "https://research.example/compared");
  const q = runBrief({ verifiedAnswers: [answer({ citations_json: [{ url: "javascript:alert(1)" }] })] }).questions[0];
  assert.equal(q.returnedCitationUrls, 0);
});

test("cross-run, unverified, duplicate, missing-model and conflicting question provenance fail closed", () => {
  assert.equal(runBrief({ verifiedAnswers: [answer({ review_status: "pending" })] }).state, "withheld");
  assert.equal(runBrief({ verifiedAnswers: [answer({ run_id: "other-tenant-run" })] }).state, "withheld");
  assert.equal(runBrief({ verifiedAnswers: [answer(), answer()] }).state, "withheld");
  assert.equal(runBrief({ verifiedAnswers: [answer(), answer({ model: "alternate-model", prompt_text: "Other question" })] }).state, "withheld");
  assert.equal(runBrief({ verifiedAnswers: [answer({ model: null })] }).state, "withheld");
  assert.equal(runBrief({ competitors: [competitor[0], { ...competitor[0], id: "conflict" }] }).state, "withheld");
});

test("demo, unfinished run, absent answer, over-limit and conflicting source reviews fail safe", () => {
  assert.equal(runBrief({ fictional: true }).state, "fictional");
  assert.equal(runBrief({ run: { ...run, status: "review" } }).state, "withheld");
  assert.equal(runBrief({ verifiedAnswers: [] }).state, "empty");
  assert.equal(runBrief({ verifiedAnswers: Array.from({ length: 501 }, (_, i) => answer({ prompt_key: "key-" + i })) }).state, "withheld");
  assert.equal(runBrief({ reviewedSources: [source[0], source[0]] }).state, "withheld");
});

test("unknown brand state and repeated identical URLs cannot fabricate or double-count gaps", () => {
  const unknown = runBrief({ verifiedAnswers: [answer({ brand_present: null })] }).questions[0];
  assert.equal(unknown.attention, "undetermined");
  assert.equal(unknown.customerAbsent, 0);
  assert.equal(unknown.reviewedCitationGaps.length, 0);
  const duplicateCitations = runBrief({ verifiedAnswers: [answer({ citations_json: [answer().citations_json[0], answer().citations_json[0]] })] }).questions[0];
  assert.equal(duplicateCitations.returnedCitationUrls, 1);
  assert.equal(duplicateCitations.reviewedCitationGaps[0].observationCount, 1);
});

test("five real question slots yield five records without synthesizing extra observations", () => {
  const answers = Array.from({ length: 5 }, (_, i) => answer({ prompt_key: "q" + i, prompt_text: "Buyer question " + (i + 1) + "?" }));
  const result = runBrief({ verifiedAnswers: answers });
  assert.equal(result.state, "available");
  assert.equal(result.questions.length, 5);
  assert.equal(result.verifiedAnswerSlots, 5);
  assert.equal(result.questions.reduce((n,q) => n + q.reviewedCitationGaps.length, 0), 5);
});

test("private loader enforces scoped read-only, no service bypass, demo isolation and UI placement", async () => {
  const [loader, page, panel] = await Promise.all([
    readFile(new URL("../lib/buyer-question-brief.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/app/competitors/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/buyer-question-brief.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(loader, /viewer\.mode === "demo"/);
  assert.match(loader, /viewer\.accessToken/);
  assert.match(loader, /organization_id=eq\./);
  assert.match(loader, /project_id=eq\./);
  assert.match(loader, /review_status=eq\.verified/);
  assert.match(loader, /limit=501/);
  assert.match(loader, /loadTruthfulSourceMap\(viewer, \{ runId: run\.id \}\)/);
  assert.doesNotMatch(loader, /serviceRole:\s*true|method:\s*["'](?:POST|PATCH|DELETE)["']|fetch\(["']https?:/);
  assert.match(page, /loadBuyerQuestionBrief\(viewer\)/);
  assert.match(page, /BuyerQuestionBriefPanel brief=\{brief\}/);
  assert.match(panel, /not a cross-run trend|Not a cross-run trend/);
  assert.match(panel, /noopener noreferrer/);
});
