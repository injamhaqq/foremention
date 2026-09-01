import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildResolutionProposal, compareResolutionRuns } from "../lib/resolution-engine.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const problem = {
  id: "00000000-0000-4000-8000-000000000010",
  title: "A reviewed comparison source names competitors but not the customer",
  nextAction: "Prepare a factual comparison update for review.",
  sourceId: "00000000-0000-4000-8000-000000000020",
  sourceTitle: "Reviewed category comparison",
  sourceUrl: "https://publisher.example/category-comparison",
};
const evidence = [{
  id: "00000000-0000-4000-8000-000000000030",
  kind: "source_observation",
  title: "Reviewed category comparison",
  url: "https://publisher.example/category-comparison",
  observedAt: "2026-08-04T00:00:00.000Z",
  provider: "gemini",
  model: "gemini-explicit-model",
  question: "Which category tool is best for a growing team?",
  excerpt: "A persisted, human-reviewed answer excerpt.",
  runId: "00000000-0000-4000-8000-000000000040",
  verification: "verified",
}];

test("resolution proposals are deterministic and keep an explicit evidence boundary", () => {
  const first = buildResolutionProposal({ type: "comparison_brief", problem, evidence });
  const second = buildResolutionProposal({ type: "comparison_brief", problem, evidence });
  assert.deepEqual(first, second);
  assert.equal(first.proposal.assetType, "comparison_brief");
  assert.deepEqual(first.proposal.draftSections[0].evidenceIds, [evidence[0].id]);
  assert.match(first.proposal.evidenceBoundary, /Do not add rankings, traffic, revenue/);
  assert.match(first.limitations.join(" "), /not proof.*caused/i);
});

test("controllable resolution plans separate the customer change surface from the output asset", () => {
  const plan = buildResolutionProposal({
    type: "source_page_brief",
    problem: { ...problem, title: "The customer loses a high-value recommendation because a required product capability is absent" },
    evidence,
    controlSurface: "product",
  });
  assert.equal(plan.proposal.assetType, "source_page_brief");
  assert.equal(plan.proposal.controlLevel, "controllable");
  assert.equal(plan.proposal.controlSurface, "product");
  assert.match(plan.proposal.objective, /product/i);
  assert.match(plan.proposal.nextStep, /owner|team|roadmap|implement/i);
  assert.match(plan.limitations.join(" "), /does not guarantee.*recommend/i);
});

test("the controllable layer supports the eight explicit customer-owned change surfaces", async () => {
  const engine = await text("lib/resolution-engine.ts");
  for (const surface of ["product", "pricing_offer", "positioning", "documentation", "product_feed", "website", "case_study", "policy"]) {
    assert.match(engine, new RegExp(`\\"${surface}\\"`));
  }
  assert.match(engine, /controlLevel:\s*"controllable"/);
  assert.doesNotMatch(engine, /guarantee(?:s|d)?[^\n]{0,80}(?:rank|recommend|#1)/i);
});

test("Resolution Center sends and preserves a selected controllable change surface", async () => {
  const [ui, route] = await Promise.all([
    text("components/resolution-center.tsx"),
    text("app/api/resolutions/route.ts"),
  ]);
  assert.match(ui, /controlSurface/);
  assert.match(ui, /Product/);
  assert.match(ui, /Pricing \/ offer/);
  assert.match(ui, /Case study \/ proof/);
  assert.match(ui, /action: "generate"[^\n]+controlSurface/);
  assert.match(route, /controlSurface/);
  assert.match(route, /buildResolutionProposal\(\{[^}]*controlSurface/s);
  assert.match(route, /customerEdited:\s*true[^}]*controlSurface/s);
});

test("automatic resolution generation refuses missing or unverified evidence", () => {
  assert.throws(() => buildResolutionProposal({ type: "faq_evidence_brief", problem, evidence: [] }), /requires reviewed workspace evidence/);
  assert.throws(() => buildResolutionProposal({ type: "source_page_brief", problem, evidence: [{ ...evidence[0], verification: "unverified" }] }), /requires reviewed workspace evidence/);
});

test("comparable follow-up records report deltas without causal attribution", () => {
  const outcome = compareResolutionRuns(
    { id: "baseline", brandPresencePct: 20, firstMentionPct: 10, citationCount: 4, newSourceCount: 1, completedAt: "2026-08-01T00:00:00Z" },
    { id: "follow-up", brandPresencePct: 40, firstMentionPct: 5, citationCount: 7, newSourceCount: 2, completedAt: "2026-08-08T00:00:00Z" },
  );
  assert.equal(outcome.brandPresencePct.delta, 20);
  assert.equal(outcome.firstMentionPct.delta, -5);
  assert.equal(outcome.citationCount.delta, 3);
  assert.match(outcome.interpretation, /does not establish.*caused/i);
});

test("resolution persistence is tenant-scoped, approval-gated, and evidence-verified", async () => {
  const [route, migration] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("supabase/migrations/20260804000100_resolution_engine.sql"),
  ]);
  assert.match(route, /loadWorkspaceContext/);
  assert.match(route, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(route, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(route, /review_status=eq\.verified/);
  assert.match(route, /verification_status=eq\.verified/);
  assert.match(route, /action === "generate"/);
  assert.match(route, /action === "remeasure"/);
  assert.match(route, /"approved", "changes_requested", "rejected"/);
  assert.match(route, /runRequest: \{ measurementId: followUp\.id, promptIds:/);
  assert.doesNotMatch(route, /inngest\.send|getProvider\(/);
  assert.match(migration, /resolution_assets_select_member/);
  assert.match(migration, /resolution_assets_insert_analyst/);
  assert.match(migration, /Resolution state transitions are forward-only/);
  assert.match(migration, /requires verified linked evidence before review/);
  assert.match(migration, /resolution_assets_opportunity_unique/);
  assert.match(migration, /current verified evidence items/);
  assert.match(migration, /reviewed observations from the same project and opportunity source/);
  assert.match(migration, /run\.project_id = asset\.project_id/);
  assert.match(migration, /Follow-up run must use the baseline providers/);
  assert.match(migration, /Follow-up run must use the baseline buyer questions/);
  assert.match(migration, /finalize_resolution_follow_up_after_run/);
  assert.match(migration, /array\['analyst'\]::public\.organization_role\[\]/);
});

test("terminal runs finalize attached comparable measurements on every execution path", async () => {
  const [reviewRoute, cancelRoute, job, helper] = await Promise.all([
    text("app/api/runs/[id]/review/route.ts"),
    text("app/api/runs/[id]/route.ts"),
    text("lib/jobs/inngest.ts"),
    text("lib/resolution-follow-ups.ts"),
  ]);
  assert.match(reviewRoute, /finalizeResolutionFollowUpsForRun/);
  assert.match(cancelRoute, /finalizeResolutionFollowUpsForRun/);
  assert.match(job, /finalizeResolutionFollowUpsForRun/);
  assert.match(helper, /status=eq\.queued/);
  assert.match(helper, /serviceRole: true/);
  assert.doesNotMatch(helper, /answer_text|prompt_text|provider_response/);
});

test("resolution mutations are origin-checked, role-gated, demo-isolated, and tolerate malformed bodies", async () => {
  const route = await text("app/api/resolutions/route.ts");
  assert.match(route, /isTrustedMutationOrigin\(request\)/);
  assert.match(route, /Only owners, admins, and analysts can create resolution work/);
  assert.match(route, /Only owners, admins, and analysts can change resolution work/);
  assert.match(route, /Only an owner or admin can decide a resolution review/);
  assert.match(route, /Only an owner or admin can mark an approved resolution applied/);
  assert.match(route, /unavailable in the fictional demo/);
  assert.match(route, /request\.json\(\)\.catch\(\(\) => \(\{\}\)\)/);
  assert.match(route, /uuid\.test\(problemId\)/);
  assert.match(route, /uuid\.test\(resolutionId\)/);
});

test("duplicate comparable measurements are prevented durably", async () => {
  const [route, migration] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("supabase/migrations/20260804000100_resolution_engine.sql"),
  ]);
  assert.match(migration, /resolution_follow_ups_one_active_idx/);
  assert.match(migration, /where status in \('requested','queued'\)/);
  assert.match(route, /status=in\.\(requested,queued\)/);
  assert.match(route, /idempotencyKey: `resolution:\$\{asset\.id\}:\$\{followUp\.id\}`/);
  assert.match(route, /uniqueViolation\(error\)/);
  assert.match(route, /status=in\.\(requested,queued\)/);
});

test("the UI requests remeasurement only through the governed run API", async () => {
  const ui = await text("components/resolution-center.tsx");
  assert.match(ui, /fetch\("\/api\/runs"/);
  assert.match(ui, /idempotency-key/);
  assert.match(ui, /runRequest\.idempotencyKey/);
  assert.doesNotMatch(ui, /supabase|service_role|api\.openai|generativelanguage|anthropic\.com/i);
  assert.match(ui, /canManage/);
  assert.match(ui, /role === "viewer"/);
});

test("comparable follow-ups reject stale runs and unproven model parity", async () => {
  const [route, migration] = await Promise.all([
    text("app/api/resolutions/route.ts"),
    text("supabase/migrations/20260804000100_resolution_engine.sql"),
  ]);
  assert.match(route, /new Date\(rerun\.created_at\)\.getTime\(\) < new Date\(followUp\.requested_at\)\.getTime\(\)/);
  assert.match(route, /durable follow-up request ID is required/);
  assert.match(migration, /follow_up_run\.created_at < new\.requested_at/);
  assert.match(migration, /select distinct provider, coalesce\(model, ''\)/);
  assert.match(migration, /new\.status := 'incomparable'/);
  assert.match(migration, /same explicit provider model/);
});

test("resolution identity and approval actors are immutable or authenticated", async () => {
  const migration = await text("supabase/migrations/20260804000100_resolution_engine.sql");
  assert.match(migration, /Resolution identity and evidence baseline are immutable/);
  assert.match(migration, /Follow-up identity, baseline, requester, and attached run are immutable/);
  assert.match(migration, /submitting actor must match the authenticated user/i);
  assert.match(migration, /decision actor must match the authenticated user/i);
  assert.match(migration, /approving actor must match the authenticated user/i);
  assert.match(migration, /applying actor must match the authenticated user/i);
});

test("the API preserves the Resolution Center record contract", async () => {
  const route = await text("app/api/resolutions/route.ts");
  assert.match(route, /data: \{ resolutions:/);
  assert.match(route, /problem: \{/);
  assert.match(route, /evidence:/);
  assert.match(route, /proposal:/);
  assert.match(route, /approval:/);
  assert.match(route, /application:/);
  assert.match(route, /followUp:/);
  assert.match(route, /action === "update_draft"/);
  assert.match(route, /action === "decision"/);
  assert.match(route, /action === "mark_applied"/);
});
