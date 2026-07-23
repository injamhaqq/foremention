import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
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
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const raw = (await request.json()) as OnboardingPayload;
  const payload = {
    companyName: clean(raw.companyName, 120),
    domain: clean(raw.domain, 500),
    market: clean(raw.market, 120),
    category: clean(raw.category, 160),
    categoryDescription: clean(raw.categoryDescription, 2000),
    competitors: (raw.competitors || []).map((value) => clean(value, 120)).filter(Boolean).slice(0, 20),
    goal: clean(raw.goal, 500),
    constraint: clean(raw.constraint, 1000),
    prompts: (raw.prompts || []).map((value) => clean(value, 1000)).filter(Boolean).slice(0, 100),
    locale: clean(raw.locale, 20) || "en-US",
  };
  if (!payload.companyName || !payload.domain || !payload.category || !payload.prompts.length) return NextResponse.json({ error: "Company, domain, category, and one approved prompt are required." }, { status: 400 });
  try { new URL(payload.domain); } catch { return NextResponse.json({ error: "Enter a complete company URL, including https://." }, { status: 400 }); }
  if (viewer.mode === "demo") return NextResponse.json({ ok: true, demo: true, promptCount: payload.prompts.length });
  try {
    const result = await supabaseRest<Record<string, unknown>>("rpc/complete_onboarding", { method: "POST", token: viewer.accessToken, body: { payload } });
    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not complete onboarding." }, { status: 400 });
  }
}
