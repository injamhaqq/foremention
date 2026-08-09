"use client";

import { useMemo, useState } from "react";
import { serializeVendorPassport, type VendorPassport } from "@/lib/vendor-passport";

const EXCLUSION_LABEL: Record<string, string> = {
  not_approved_for_public_use: "Not approved for public use",
  not_verified: "Evidence is not verified",
  expired: "Evidence or claim has expired",
  missing_evidence: "Missing a source URL or recorded usage rights",
  unsupported_outcome_claim: "States an outcome Foremention cannot verify",
};

export function VendorPassportPanel({ passport }: { passport: VendorPassport }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const serialized = useMemo(() => serializeVendorPassport(passport), [passport]);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(serialized);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
    }
  }

  return <section className="panel vendor-passport">
    <div className="vendor-passport__head">
      <div>
        <h2>Publishable record</h2>
        <p>Add this JSON-LD to a <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code> tag on a page you control. Re-generate it whenever your verified statements change.</p>
      </div>
      <button className="button button--ink" type="button" onClick={copy} aria-describedby={copyStatus === "idle" ? undefined : "vendor-passport-copy-status"}>{copyStatus === "copied" ? "Copied" : "Copy JSON-LD"}</button>
    </div>
    {copyStatus !== "idle" && <p className="vendor-passport__notice" id="vendor-passport-copy-status" role="status" aria-live="polite">{copyStatus === "copied" ? "The safe JSON-LD record was copied to your clipboard." : "Clipboard access was unavailable. Select the JSON-LD below and copy it manually."}</p>}

    {passport.included === 0 && <p className="vendor-passport__notice" role="status">No statement is eligible to publish yet. Approve a claim for public use in the Evidence Vault and link it to verified evidence with recorded usage rights.</p>}

    <pre className="vendor-passport__code" tabIndex={0} aria-label="Vendor Passport JSON-LD"><code>{serialized}</code></pre>

    {passport.unverifiedFields.length > 0 && <div className="vendor-passport__gaps">
      <strong>Reported as unverified</strong>
      <ul>{passport.unverifiedFields.map((field) => <li key={field}><code>{field}</code></li>)}</ul>
      <p>These fields are absent from the record on purpose. Foremention reports a gap instead of estimating a value.</p>
    </div>}

    {passport.excluded.length > 0 && <div className="vendor-passport__gaps">
      <strong>Held back from publication ({passport.excluded.length})</strong>
      <ul>{passport.excluded.map((entry) => <li key={entry.id}><span>{entry.wording || "Untitled statement"}</span> — {EXCLUSION_LABEL[entry.reason] || entry.reason}</li>)}</ul>
    </div>}
  </section>;
}
