import { NextResponse } from "next/server";
import { designPartnerSubmissionKey, normalizeDesignPartnerApplication } from "@/lib/design-partner";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { supabaseRest } from "@/lib/supabase-rest";

function wantsFormResponse(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
}

function responseFor(request: Request, status: number, message: string) {
  if (wantsFormResponse(request)) {
    const target = new URL("/contact", request.url);
    target.searchParams.set(status < 300 ? "submitted" : "error", "1");
    return NextResponse.redirect(target, 303);
  }
  return NextResponse.json(status < 300 ? { received: true } : { error: message }, { status });
}

function limitedResponse(request: Request) {
  if (wantsFormResponse(request)) {
    const target = new URL("/contact", request.url);
    target.searchParams.set("error", "rate-limit");
    return NextResponse.redirect(target, 303);
  }
  return NextResponse.json({ error: "Too many recent applications. Please try again later." }, { status: 429 });
}

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });

  const contentType = request.headers.get("content-type") || "";
  let input: Record<string, unknown>;
  try {
    if (contentType.includes("application/json")) {
      input = await request.json() as Record<string, unknown>;
    } else {
      const form = await request.formData();
      input = Object.fromEntries(form.entries());
    }
  } catch {
    return responseFor(request, 400, "The application could not be read.");
  }

  // Silent honeypot success keeps obvious form bots from learning the filter.
  if (typeof input.website === "string" && input.website.trim()) return responseFor(request, 201, "Application received.");

  const normalized = normalizeDesignPartnerApplication(input);
  if (!normalized.ok) return responseFor(request, 400, normalized.error);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return responseFor(request, 503, "Applications are temporarily unavailable. Email hello@foremention.com instead.");

  try {
    const keyHash = await designPartnerSubmissionKey(normalized.value);
    const claim = await supabaseRest<string>("rpc/claim_design_partner_submission", {
      method: "POST",
      serviceRole: true,
      body: { p_key_hash: keyHash },
    });
    if (claim === "duplicate") return responseFor(request, 201, "Application received.");
    if (claim === "limited") return limitedResponse(request);
    if (claim !== "accepted") throw new Error("Unexpected submission claim state.");

    await supabaseRest("design_partner_applications", {
      method: "POST",
      serviceRole: true,
      prefer: "return=minimal",
      body: {
        email: normalized.value.email,
        company: normalized.value.company,
        role_title: normalized.value.role,
        category: normalized.value.category,
        buyer_questions: normalized.value.buyerQuestions,
        current_problem: normalized.value.currentProblem,
        plan_interest: normalized.value.planInterest,
        source: "website_design_partner",
      },
    });
  } catch {
    return responseFor(request, 503, "Applications are temporarily unavailable. Email hello@foremention.com instead.");
  }

  return responseFor(request, 201, "Application received.");
}
