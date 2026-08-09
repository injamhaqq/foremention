import Link from "next/link";
import { VendorPassportPanel } from "@/components/vendor-passport-panel";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";
import { buildVendorPassport, type PassportClaim } from "@/lib/vendor-passport";
import { supabaseRest } from "@/lib/supabase-rest";

type ClaimRow = {
  id: string;
  approved_wording: string;
  limitations: string | null;
  public_use: boolean;
  verification_status: "pending" | "verified" | "disputed";
  verified_at: string | null;
  expires_at: string | null;
  evidence: { source_url: string | null; title: string | null; usage_rights: string | null; verification_status: string | null } | null;
};

export default async function PassportPage() {
  const viewer = await requireViewer("/app/passport");
  const context = await loadWorkspaceContext(viewer);
  const generatedAt = new Date().toISOString();

  if (viewer.mode === "demo" || !context) {
    return <main className="workspace">
      <div className="workspace-heading"><div><span className="eyebrow">Agent-readable record</span><h1>Vendor Passport</h1><p>Publish a structured, dated, citable description of your company on your own domain, so AI buyer agents can read and verify it instead of guessing.</p></div><Link className="button button--outline" href="/app/evidence">Open Evidence Vault</Link></div>
      <section className="panel"><div className="empty-state"><h2>{viewer.mode === "demo" ? "The fictional demo has no verified statements." : "Complete onboarding first."}</h2><p>A passport is assembled only from claims your team approved for public use and linked to dated evidence. The demo stays read-only and never produces a publishable record.</p><Link className="button button--ink" href={viewer.mode === "demo" ? "/signup" : "/app/onboarding"}>{viewer.mode === "demo" ? "Create your workspace →" : "Continue onboarding →"}</Link></div></section>
    </main>;
  }

  const rows = await supabaseRest<ClaimRow[]>(
    `verified_claims?select=id,approved_wording,limitations,public_use,verification_status,verified_at,expires_at,evidence:evidence_items(source_url,title,usage_rights,verification_status)&organization_id=eq.${context.organizationId}&project_id=eq.${context.projectId}&order=id.asc&limit=200`,
    { token: viewer.accessToken },
  );
  const claims: PassportClaim[] = rows.map((row) => ({
    id: row.id,
    approvedWording: row.approved_wording,
    limitations: row.limitations,
    publicUse: row.public_use,
    claimVerificationStatus: row.verification_status,
    verifiedAt: row.verified_at,
    expiresAt: row.expires_at,
    evidenceUrl: row.evidence?.source_url ?? null,
    evidenceTitle: row.evidence?.title ?? null,
    evidenceUsageRights: row.evidence?.usage_rights ?? null,
    evidenceVerificationStatus: row.evidence?.verification_status ?? null,
  }));
  const passport = buildVendorPassport({
    organization: { name: context.organizationName, website: context.website, category: context.category },
    claims,
    generatedAt,
  });

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Agent-readable record</span><h1>Vendor Passport</h1><p>Publish a structured, dated, citable description of your company on your own domain, so AI buyer agents can read and verify it instead of guessing.</p></div><Link className="button button--outline" href="/app/evidence">Open Evidence Vault</Link></div>
    <div className="metric-grid metric-grid--compact"><article><span>Verified statements</span><strong>{passport.included}</strong><small>approved for public use</small></article><article><span>Held back</span><strong>{passport.excluded.length}</strong><small>not eligible to publish</small></article><article><span>Unverified fields</span><strong>{passport.unverifiedFields.length}</strong><small>reported, never guessed</small></article><article><span>Claims reviewed</span><strong>{claims.length}</strong><small>in this workspace</small></article></div>
    <VendorPassportPanel passport={passport} />
    <aside className="panel outcome-ledger__boundary"><strong>Publishing boundary</strong><p>Foremention generates this record; your team publishes it on a domain you control. Foremention never posts it for you, never asserts rankings, citations, traffic, leads, or revenue, and never claims an AI provider will recommend you. A statement missing verified evidence is withheld rather than estimated.</p></aside>
  </main>;
}
