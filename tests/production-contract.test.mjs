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
    "app/insights/page.tsx", "app/insights/ai-visibility-measurement/page.tsx", "app/insights/seo-geo-technical-checklist/page.tsx",
    "app/forgot-password/page.tsx", "app/reset-password/page.tsx", "app/auth/callback/page.tsx", "app/api/auth/password/route.ts", "app/api/auth/verify/route.ts", "app/api/auth/refresh/route.ts", "app/not-found.tsx", "app/error.tsx",
    "app/app/onboarding/page.tsx", "app/app/prompts/page.tsx", "app/app/runs/[id]/page.tsx", "app/app/sources/[id]/page.tsx",
    "app/app/decision-lab/page.tsx", "app/app/opportunities/page.tsx", "app/app/evidence/page.tsx", "app/app/analytics/page.tsx", "app/app/alerts/page.tsx", "app/app/team/page.tsx", "app/app/settings/page.tsx", "app/invite/[token]/page.tsx",
    "app/api/onboarding/route.ts", "app/api/prompts/route.ts", "app/api/evidence/route.ts", "app/api/runs/[id]/review/route.ts", "app/api/sources/[id]/review/route.ts",
    "app/api/team/invitations/route.ts", "app/api/team/invitations/accept/route.ts", "app/api/notifications/route.ts", "app/api/account/deletion/route.ts",
  ];
  await Promise.all(routes.map(exists));
});

test("account recovery requires and confirms a new password", async () => {
  const [callback, form, route, verify, recovery, signup, authForm, layout, fallback] = await Promise.all([
    text("components/auth-callback.tsx"),
    text("components/set-password-form.tsx"),
    text("app/api/auth/password/route.ts"),
    text("app/api/auth/verify/route.ts"),
    text("app/api/auth/forgot-password/route.ts"),
    text("app/api/auth/signup/route.ts"),
    text("components/auth-form.tsx"),
    text("app/layout.tsx"),
    text("components/auth-hash-redirect.tsx"),
  ]);
  assert.match(callback, /recovery/);
  assert.match(callback, /reset-password/);
  assert.match(form, /Confirm new password/);
  assert.match(form, /password !== confirmation/);
  assert.match(route, /auth\/v1\/user/);
  assert.match(verify, /auth\/v1\/verify/);
  assert.match(verify, /token_hash/);
  assert.match(verify, /type === "recovery"/);
  assert.match(authForm, /Confirm password/);
  assert.match(authForm, /password !== confirmation/);
  assert.match(signup, /password !== confirmation/);
  assert.match(signup, /email_redirect_to: `\$\{origin\}\/auth\/callback`/);
  assert.match(signup, /user\.identities\.length === 0/);
  assert.match(signup, /account_help: true/);
  assert.match(authForm, /Continue to your account/);
  assert.match(authForm, /Reset password/);
  assert.match(recovery, /redirect_to=.*auth\/callback/);
  assert.doesNotMatch(recovery, /auth\/callback\?next=/);
  assert.match(layout, /AuthHashRedirect/);
  assert.match(fallback, /access_token/);
  assert.match(fallback, /window\.location\.replace/);
});

test("verified authentication uses a deterministic cookie handoff and sends new customers to onboarding", async () => {
  const [loginForm, callback, resetForm, overview, auth, data, refresh, cookies] = await Promise.all([
    text("components/auth-form.tsx"),
    text("components/auth-callback.tsx"),
    text("components/set-password-form.tsx"),
    text("app/app/page.tsx"),
    text("lib/auth.ts"),
    text("lib/data.ts"),
    text("app/api/auth/refresh/route.ts"),
    text("lib/session-cookies.ts"),
  ]);
  assert.match(loginForm, /window\.location\.assign/);
  assert.match(loginForm, /onSubmit=\{submit\}/);
  assert.match(callback, /window\.location\.replace/);
  assert.match(callback, /\/api\/auth\/verify/);
  assert.match(callback, /token_hash/);
  assert.match(resetForm, /window\.location\.replace/);
  assert.match(overview, /redirect\("\/app\/onboarding"\)/);
  assert.match(auth, /cache\(async function getViewer/);
  assert.match(auth, /\/api\/auth\/refresh/);
  assert.match(data, /getPrimaryMembershipCached = cache/);
  assert.match(callback, /refresh_token/);
  assert.match(refresh, /grant_type=refresh_token/);
  assert.match(refresh, /safeNext/);
  assert.match(cookies, /httpOnly: true/);
  assert.match(cookies, /sameSite: "lax"/);
  assert.match(cookies, /REFRESH_COOKIE/);
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
  assert.match(wizard, /Review your evidence boundary/);
  assert.match(wizard, /Private by default/);
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
  assert.match(reviewRoute, /generateReviewedSourceMap/);
});

test("source review converts citation candidates into audited customer decisions", async () => {
  const [record, form, route, map] = await Promise.all([
    text("app/app/sources/[id]/page.tsx"),
    text("components/source-review-form.tsx"),
    text("app/api/sources/[id]/review/route.ts"),
    text("app/app/source-map/page.tsx"),
  ]);
  assert.match(record, /SourceReviewForm/);
  assert.match(form, /Crawler access/);
  assert.match(form, /Our brand is present on this page/);
  assert.match(form, /Review note/);
  assert.match(route, /getPrimaryOrganizationId/);
  assert.doesNotMatch(route, /body\.organizationId/);
  assert.match(route, /source\.reviewed/);
  assert.match(route, /before_state/);
  assert.match(route, /after_state/);
  assert.match(map, /Review completion/);
  assert.match(map, /Evidence concentration/);
});

test("Decision Lab gates action on evidence reliability instead of a magic score", async () => {
  const [page, data, navigation] = await Promise.all([
    text("app/app/decision-lab/page.tsx"),
    text("lib/data.ts"),
    text("components/workspace-navigation.tsx"),
  ]);
  assert.match(page, /Decision Lab/);
  assert.match(page, /Collection coverage/);
  assert.match(page, /Provider agreement/);
  assert.match(page, /Source concentration/);
  assert.match(page, /No composite score hides missing evidence/);
  assert.match(data, /loadDecisionSignal/);
  assert.match(data, /review_status=eq\.verified/);
  assert.match(data, /decisionReadiness/);
  assert.match(navigation, /\/app\/decision-lab/);
  assert.match(data, /run_id=in\.\(\$\{runIds\.join\(","\)\}\)/);
  assert.match(data, /latestComparableAnswers/);
});

test("workspace navigation and customer controls are complete on desktop and mobile", async () => {
  const [navigation, shell, css, launcher, evidence, evidenceRoute, team, alerts, overview] = await Promise.all([
    text("components/workspace-navigation.tsx"),
    text("components/app-shell.tsx"),
    text("app/globals.css"),
    text("components/run-launcher.tsx"),
    text("components/evidence-manager.tsx"),
    text("app/api/evidence/route.ts"),
    text("components/team-management.tsx"),
    text("components/notification-center.tsx"),
    text("app/app/page.tsx"),
  ]);
  for (const route of ["/app/prompts", "/app/runs", "/app/source-map", "/app/decision-lab", "/app/opportunities", "/app/placements", "/app/evidence", "/app/analytics", "/app/alerts", "/app/team", "/app/settings"]) {
    assert.match(navigation, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(navigation, /aria-current/);
  assert.match(navigation, /mobileMenu\.current\.open = false/);
  assert.match(navigation, /Sign out/);
  assert.match(shell, /WorkspaceMobileNavigation/);
  assert.match(css, /\.app-mobile-nav__panel/);
  assert.match(launcher, /provider\.health === "available"/);
  assert.match(launcher, /Latest attempt/);
  assert.match(evidence, /Verify evidence/);
  assert.match(evidenceRoute, /Only owners, admins, and analysts can review evidence/);
  assert.match(evidenceRoute, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(evidenceRoute, /evidence\.verified/);
  assert.match(team, /member\.current \|\| busy/);
  assert.match(alerts, /Could not update alerts/);
  assert.match(overview, /provider\.verifiedAnswers > 0/);
});

test("SEO, social preview, and accessibility states are bundled", async () => {
  const [layout, css, seo, sitemap, robots, sourceMap, sample] = await Promise.all([
    text("app/layout.tsx"),
    text("app/globals.css"),
    text("lib/seo.ts"),
    text("app/sitemap.ts"),
    text("app/robots.ts"),
    text("app/source-map/page.tsx"),
    text("app/sample-report/page.tsx"),
  ]);
  await exists("public/og.png");
  await exists("app/sitemap.ts");
  await exists("app/robots.ts");
  assert.match(layout, /SoftwareApplication/);
  assert.match(layout, /SOCIAL_IMAGE/);
  assert.match(seo, /og\.png/);
  assert.match(seo, /https:\/\/foremention\.com/);
  assert.match(seo, /alternates: \{ canonical \}/);
  assert.doesNotMatch(sitemap, /localhost/);
  assert.match(sitemap, /\/insights\/ai-visibility-measurement/);
  assert.match(robots, /OAI-SearchBot/);
  assert.doesNotMatch(robots, /localhost/);
  assert.match(sourceMap, /not a fictional customer report/i);
  assert.match(sourceMap, /LiveSiteAudit/);
  assert.doesNotMatch(sourceMap, /Northstar HR/);
  assert.match(sample, /noIndex: true/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /:focus-visible/);
});

test("public insight content is original, sourced, and avoids ranking guarantees", async () => {
  const [hub, measurement, checklist] = await Promise.all([
    text("app/insights/page.tsx"),
    text("app/insights/ai-visibility-measurement/page.tsx"),
    text("app/insights/seo-geo-technical-checklist/page.tsx"),
  ]);
  assert.match(hub, /AI visibility measurement/);
  assert.match(measurement, /Five evidence layers/);
  assert.match(measurement, /developers\.google\.com/);
  assert.match(checklist, /OAI-SearchBot/);
  assert.match(checklist, /help\.openai\.com/);
  assert.match(checklist, /ranking cannot be guaranteed/);
});

test("the public Source Map uses inspectable real-company evidence without inventing AI citations", async () => {
  const [page, market] = await Promise.all([
    text("app/source-map/page.tsx"),
    text("lib/market-evidence-data.ts"),
  ]);
  for (const company of ["Profound", "Scrunch", "Peec AI", "OtterlyAI"]) {
    assert.match(market, new RegExp(company));
  }
  assert.match(page, /Real-company market evidence/);
  assert.match(page, /not that an AI engine cited the/i);
  assert.match(market, /first-party product evidence/i);
  assert.doesNotMatch(market, /evidenceCount/);
});

test("error monitoring is optional, privacy-conscious, and configured outside source", async () => {
  const [worker, client, env] = await Promise.all([text("worker/index.ts"), text("components/sentry-client.tsx"), text(".env.example")]);
  assert.match(worker, /@sentry\/cloudflare/);
  assert.match(worker, /Sentry\.withSentry/);
  assert.match(worker, /env\?\.SENTRY_DSN/);
  assert.match(worker, /sendDefaultPii: false/);
  assert.match(client, /@sentry\/react/);
  assert.match(client, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(env, /SENTRY_DSN=/);
});

test("production responses carry defense-in-depth browser protections", async () => {
  const worker = await text("worker/index.ts");
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /frame-ancestors 'none'/);
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Permissions-Policy/);
  assert.match(worker, /private, no-store/);
});

test("production builds preserve the existing Worker resources", async () => {
  const [packageJson, deployConfig] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/prepare-worker-config.mjs", import.meta.url), "utf8"),
  ]);
  assert.match(packageJson, /prepare-worker-config\.mjs/);
  assert.match(deployConfig, /name = "foremention-mvp"/);
  assert.match(deployConfig, /binding: "DB"/);
  assert.match(deployConfig, /database_name: "foremention-intake"/);
  assert.match(deployConfig, /binding: "AI"/);
  assert.match(deployConfig, /keep_vars = true/);
});

test("collaboration, in-app alerts, and reversible lifecycle controls are explicit", async () => {
  const [roleMigration, lifecycleMigration, invite, accept, members, deletion, alerts, emailBoundary, navigation, settings] = await Promise.all([
    text("supabase/migrations/20260729000100_collaboration_lifecycle_alerts.sql"),
    text("supabase/migrations/20260729000110_collaboration_lifecycle_alerts.sql"),
    text("app/api/team/invitations/route.ts"),
    text("app/api/team/invitations/accept/route.ts"),
    text("app/api/team/members/[id]/route.ts"),
    text("app/api/account/deletion/route.ts"),
    text("app/api/notifications/route.ts"),
    text("lib/application-email.ts"),
    text("components/workspace-navigation.tsx"),
    text("app/app/settings/page.tsx"),
  ]);
  assert.match(roleMigration, /add value if not exists 'admin'/);
  assert.doesNotMatch(roleMigration, /array\['admin'\]/);
  assert.match(lifecycleMigration, /create table if not exists public\.notifications/);
  assert.match(lifecycleMigration, /create table if not exists public\.account_deletion_requests/);
  assert.match(lifecycleMigration, /notifications_select_self/);
  assert.match(invite, /sha256Hex/);
  assert.match(invite, /expires_at/);
  assert.match(invite, /emailDelivery: "not_configured"/);
  assert.match(accept, /invitation\.email\.toLowerCase\(\) !== viewer\.email\.toLowerCase\(\)/);
  assert.match(accept, /status !== "pending"/);
  assert.match(members, /last owner/i);
  assert.match(deletion, /isRecentAccessToken/);
  assert.match(deletion, /DELETE FOREMENTION/);
  assert.match(deletion, /execution: "not_active"/);
  assert.doesNotMatch(deletion, /organizations\?.*method: "DELETE"/s);
  assert.match(alerts, /user_id=eq\.\$\{viewer\.id\}/);
  assert.match(emailBoundary, /Authentication email is separate/);
  assert.match(navigation, /\/app\/alerts/);
  assert.match(navigation, /\/app\/team/);
  assert.match(settings, /Automated application-email delivery remains unavailable/);
});

test("real collection events create tenant-scoped, idempotent in-app alerts", async () => {
  const [job, review] = await Promise.all([
    text("lib/jobs/inngest.ts"),
    text("app/api/runs/[id]/review/route.ts"),
  ]);
  assert.match(job, /on_conflict=organization_id,user_id,event_key/);
  assert.match(job, /run_ready/);
  assert.match(job, /run_failed/);
  assert.match(job, /organization_id: run\.organization_id/);
  assert.match(review, /source_map_published/);
  assert.match(review, /organization_id: context\.organizationId/);
});
