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

function textField(record: Record<string, unknown>, key: string) {
  return typeof record[key] === "string" ? String(record[key]) : "";
}

export function VendorPassportPanel({ passport }: { passport: VendorPassport }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const serialized = useMemo(() => serializeVendorPassport(passport), [passport]);
  const statements = Array.isArray(passport.document.subjectOf)
    ? passport.document.subjectOf.filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value))
    : [];
  const companyName = textField(passport.document, "name") || "Company name not verified";
  const website = textField(passport.document, "url");
  const category = textField(passport.document, "description");

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
        <span className="eyebrow">Company facts safe to publish</span>
        <h2>{companyName}</h2>
        <p>This view shows what a person can understand first. The machine-readable JSON-LD remains available under Advanced for your website or technical team.</p>
      </div>
      <button className="button button--ink" type="button" onClick={copy} aria-describedby={copyStatus === "idle" ? undefined : "vendor-passport-copy-status"}>{copyStatus === "copied" ? "Copied" : "Copy JSON-LD"}</button>
    </div>
    {copyStatus !== "idle" && <p className="vendor-passport__notice" id="vendor-passport-copy-status" role="status" aria-live="polite">{copyStatus === "copied" ? "The safe JSON-LD record was copied to your clipboard." : "Clipboard access was unavailable. Open Advanced JSON-LD below and copy it manually."}</p>}

    <div className="data-quality-grid">
      <div><span>Website</span><strong>{website ? "Verified format" : "Missing"}</strong><small>{website || "No publishable URL recorded"}</small></div>
      <div><span>Category</span><strong>{category || "Missing"}</strong><small>publisher-supplied workspace context</small></div>
      <div><span>Statements ready</span><strong>{statements.length}</strong><small>verified and approved for public use</small></div>
      <div><span>Generated</span><strong>{passport.generatedAt ? new Date(passport.generatedAt).toLocaleDateString() : "—"}</strong><small>this record is dated, not timeless</small></div>
    </div>

    {statements.length ? <div className="vendor-passport__gaps"><strong>Publishable statements</strong><ul>{statements.map((statement, index) => {
      const citation = statement.citation && typeof statement.citation === "object" && !Array.isArray(statement.citation) ? statement.citation as Record<string, unknown> : null;
      const citationUrl = citation ? textField(citation, "url") : "";
      const limitation = textField(statement, "disambiguatingDescription");
      return <li key={`${textField(statement, "text")}-${index}`}><span>{textField(statement, "text")}</span>{limitation && <> — Limitation: {limitation}</>}{citationUrl && <> — <a href={citationUrl} target="_blank" rel="noreferrer">Evidence ↗</a></>}</li>;
    })}</ul></div> : <p className="vendor-passport__notice" role="status">No statement is eligible to publish yet. Approve a claim for public use in the Evidence Vault and link it to verified evidence with recorded usage rights.</p>}

    {passport.unverifiedFields.length > 0 && <div className="vendor-passport__gaps">
      <strong>Still unverified</strong>
      <ul>{passport.unverifiedFields.map((field) => <li key={field}><code>{field}</code></li>)}</ul>
      <p>These fields are absent from the record on purpose. Foremention reports a gap instead of estimating a value.</p>
    </div>}

    {passport.excluded.length > 0 && <div className="vendor-passport__gaps">
      <strong>Held back from publication ({passport.excluded.length})</strong>
      <ul>{passport.excluded.map((entry) => <li key={entry.id}><span>{entry.wording || "Untitled statement"}</span> — {EXCLUSION_LABEL[entry.reason] || entry.reason}</li>)}</ul>
    </div>}

    <details>
      <summary>Advanced: publishable record (JSON-LD)</summary>
      <p>Add this JSON-LD to a <code>&lt;script type=&quot;application/ld+json&quot;&gt;</code> tag on a page you control. Re-generate it whenever verified statements change.</p>
      <pre className="vendor-passport__code" tabIndex={0} aria-label="Vendor Passport JSON-LD"><code>{serialized}</code></pre>
    </details>
  </section>;
}
