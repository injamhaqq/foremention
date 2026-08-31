"use client";

import Link from "next/link";
import { useEffect } from "react";
import { captureProductEvent } from "@/lib/product-analytics";

type SharedRecordViewMode = "stakeholder" | "executive";

export function SharedRecordActions({ viewMode, includeEvidence }: { viewMode: SharedRecordViewMode; includeEvidence: boolean }) {
  useEffect(() => {
    captureProductEvent("record_share_viewed", { view_mode: viewMode, include_evidence: includeEvidence });
  }, [includeEvidence, viewMode]);

  const alternateMode: SharedRecordViewMode = viewMode === "executive" ? "stakeholder" : "executive";
  const alternateLabel = alternateMode === "executive" ? "Executive view" : "Stakeholder view";

  return <section className="shared-record-footer" aria-label="Shared Recommendation Record actions">
    <div>
      <strong>Shared with Foremention</strong>
      <p>This is a privacy-first, read-only shared-record view. The workspace, private notes, credentials, and unrelated customer data remain outside this link.</p>
    </div>
    <p><Link href={`?view=${alternateMode}`}>{alternateLabel}</Link> · <Link href={`/signup?source=shared-record&view=${viewMode}`} onClick={() => captureProductEvent("record_share_workspace_cta_clicked", { view_mode: viewMode })}>Create a Foremention workspace</Link></p>
  </section>;
}
