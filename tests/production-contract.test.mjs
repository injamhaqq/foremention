import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const exists = (path) => access(new URL(path, root));

test("production public and workspace routes exist", async () => {
  const routes = [
    "app/source-map/page.tsx", "app/sample-report/page.tsx", "app/privacy/page.tsx", "app/terms/page.tsx",
    "app/product/page.tsx", "app/about/page.tsx", "app/teardowns/page.tsx", "app/contact/page.tsx", "app/monitoring-vs-execution/page.tsx",
    "app/forgot-password/page.tsx", "app/reset-password/page.tsx", "app/auth/callback/page.tsx", "app/api/auth/password/route.ts", "app/not-found.tsx", "app/error.tsx",
    "app/app/onboarding/page.tsx", "app/app/prompts/page.tsx", "app/app/runs/[id]/page.tsx", "app/app/sources/[id]/page.tsx",
    "app/app/opportunities/page.tsx", "app/app/evidence/page.tsx", "app/app/analytics/page.tsx", "app/app/settings/page.tsx",
    "app/api/onboarding/route.ts", "app/api/prompts/route.ts", "app/api/evidence/route.ts", "app/api/runs/[id]/review/route.ts",
  ];
  await Promise.all(routes.map(exists));
});

test("account recovery requires and confirms a new password", async () => {
  const [callback, form, route] = await Promise.all([text("components/auth-callback.tsx"), text("components/set-password-form.tsx"), text("app/api/auth/password/route.ts")]);
  assert.match(callback, /recovery/);
  assert.match(callback, /reset-password/);
  assert.match(form, /Confirm new password/);
  assert.match(form, /password !== confirmation/);
  assert.match(route, /auth\/v1\/user/);
});

test("the selected Meridian OS Source Eclipse identity is preserved", async () => {
  const [brand, css, mergeRecord] = await Promise.all([text("components/brand.tsx"), text("app/globals.css"), text("docs/FIRST-WAVE-MERGE.md")]);
  assert.match(brand, /SourceEclipseMark/);
  assert.match(brand, /source-eclipse__orbit/);
  assert.match(brand, /source-eclipse__point/);
  assert.match(css, /--ink: #041514/);
  assert.match(css, /--marker: #70f0c6/);
  assert.match(css, /--copper: #0f9f91/);
  assert.match(mergeRecord, /Source Eclipse/);
});

test("interactive demo and factual disclosure are present", async () => {
  const [journey, report, home] = await Promise.all([text("components/recommendation-journey.tsx"), text("app/sample-report/page.tsx"), text("app/page.tsx")]);
  assert.match(journey, /Illustrative demo using fictional sample data/);
  assert.match(journey, /Buyer prompt/);
  assert.match(journey, /Placement route/);
  assert.match(report, /Fictional sample report/);
  assert.match(report, /does not guarantee/i);
  assert.match(home, /No fake reviews\. No hidden promotion\. No ranking guarantees\./);
});

test("Sites D1 intake and migration are configured", async () => {
  const [hosting, worker, migration] = await Promise.all([text(".openai/hosting.json"), text("worker/index.ts"), text("drizzle/0000_public_intake.sql")]);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(worker, /handleSourceGapRequest/);
  assert.match(worker, /intake_rate_limits/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS source_gap_requests/i);
});

test("onboarding writes the first organization and prompt baseline transactionally", async () => {
  const [wizard, route, migration] = await Promise.all([text("components/onboarding-wizard.tsx"), text("app/api/onboarding/route.ts"), text("supabase/migrations/20260722000100_recommendation_graph.sql")]);
  assert.match(wizard, /\/api\/onboarding/);
  assert.match(wizard, /no customer data was saved/);
  assert.match(route, /rpc\/complete_onboarding/);
  assert.match(migration, /function public\.complete_onboarding/);
  assert.match(migration, /onboarding\.completed/);
});

test("the paying workspace keeps customer data truthful and server-scoped", async () => {
  const [overview, analytics, sourceMap, runRoute, reviewRoute] = await Promise.all([
    text("app/app/page.tsx"),
    text("app/app/analytics/page.tsx"),
    text("app/app/source-map/page.tsx"),
    text("app/api/runs/route.ts"),
    text("app/api/runs/[id]/review/route.ts"),
  ]);
  assert.match(overview, /Workspace readiness/);
  assert.match(overview, /No approved runs/);
  assert.match(analytics, /never substitute demo values for customer data/i);
  assert.match(sourceMap, /page-level brand presence stays unreviewed/i);
  assert.match(runRoute, /loadWorkspaceContext/);
  assert.doesNotMatch(runRoute, /body\.organizationId/);
  assert.match(reviewRoute, /review_status/);
  assert.match(reviewRoute, /published/);
});

test("SEO, social preview, and accessibility states are bundled", async () => {
  const [layout, css] = await Promise.all([text("app/layout.tsx"), text("app/globals.css")]);
  await exists("public/og.png");
  await exists("app/sitemap.ts");
  await exists("app/robots.ts");
  assert.match(layout, /SoftwareApplication/);
  assert.match(layout, /og\.png/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});

test("error monitoring is optional, privacy-conscious, and configured outside source", async () => {
  const [worker, client, env] = await Promise.all([text("worker/index.ts"), text("components/sentry-client.tsx"), text(".env.example")]);
  assert.match(worker, /@sentry\/cloudflare/);
  assert.match(worker, /Sentry\.withSentry/);
  assert.match(worker, /sendDefaultPii: false/);
  assert.match(client, /@sentry\/react/);
  assert.match(client, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(env, /SENTRY_DSN=/);
});
