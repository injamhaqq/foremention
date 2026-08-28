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
  assert.match(form, /\{12,\}/);
  assert.match(form, /minLength=\{12\}/);
  assert.match(route, /auth\/v1\/user/);
  assert.match(verify, /auth\/v1\/verify/);
  assert.match(verify, /token_hash/);
  assert.match(verify, /type === "recovery"/);
  assert.match(authForm, /Confirm password/);
  assert.match(authForm, /password !== confirmation/);
  assert.match(signup, /password !== confirmation/);
  assert.match(signup, /\{12,\}/);
  assert.match(authForm, /minLength=\{isLogin \? 8 : 12\}/);
  assert.match(authForm, /minLength=\{12\}/);
  assert.match(signup, /email_redirect_to: `\$\{origin\}\/auth\/callback`/);
  assert.match(signup, /user\.identities\.length === 0/);
  assert.match(signup, /account_help: true/);
  assert.match(signup, /An account already exists with this email/);
  assert.doesNotMatch(signup, /setSessionCookies/);
  assert.match(authForm, /Continue to your account/);
  assert.match(authForm, /Reset password/);
  assert.match(authForm, /<label>Email<input/);
  assert.doesNotMatch(authForm, /<label>Work email<input/);
  assert.match(recovery, /redirect_to=.*auth\/callback/);
  assert.doesNotMatch(recovery, /auth\/callback\?next=/);
  assert.match(layout, /AuthHashRedirect/);
  assert.match(fallback, /access_token/);
  assert.match(fallback, /window\.location\.replace/);
});

test("verified authentication uses a deterministic cookie handoff and sends new customers to onboarding", async () => {
  const [loginForm, callback, resetForm, overview, auth, data, refresh, cookies, demoExit, navigation] = await Promise.all([
    text("components/auth-form.tsx"),
    text("components/auth-callback.tsx"),
    text("components/set-password-form.tsx"),
    text("app/app/page.tsx"),
    text("lib/auth.ts"),
    text("lib/data.ts"),
    text("app/api/auth/refresh/route.ts"),
    text("lib/session-cookies.ts"),
    text("app/api/auth/demo/exit/route.ts"),
    text("components/workspace-navigation.tsx"),
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
  assert.match(cookies, /clearDemoCookie/);
  assert.match(demoExit, /clearDemoCookie/);
  assert.match(demoExit, /\/app\/runs/);
  assert.match(navigation, /Exit demo/);
  assert.match(navigation, /\/api\/auth\/demo\/exit/);
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
  const [wizard, route, analysisRoute, profile, migration] = await Promise.all([
    text("components/onboarding-wizard.tsx"),
    text("app/api/onboarding/route.ts"),
    text("app/api/onboarding/analyze/route.ts"),
    text("lib/onboarding-profile.ts"),
    text("supabase/migrations/20260722000100_recommendation_graph.sql"),
  ]);
  assert.match(wizard, /\/api\/onboarding/);
  assert.match(wizard, /\/api\/onboarding\/analyze/);
  assert.match(wizard, /Generate my setup/);
  assert.match(wizard, /Review your evidence boundary/);
  assert.match(wizard, /Your workspace is private/);
  assert.match(wizard, /no customer data was saved/);
  assert.match(analysisRoute, /isTrustedMutationOrigin/);
  assert.match(analysisRoute, /getViewer/);
  assert.match(analysisRoute, /validatePublicSourceUrl/);
  assert.match(analysisRoute, /inspectSourceUrl/);
  assert.match(analysisRoute, /isForementionSite/);
  assert.match(analysisRoute, /AI Visibility and Recommendation Intelligence Platform - Foremention/);
  assert.match(analysisRoute, /Domain name only; usable public website text was unavailable/);
  assert.match(analysisRoute, /allowTruncatedBody: true/);
  assert.match(analysisRoute, /directFetchLimited = publicContext\.length < 80/);
  assert.match(analysisRoute, /enrichOnboardingDraft/);
  assert.match(analysisRoute, /directFetchLimited && !enrichment\.enriched/);
  assert.match(analysisRoute, /enriched: enrichment\.enriched/);
  assert.match(wizard, /analyzeWebsite\(values\.domain, true\)/);
  assert.doesNotMatch(analysisRoute, /We could not read enough public website information/);
  assert.match(analysisRoute, /cache-control.*private, no-store/);
  assert.match(profile, /Review this draft/);
  assert.doesNotMatch(profile, /fetch\(|API_KEY|process\.env/);
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
  assert.match(overview, /First audit has not completed/);
  assert.match(overview, /Latest observed answer/);
  assert.match(overview, /awaiting review/);
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
  assert.match(form, /Select after inspection/);
  assert.match(form, /Observed influence/);
  assert.match(form, /crawlerAccess === "unknown"/);
  assert.match(form, /Our brand is present on this page/);
  assert.match(form, /Review note/);
  assert.match(route, /loadWorkspaceContext/);
  assert.match(route, /projectId: context\.projectId/);
  assert.doesNotMatch(route, /body\.organizationId/);
  assert.match(route, /source\.reviewed/);
  assert.match(route, /influenceValues/);
  assert.match(route, /influence: body\.influence/);
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
  for (const route of ["/app/prompts", "/app/runs", "/app/analytics", "/app/settings", "/app/decision-lab", "/app/opportunities", "/app/placements", "/app/evidence", "/app/alerts", "/app/team"]) {
    assert.match(navigation, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.doesNotMatch(navigation, /\/app\/source-map|Source X-Ray|source-xray/i);
  for (const label of ["Attention", "Questions", "Records", "Comparisons", "Settings"]) assert.match(navigation, new RegExp(label));
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
  assert.match(overview, /Latest verified answer/);
  assert.match(overview, /loadRunAnswers/);
  assert.match(overview, /observedRuns/);
});

test("customer insight pages use real evidence without pseudo-priority scores or duplicate alert noise", async () => {
  const [data, opportunities, opportunityList, overview, sourceRecord, analytics, alerts] = await Promise.all([
    text("lib/data.ts"),
    text("app/app/opportunities/page.tsx"),
    text("components/opportunity-list.tsx"),
    text("app/app/page.tsx"),
    text("app/app/sources/[id]/page.tsx"),
    text("app/app/analytics/page.tsx"),
    text("components/notification-center.tsx"),
  ]);
  assert.match(data, /loadSourceEvidenceContexts/);
  assert.match(data, /source_observations\?select=source_id,run_answer_id,provider,citation_ordinal,observed_at/);
  assert.match(data, /review_status=eq\.verified/);
  assert.match(data, /const groups = new Map/);
  assert.match(opportunities, /score: reviewed \?/);
  assert.match(opportunityList, /source\.score === null \? "Evidence"/);
  assert.match(opportunityList, /source\.score === null \? <strong>Review<\/strong> :/);
  assert.match(opportunityList, /disabled=.*source\.score === null/);
  assert.match(overview, /latestAnswer\.answer/);
  assert.match(sourceRecord, /Observed evidence chain/);
  assert.match(analytics, /Current reviewed baseline/);
  assert.match(alerts, /similar events/);
});

test("the weekly intelligence loop is tenant-scoped, review-only, cost-aware, and deterministic", async () => {
  const [page, component, data, api, navigation, dashboard, product] = await Promise.all([
    text("app/app/intelligence/page.tsx"),
    text("components/intelligence-loop.tsx"),
    text("lib/intelligence-loop.ts"),
    text("app/api/intelligence/route.ts"),
    text("components/workspace-navigation.tsx"),
    text("app/app/page.tsx"),
    text("app/product/page.tsx"),
  ]);
  assert.match(page, /loadWeeklyIntelligence/);
  assert.match(page, /Measurement boundary/);
  assert.match(component, /Search evidence/);
  assert.match(component, /Compare runs/);
  assert.match(component, /Confidence without a magic score/);
  assert.match(component, /Prioritized next action/);
  assert.match(component, /type="search"/);
  assert.match(data, /organization_id=eq\.\$\{context\.organizationId\}/);
  assert.match(data, /project_id=eq\.\$\{context\.projectId\}/);
  assert.match(data, /review_status=eq\.verified/);
  assert.match(data, /ai_cost_events/);
  assert.match(data, /canonicalizeEvidenceUrl/);
  assert.match(data, /comparisonSignature/);
  assert.match(data, /candidateSignature === latestSignature/);
  assert.match(data, /exact text comparison/i);
  assert.match(data, /Automatic scheduling is not implied/);
  assert.match(data, /telemetry: "fictional"/);
  assert.doesNotMatch(data, /OPENAI_API_KEY|GEMINI_API_KEY|fetch\(/);
  assert.match(api, /getViewer/);
  assert.match(api, /Unauthorized/);
  assert.match(navigation, /Intelligence Loop/);
  assert.match(dashboard, /Weekly Intelligence Loop/);
  assert.match(product, /Recommendation Record/);
  assert.match(product, /evidence inspection lives in the record/i);
  assert.doesNotMatch(product, /Eight connected systems|Source X-Ray|source-xray/i);
});

test("the customer journey distinguishes collected citations from reviewed decisions", async () => {
  const [sourceMap, sourceTable, questions, launcher, decision, home, review, data] = await Promise.all([
    text("app/app/source-map/page.tsx"),
    text("components/source-map-table.tsx"),
    text("components/prompt-library.tsx"),
    text("components/run-launcher.tsx"),
    text("app/app/decision-lab/page.tsx"),
    text("components/goat-home-experience.tsx"),
    text("app/api/runs/[id]/review/route.ts"),
    text("lib/data.ts"),
  ]);
  assert.match(sourceMap, /Human review queue/);
  assert.match(sourceMap, /Review next source/);
  assert.match(sourceTable, /Required before scoring/);
  assert.match(questions, /Question planner/);
  assert.match(questions, /not search-volume claims or collected evidence/);
  assert.match(launcher, /provider-state/);
  assert.match(decision, /Review sources/);
  assert.match(home, /LIVE RECORD \/ ILLUSTRATIVE/);
  assert.doesNotMatch(home, />24<|>87<|>6</);
  assert.match(review, /provider-returned citations/);
  assert.match(data, /Page-level review is still required/);
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
  assert.match(layout, /"@type":\s*"Organization"/);
  assert.doesNotMatch(layout, /"@type":\s*"SoftwareApplication"/);
  assert.match(layout, /SOCIAL_IMAGE/);
  assert.match(seo, /og\.png/);
  assert.match(seo, /https:\/\/foremention\.com/);
  assert.match(seo, /alternates: \{ canonical \}/);
  assert.doesNotMatch(sitemap, /localhost/);
  assert.match(sitemap, /\/recommendation-intelligence/);
  assert.match(sitemap, /\/recommendation-record/);
  assert.match(sitemap, /\/insights/);
  assert.doesNotMatch(sitemap, /\/source-x-ray/);
  assert.match(robots, /OAI-SearchBot/);
  assert.match(robots, /ChatGPT-User/);
  assert.match(robots, /Claude-SearchBot/);
  assert.match(robots, /Claude-User/);
  assert.match(robots, /GPTBot/);
  assert.match(robots, /ClaudeBot/);
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
  assert.match(hub, /Recommendation Intelligence Research/);
  assert.match(measurement, /Five evidence layers/);
  assert.match(measurement, /developers\.google\.com/);
  assert.match(checklist, /llms\.txt is not needed for Google Search/i);
  assert.match(checklist, /no requirement to chunk content/i);
  assert.match(checklist, /Generative AI performance report/i);
  assert.match(checklist, /developers\.google\.com/);
  assert.doesNotMatch(checklist, /Source X-Ray|source-xray/i);
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
  const [worker, client, privacy, env] = await Promise.all([text("worker/index.ts"), text("components/sentry-client.tsx"), text("lib/sentry-privacy.ts"), text(".env.example")]);
  assert.match(worker, /@sentry\/cloudflare/);
  assert.match(worker, /Sentry\.withSentry/);
  assert.match(worker, /env\?\.SENTRY_DSN/);
  assert.match(worker, /sendDefaultPii: false/);
  assert.match(client, /@sentry\/react/);
  assert.match(client, /NEXT_PUBLIC_SENTRY_DSN/);
  assert.match(env, /SENTRY_DSN=/);
  for (const source of [worker, client]) {
    assert.match(source, /maxBreadcrumbs: 0/);
    assert.match(source, /httpBodies: \[\]/);
    assert.match(source, /genAI: \{ inputs: false, outputs: false \}/);
    assert.match(source, /beforeSend: scrubSentryEvent/);
  }
  assert.match(privacy, /delete event\.request/);
  assert.match(privacy, /delete event\.user/);
  assert.match(privacy, /exception\.value = "Application error"/);
});

test("the health endpoint exposes only a validated non-secret build commit", async () => {
  const [worker, env] = await Promise.all([text("worker/index.ts"), text(".env.example")]);
  assert.match(worker, /FOREMENTION_BUILD_COMMIT\?: string/);
  assert.match(worker, /\^\[0-9a-f\]\{40\}\$/i);
  assert.match(worker, /buildCommit/);
  assert.match(worker, /"unavailable"/);
  assert.match(worker, /"Cache-Control": "no-store"/);
  assert.match(env, /FOREMENTION_BUILD_COMMIT=/);
});

test("product analytics is production-only, privacy-limited, and fail-closed", async () => {
  const [client, events, contract, milestone, sourceMapPage, env, worker, privacy, auth, onboarding, questions, launcher, sourceReview] = await Promise.all([
    text("components/posthog-analytics.tsx"),
    text("lib/product-analytics.ts"),
    text("lib/product-analytics-contract.ts"),
    text("components/product-event.tsx"),
    text("app/app/source-map/page.tsx"),
    text(".env.example"),
    text("worker/index.ts"),
    text("app/privacy/page.tsx"),
    text("components/auth-form.tsx"),
    text("components/onboarding-wizard.tsx"),
    text("components/prompt-library.tsx"),
    text("components/run-launcher.tsx"),
    text("components/source-review-form.tsx"),
  ]);
  assert.match(events, /PRODUCTION_POSTHOG_PROJECT_TOKEN/);
  assert.match(events, /PRODUCTION_POSTHOG_HOST/);
  assert.doesNotMatch(events, /process\.env\.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN|process\.env\.NEXT_PUBLIC_POSTHOG_HOST/);
  assert.match(events, /autocapture: false/);
  assert.match(events, /disable_session_recording: true/);
  assert.match(events, /capture_exceptions: false/);
  assert.match(client, /initializeProductAnalytics/);
  assert.match(events, /sanitizePostHogPayload/);
  assert.match(events, /sanitizeProductAnalyticsEvent\(event\.event, rawProperties\)/);
  assert.match(contract, /if \(!EVENT_NAMES\.has\(normalized\.event\)\) return null/);
  assert.doesNotMatch(env, /^NEXT_PUBLIC_POSTHOG_/m);
  assert.match(worker, /https:\/\/\*\.posthog\.com/);
  assert.match(privacy, /without session replay/i);
  for (const event of ["signup_completed", "onboarding_completed", "question_created", "collection_started"]) {
    assert.match(`${auth}\n${onboarding}\n${questions}\n${launcher}`, new RegExp(event));
  }
  assert.match(milestone, /workflow_completed/);
  assert.match(milestone, /workflow_failed/);
  assert.match(sourceMapPage, /source_map_opened/);
  assert.match(sourceReview, /source_xray_reviewed/);
  assert.match(sourceReview, /decision_insight_reached/);
});

test("Experience analytics are optional, consent-gated, and limited by CSP", async () => {
  const [contentsquare, env, worker, privacy] = await Promise.all([
    text("components/contentsquare-analytics.tsx"),
    text(".env.example"),
    text("worker/index.ts"),
    text("app/privacy/page.tsx"),
  ]);
  assert.match(env, /NEXT_PUBLIC_CONTENTSQUARE_TAG_URL=/);
  assert.match(env, /NEXT_PUBLIC_CLARITY_PROJECT_ID=/);
  assert.match(contentsquare, /foremention:experience-analytics-consent/);
  assert.match(contentsquare, /consent !== "accepted"/);
  assert.match(contentsquare, /t\\\.contentsquare\\\.net\\\/uxa/);
  assert.match(contentsquare, /value\.match\(\/src=/);
  assert.match(contentsquare, /https:\/\/www\.clarity\.ms\/tag/);
  assert.match(contentsquare, /Allow analytics/);
  assert.match(worker, /https:\/\/\*\.contentsquare\.net/);
  assert.match(worker, /https:\/\/\*\.contentsquare\.com/);
  assert.match(worker, /https:\/\/csxd\.contentsquare\.net/);
  assert.match(worker, /https:\/\/\*\.clarity\.ms/);
  assert.match(worker, /https:\/\/c\.bing\.com/);
  assert.match(privacy, /only after a visitor explicitly accepts/i);
});

test("workspace zero-data and filtered views explain the page and provide a first action", async () => {
  const [alerts, agents, intelligence, sourceTable, evidence, opportunities, runs, team] = await Promise.all([
    text("components/notification-center.tsx"),
    text("components/agent-control-plane.tsx"),
    text("components/intelligence-loop.tsx"),
    text("components/source-map-table.tsx"),
    text("app/app/evidence/page.tsx"),
    text("app/app/opportunities/page.tsx"),
    text("app/app/runs/page.tsx"),
    text("components/team-management.tsx"),
  ]);
  for (const source of [alerts, agents, intelligence, sourceTable, evidence, opportunities, runs, team]) {
    assert.match(source, /href=|onClick=/);
  }
  assert.match(alerts, /Start with Answer Runs/);
  assert.match(agents, /Start first run/);
  assert.match(intelligence, /Create the first baseline/);
  assert.match(sourceTable, /No sources match this view/);
  assert.match(evidence, /No reviewed provider evidence yet/);
  assert.match(opportunities, /Collect evidence/);
  assert.match(runs, /Review buyer questions/);
  assert.match(team, /No member records are available/);
});

test("all customer write forms expose loading feedback and lock duplicate submissions", async () => {
  const formFiles = [
    "components/auth-form.tsx",
    "components/evidence-manager.tsx",
    "components/claim-ledger.tsx",
    "components/password-reset-form.tsx",
    "components/set-password-form.tsx",
    "components/prompt-library.tsx",
    "components/source-review-form.tsx",
    "components/team-management.tsx",
    "components/source-gap-form.tsx",
    "components/onboarding-wizard.tsx",
  ];
  const sources = await Promise.all(formFiles.map(text));
  for (const source of sources) {
    assert.match(source, /useRef\(false\)/);
    assert.match(source, /\.current\) return/);
    assert.match(source, /aria-busy=/);
  }
  const pending = await text("components/pending-submit-button.tsx");
  assert.match(pending, /useFormStatus/);
  assert.match(pending, /disabled=\{isPending\}/);
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
  assert.match(deletion, /execution: "scheduled"/);
  assert.match(deletion, /execute_foremention_account_deletion/);
  assert.match(deletion, /seven-day safety window/i);
  assert.doesNotMatch(deletion, /organizations\?.*method: "DELETE"/s);
  assert.match(alerts, /user_id=eq\.\$\{viewer\.id\}/);
  assert.match(emailBoundary, /Authentication email is separate/);
  assert.match(navigation, /\/app\/alerts/);
  assert.match(navigation, /\/app\/team/);
  assert.match(settings, /Automated application-email delivery remains unavailable/);
});

test("Resend application alerts are server-only, bounded, and separate from authentication email", async () => {
  const [email, env, signup, forgot] = await Promise.all([
    text("lib/application-email.ts"),
    text(".env.example"),
    text("app/api/auth/signup/route.ts"),
    text("app/api/auth/forgot-password/route.ts"),
  ]);
  assert.match(env, /RESEND_API_KEY=/);
  assert.match(env, /RESEND_FROM_EMAIL=/);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /Supabase\/Zoho owns confirmation and password-recovery delivery/);
  assert.match(email, /slice\(0, 160\)/);
  assert.match(email, /slice\(0, 20_000\)/);
  assert.match(email, /sendWelcomeEmail/);
  assert.match(signup, /sendWelcomeEmail/);
  assert.match(signup, /delivery_failed/);
  assert.doesNotMatch(`${signup}\n${forgot}`, /RESEND_API_KEY|sendProductAlertEmail/);
  assert.doesNotMatch(forgot, /sendWelcomeEmail/);
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
