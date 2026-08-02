import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { generateBuyerQuestions } from "@/lib/onboarding-profile";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

type OnboardingPayload = {
  companyName?: string;
  domain?: string;
  market?: string;
  category?: string;
  categoryDescription?: string;
  competitors?: string[];
  goal?: string;
  constraint?: string;
  prompts?: string[];
  locale?: string;
};

const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = (await request.json()) as OnboardingPayload;
  const submittedCompetitors = (raw.competitors || []).map((value) => clean(value, 120)).filter(Boolean).slice(0, 20);
  const generatedPrompts = generateBuyerQuestions(
    clean(raw.category, 160),
    clean(raw.companyName, 120),
    submittedCompetitors,
    clean(raw.market, 120) === "Global" ? "a growing global business team" : `a growing team in ${clean(raw.market, 120)}`,
  );
  const submittedPrompts = (raw.prompts || []).map((value) => clean(value, 1000)).filter(Boolean).slice(0, 5);
  const prompts = Array.from(new Set([...submittedPrompts, ...generatedPrompts])).slice(0, 5);
  const payload = {
    companyName: clean(raw.companyName, 120),
    domain: clean(raw.domain, 500),
    market: clean(raw.market, 120),
    category: clean(raw.category, 160),
    categoryDescription: clean(raw.categoryDescription, 2000),
    competitors: submittedCompetitors,
    goal: clean(raw.goal, 500),
    constraint: clean(raw.constraint, 1000),
    prompts,
    locale: clean(raw.locale, 20) || "en-US",
  };
  if (!payload.companyName || !payload.domain || !payload.category) return NextResponse.json({ error: "Company, domain, and category are required." }, { status: 400 });
  try {
    const url = new URL(payload.domain);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid company URL.");
  } catch {
    return NextResponse.json({ error: "Enter a complete public company URL, including https://." }, { status: 400 });
  }
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, demo: true, promptCount: payload.prompts.length });
  try {
    const existing = await loadWorkspaceContext(viewer);
    if (existing) {
      return NextResponse.json({
        ok: true,
        existing: true,
        organizationId: existing.organizationId,
        projectId: existing.projectId,
        categoryId: existing.categoryId,
      });
    }
    const result = await supabaseRest<Record<string, unknown>>("rpc/complete_onboarding", { method: "POST", token: viewer.accessToken, body: { payload } });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete onboarding." }, { status: 400 });
  }
}
