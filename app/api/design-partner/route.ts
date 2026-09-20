import { NextResponse } from "next/server";
import { sendProductAlertEmail } from "@/lib/application-email";
import { designPartnerSubmissionKey, normalizeDesignPartnerApplication, type DesignPartnerApplication } from "@/lib/design-partner";
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

const operatorEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function operatorRecipients() {
  return (process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value, index, values) => operatorEmailPattern.test(value) && values.indexOf(value) === index)
    .slice(0, 5);
}

async function notifyDesignPartnerOperators(application: DesignPartnerApplication, keyHash: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const recipients = operatorRecipients();
  if (!recipients.length) return;

  const questionSummary = application.buyerQuestions.length
    ? application.buyerQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")
    : "Not supplied yet.";

  const text = [
    "New Foremention design-partner application.",
    "",
    `Company: ${application.company}`,
    `Work email: ${application.email}`,
    `Role: ${application.role}`,
    `Category: ${application.category}`,
    "",
    "Priority buyer questions:",
    questionSummary,
    "",
    `Current decision/problem: ${application.currentProblem || "Not supplied yet."}`,
    "",
    "Stage-0 operating target: review within one business day. This application is not a customer, paid pilot, or traction claim until first-party commercial evidence supports that state.",
  ].join("\n");

  await Promise.allSettled(recipients.map((to, index) => sendProductAlertEmail({
    to,
    subject: `Foremention design-partner application — ${application.company}`,
    text,
    idempotencyKey: `design-partner-application-${keyHash}-${index}`,
  })));
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
    await notifyDesignPartnerOperators(normalized.value, keyHash);
  } catch {
    return responseFor(request, 503, "Applications are temporarily unavailable. Email hello@foremention.com instead.");
  }

  return responseFor(request, 201, "Application received.");
}
