import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { generateBuyerQuestions } from "@/lib/onboarding-profile";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";
import { cleanStringArray, cleanText, readJsonObject } from "@/lib/input-validation";

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

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = await readJsonObject(request) as OnboardingPayload | null;
  if (!raw) return NextResponse.json({ error: "Send a valid workspace setup form." }, { status: 400 });
  const submittedCompetitors = cleanStringArray(raw.competitors, 120, 20);
  const generatedPrompts = generateBuyerQuestions(
    cleanText(raw.category, 160),
    cleanText(raw.companyName, 120),
    submittedCompetitors,
    cleanText(raw.market, 120) === "Global" ? "a growing global business team" : `a growing team in ${cleanText(raw.market, 120)}`,
  );
  const submittedPrompts = cleanStringArray(raw.prompts, 1000, 5);
  const prompts = Array.from(new Set([...submittedPrompts, ...generatedPrompts])).slice(0, 5);
  const payload = {
    companyName: cleanText(raw.companyName, 120),
    domain: cleanText(raw.domain, 500),
    market: cleanText(raw.market, 120),
    category: cleanText(raw.category, 160),
    categoryDescription: cleanText(raw.categoryDescription, 2000),
    competitors: submittedCompetitors,
    goal: cleanText(raw.goal, 500),
    constraint: cleanText(raw.constraint, 1000),
    prompts,
    locale: cleanText(raw.locale, 20) || "en-US",
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
