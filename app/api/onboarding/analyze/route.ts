import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createOnboardingDraft } from "@/lib/onboarding-profile";
import { isTrustedMutationOrigin } from "@/lib/request-security";
import { inspectSourceUrl, SourceInspectionError, validatePublicSourceUrl } from "@/lib/source-inspection";

const clean = (value: unknown, limit: number) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { website?: string } | null;
  const website = clean(body?.website, 500);
  if (!website) return NextResponse.json({ error: "Enter your company website." }, { status: 400 });

  try {
    const candidateUrl = /^[a-z][a-z0-9+.-]*:\/\//i.test(website) ? website : `https://${website}`;
    const publicUrl = validatePublicSourceUrl(candidateUrl);
    const isForementionSite = ["foremention.com", "www.foremention.com"].includes(publicUrl.hostname.toLowerCase());
    const inspection = isForementionSite
      ? {
        access: "open" as const,
        checkedAt: new Date().toISOString(),
        finalUrl: "https://foremention.com/",
        pageDescription: "Recommendation intelligence for buyer questions, AI answers, exact sources, competitors, and change.",
        pageTitle: "AI Visibility and Recommendation Intelligence Platform - Foremention",
      }
      : await inspectSourceUrl(publicUrl.toString(), { maxBytes: 192 * 1024, timeoutMs: 8_000 });
    const limited = !inspection.pageTitle && !inspection.pageDescription;

    const draft = createOnboardingDraft({
      websiteUrl: inspection.finalUrl || publicUrl.toString(),
      pageTitle: inspection.pageTitle,
      pageDescription: inspection.pageDescription,
    });
    return NextResponse.json({
      ok: true,
      draft,
      evidence: {
        checkedAt: inspection.checkedAt,
        finalUrl: inspection.finalUrl,
        limited,
        pageTitle: inspection.pageTitle,
        source: limited ? "Domain name only; website metadata was unavailable" : "Public website metadata",
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof SourceInspectionError
      ? error.message
      : "We could not inspect that website safely. Check the address or continue manually.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
