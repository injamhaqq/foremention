import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("commercial platform positioning and brand contract are encoded", async () => {
  const [home, pricing, css] = await Promise.all([text("app/page.tsx"), text("app/pricing/page.tsx"), text("app/globals.css")]);
  assert.match(home, /SourceXRayExperience/);
  assert.match(home, /SourceXRayExperience/);
  assert.match(home, /Source Map/);
  assert.match(pricing, /\$149/);
  assert.match(pricing, /Core/);
  assert.match(pricing, /Signal/);
  assert.match(pricing, /repeatable intelligence system/);
  assert.match(css, /--ink: #041514/);
  assert.match(css, /--paper: #f3fff9/);
  assert.match(css, /--marker: #70f0c6/);
  assert.match(css, /--copper: #0f9f91/);
  assert.doesNotMatch(home, /guaranteed rankings/i);
});

test("usage controls are explicit and enforced by the run path", async () => {
  const [limits, route, migration] = await Promise.all([text("lib/product-limits.ts"), text("app/api/runs/route.ts"), text("supabase/migrations/20260724000100_free_beta_usage_controls.sql")]);
  assert.match(limits, /FOUNDATION_ACCESS_LIMITS/);
  assert.match(limits, /runUnitsPerMonth: 20/);
  assert.match(limits, /buyerQuestions: 10/);
  assert.match(route, /reserve_run_quota/);
  assert.match(route, /loadWorkspaceContext/);
  assert.doesNotMatch(route, /body\.organizationId/);
  assert.match(migration, /create table public\.usage_events/i);
  assert.match(migration, /reserve_run_quota/i);
});

test("extended Recommendation Graph data model is secured with RLS", async () => {
  const sql = await text("supabase/migrations/20260722000100_recommendation_graph.sql");
  for (const table of ["projects", "domains", "competitors", "prompt_clusters", "prompt_versions", "run_attempts", "answer_brand_mentions", "source_observations", "source_contacts", "source_routes", "opportunities", "evidence_items", "verified_claims", "outreach_actions", "approvals", "indexing_checks", "citation_observations", "referral_metrics", "crm_attribution_events", "integrations", "webhooks", "jobs", "audit_logs"]) {
    assert.match(sql, new RegExp(`['\"]${table}['\"]`, "i"));
  }
  assert.match(sql, /execute format\('alter table public\.%I enable row level security'/i);
  assert.match(sql, /alter table public\.integrations enable row level security/i);
  assert.match(sql, /alter table public\.webhooks enable row level security/i);
  assert.match(sql, /public\.is_org_member/);
  assert.match(sql, /public\.has_org_role/);
});

test("database migration enables RLS and preserves the placement evidence chain", async () => {
  const sql = await text("supabase/migrations/20260719000100_initial_schema.sql");
  for (const table of ["organizations", "organization_members", "runs", "run_answers", "sources", "citations", "source_maps", "source_map_entries", "placements", "placement_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  for (const stage of ["identified", "qualified", "pitched", "accepted", "published", "indexed", "first_cited", "repeatedly_cited", "decayed"]) assert.match(sql, new RegExp(stage));
  assert.match(sql, /source_gap_public_insert/);
});

test("auth, provider adapters, and background run route are present", async () => {
  const [auth, signup, session, types, gemini, job, route] = await Promise.all([text("lib/auth.ts"), text("app/api/auth/signup/route.ts"), text("app/api/auth/session/route.ts"), text("lib/providers/types.ts"), text("lib/providers/gemini.ts"), text("lib/jobs/inngest.ts"), text("app/api/runs/route.ts")]);
  assert.match(auth, /requireViewer/);
  assert.match(signup, /email_redirect_to/);
  assert.match(session, /auth\/v1\/user/);
  assert.match(types, /AnswerProviderAdapter/);
  assert.match(types, /"gemini"/);
  assert.match(gemini, /google_search/);
  assert.match(job, /run-multi-engine-scan/);
  assert.match(job, /failures/);
  assert.match(route, /foremention\/run\.requested/);
  assert.match(route, /LIVE_COLLECTION_LIMITS\.maxPromptsPerRun/);
});
