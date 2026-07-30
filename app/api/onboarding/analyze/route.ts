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
  if (!website) return NextResponse.json({ error: "Enter your complete company website, including https://." }, { status: 400 });

  try {
    const publicUrl = validatePublicSourceUrl(website);
    const inspection = await inspectSourceUrl(publicUrl.toString(), { maxBytes: 192 * 1024, timeoutMs: 8_000 });
    if (!inspection.pageTitle && !inspection.pageDescription) {
      return NextResponse.json({
        error: "We could not read enough public website information to create a reliable draft. You can continue manually.",
      }, { status: 422 });
    }

    const draft = createOnboardingDraft({
      websiteUrl: inspection.finalUrl,
      pageTitle: inspection.pageTitle,
      pageDescription: inspection.pageDescription,
    });
    return NextResponse.json({
      ok: true,
      draft,
      evidence: {
        checkedAt: inspection.checkedAt,
        finalUrl: inspection.finalUrl,
        pageTitle: inspection.pageTitle,
        source: "Public website metadata",
      },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof SourceInspectionError
      ? error.message
      : "We could not inspect that website safely. Check the address or continue manually.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
