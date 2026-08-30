import { NextResponse } from "next/server";
import { getViewer, requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole, loadWorkspaceContext } from "@/lib/data";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { isMissingRelationError, supabaseRest } from "@/lib/supabase-rest";

const canManage = (role: string | null) => ["owner", "admin", "analyst"].includes(role || "");
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
const optionalText = (value: unknown, limit: number) => {
  if (value === null) return null;
  const result = clean(value, limit);
  return result || null;
};
const jsonPlan = (value: unknown) => value && typeof value === "object" ? value : {};
const isoOrNull = (value: unknown) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error("Date values must be valid ISO timestamps.");
  return new Date(value).toISOString();
};
const choice = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => typeof value === "string" && allowed.includes(value as T) ? value as T : fallback;

const ACTIVATION = ["not_started","setup","baseline_ready","active","value_review_ready"] as const;
const ADOPTION = ["unknown","low","developing","established"] as const;
const RISK = ["unknown","low","medium","high"] as const;
const ADVOCACY = ["unknown","not_ready","candidate","ready"] as const;
const REVIEW_TYPES = ["onboarding","success_review","qbr","business_value","renewal","expansion","advocacy"] as const;

type ProfileRow = {
  id: string;
  organization_id: string;
  project_id: string;
  onboarding_plan: Record<string, unknown> | unknown[];
  success_plan: Record<string, unknown> | unknown[];
  account_goal: string | null;
  champion_name: string | null;
  champion_role: string | null;
  executive_sponsor_name: string | null;
  executive_sponsor_role: string | null;
  activation_state: typeof ACTIVATION[number];
  adoption_state: typeof ADOPTION[number];
  adoption_basis: string | null;
  health_score: number | string | null;
  health_score_basis: string | null;
  health_score_updated_at: string | null;
  renewal_risk: typeof RISK[number];
  renewal_risk_basis: string | null;
  next_qbr_at: string | null;
  renewal_at: string | null;
  expansion_opportunity: string | null;
  advocate_readiness: typeof ADVOCACY[number];
  notification_preferences: Record<string, unknown>;
  updated_at: string;
};
type ReviewRow = {
  id: string;
  review_type: typeof REVIEW_TYPES[number];
  period_start: string | null;
  period_end: string | null;
  summary: string;
  operational_value: Record<string, unknown>;
  economic_value_status: "not_demonstrated" | "verified";
  economic_value_amount: number | string | null;
  economic_value_currency: string | null;
  economic_value_basis: string | null;
  health_score_snapshot: number | string | null;
  renewal_risk_snapshot: typeof RISK[number] | null;
  actor_id: string;
  occurred_at: string;
};

async function readProfile(viewer: Awaited<ReturnType<typeof requireViewer>>, organizationId: string, projectId: string) {
  const rows = await supabaseRest<ProfileRow[]>(`customer_success_profiles?select=id,organization_id,project_id,onboarding_plan,success_plan,account_goal,champion_name,champion_role,executive_sponsor_name,executive_sponsor_role,activation_state,adoption_state,adoption_basis,health_score,health_score_basis,health_score_updated_at,renewal_risk,renewal_risk_basis,next_qbr_at,renewal_at,expansion_opportunity,advocate_readiness,notification_preferences,updated_at&organization_id=eq.${organizationId}&project_id=eq.${projectId}&limit=1`, { token: viewer.accessToken });
  return rows[0] || null;
}

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (viewer.mode === "demo") return NextResponse.json({ profile: null, reviews: [], mode: "demo" });
  const context = await loadWorkspaceContext(viewer);
  if (!context) return NextResponse.json({ profile: null, reviews: [] });
  try {
    const profile = await readProfile(viewer, context.organizationId, context.projectId);
    const reviews = profile ? await supabaseRest<ReviewRow[]>(`customer_success_reviews?select=id,review_type,period_start,period_end,summary,operational_value,economic_value_status,economic_value_amount,economic_value_currency,economic_value_basis,health_score_snapshot,renewal_risk_snapshot,actor_id,occurred_at&customer_success_profile_id=eq.${profile.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=occurred_at.desc&limit=50`, { token: viewer.accessToken }) : [];
    return NextResponse.json({ profile, reviews });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ profile: null, reviews: [], migrationPending: true });
    throw error;
  }
}

export async function PATCH(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/settings/customer-success");
  if (viewer.mode === "demo") return NextResponse.json({ error: "The fictional demo cannot create customer-success facts." }, { status: 403 });
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot update the customer-success plan." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Complete onboarding before creating a customer-success plan." }, { status: 409 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  let nextQbrAt: string | null;
  let renewalAt: string | null;
  try {
    nextQbrAt = isoOrNull(body.nextQbrAt);
    renewalAt = isoOrNull(body.renewalAt);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid date." }, { status: 400 });
  }
  const activationState = choice(body.activationState, ACTIVATION, "not_started");
  const adoptionState = choice(body.adoptionState, ADOPTION, "unknown");
  const renewalRisk = choice(body.renewalRisk, RISK, "unknown");
  const advocateReadiness = choice(body.advocateReadiness, ADVOCACY, "unknown");
  const adoptionBasis = optionalText(body.adoptionBasis, 1500);
  const renewalRiskBasis = optionalText(body.renewalRiskBasis, 1500);
  const rawHealth = body.healthScore;
  const healthScore = rawHealth === null || rawHealth === "" || rawHealth === undefined ? null : Number(rawHealth);
  const healthScoreBasis = optionalText(body.healthScoreBasis, 1500);
  if (healthScore !== null && (!Number.isFinite(healthScore) || healthScore < 0 || healthScore > 100)) return NextResponse.json({ error: "Health score must be between 0 and 100, or left unset." }, { status: 400 });
  if (healthScore !== null && !healthScoreBasis) return NextResponse.json({ error: "A health score requires a written evidence basis." }, { status: 400 });
  if (adoptionState !== "unknown" && !adoptionBasis) return NextResponse.json({ error: "A non-unknown adoption state requires a written evidence basis." }, { status: 400 });
  if (renewalRisk !== "unknown" && !renewalRiskBasis) return NextResponse.json({ error: "A non-unknown renewal risk requires a written evidence basis." }, { status: 400 });

  const profileBody = {
    onboarding_plan: jsonPlan(body.onboardingPlan),
    success_plan: jsonPlan(body.successPlan),
    account_goal: optionalText(body.accountGoal, 2000),
    champion_name: optionalText(body.championName, 200),
    champion_role: optionalText(body.championRole, 200),
    executive_sponsor_name: optionalText(body.executiveSponsorName, 200),
    executive_sponsor_role: optionalText(body.executiveSponsorRole, 200),
    activation_state: activationState,
    adoption_state: adoptionState,
    adoption_basis: adoptionBasis,
    health_score: healthScore,
    health_score_basis: healthScoreBasis,
    health_score_updated_at: healthScore === null ? null : new Date().toISOString(),
    renewal_risk: renewalRisk,
    renewal_risk_basis: renewalRiskBasis,
    next_qbr_at: nextQbrAt,
    renewal_at: renewalAt,
    expansion_opportunity: optionalText(body.expansionOpportunity, 2000),
    advocate_readiness: advocateReadiness,
    notification_preferences: jsonPlan(body.notificationPreferences),
    updated_by: viewer.id,
  };

  try {
    const existing = await readProfile(viewer, context.organizationId, context.projectId);
    const rows = existing
      ? await supabaseRest<ProfileRow[]>(`customer_success_profiles?id=eq.${existing.id}&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}`, { method: "PATCH", token: viewer.accessToken, prefer: "return=representation", body: profileBody })
      : await supabaseRest<ProfileRow[]>("customer_success_profiles", { method: "POST", token: viewer.accessToken, prefer: "return=representation", body: { organization_id: context.organizationId, project_id: context.projectId, ...profileBody } });
    return NextResponse.json({ profile: rows[0] || null });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ error: "Customer Success is not enabled for this workspace yet.", migrationPending: true }, { status: 503 });
    throw error;
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await requireViewer("/app/settings/customer-success");
  if (viewer.mode === "demo") return NextResponse.json({ error: "The fictional demo cannot create customer-success reviews." }, { status: 403 });
  const [role, context] = await Promise.all([getPrimaryWorkspaceRole(viewer), loadWorkspaceContext(viewer)]);
  if (!canManage(role)) return NextResponse.json({ error: "Your workspace role cannot add customer-success reviews." }, { status: 403 });
  if (!context) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reviewType = choice(body.reviewType, REVIEW_TYPES, "success_review");
  const summary = clean(body.summary, 5000);
  if (summary.length < 3) return NextResponse.json({ error: "A review summary is required." }, { status: 400 });
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  if (body.periodStart) periodStart = clean(body.periodStart, 10);
  if (body.periodEnd) periodEnd = clean(body.periodEnd, 10);
  if (periodStart && !/^\d{4}-\d{2}-\d{2}$/.test(periodStart)) return NextResponse.json({ error: "Period start must be YYYY-MM-DD." }, { status: 400 });
  if (periodEnd && !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) return NextResponse.json({ error: "Period end must be YYYY-MM-DD." }, { status: 400 });

  try {
    const profile = await readProfile(viewer, context.organizationId, context.projectId);
    if (!profile) return NextResponse.json({ error: "Save the customer-success plan before adding a review." }, { status: 409 });
    const rows = await supabaseRest<ReviewRow[]>("customer_success_reviews", {
      method: "POST",
      token: viewer.accessToken,
      prefer: "return=representation",
      body: {
        organization_id: context.organizationId,
        project_id: context.projectId,
        customer_success_profile_id: profile.id,
        review_type: reviewType,
        period_start: periodStart,
        period_end: periodEnd,
        summary,
        operational_value: jsonPlan(body.operationalValue),
        // Economic value is intentionally withheld from this manual endpoint.
        // A future verified economic connector can write a separately evidenced
        // review, but ordinary CS notes cannot become dollar ROI by assertion.
        economic_value_status: "not_demonstrated",
        economic_value_amount: null,
        economic_value_currency: null,
        economic_value_basis: null,
        health_score_snapshot: profile.health_score === null ? null : Number(profile.health_score),
        renewal_risk_snapshot: profile.renewal_risk,
        actor_id: viewer.id,
      },
    });
    return NextResponse.json({ review: rows[0] || null }, { status: 201 });
  } catch (error) {
    if (isMissingRelationError(error)) return NextResponse.json({ error: "Customer Success is not enabled for this workspace yet.", migrationPending: true }, { status: 503 });
    throw error;
  }
}
