"use client";

import { useState } from "react";

/** Private, reviewer-only download; the server rechecks all authorization and evidence gates. */
export function DecisionReviewDownload({ recordId, decisionId }: { recordId: string; decisionId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function download() {
    if (loading) return;
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch(
        `/api/records/${encodeURIComponent(recordId)}/decision-report?decisionId=${encodeURIComponent(decisionId)}`,
        { method: "GET", cache: "no-store", credentials: "same-origin" },
      );
      if (!response.ok) {
        const data: unknown = await response.json().catch(() => null);
        const error = data && typeof data === "object" && "error" in data
          ? (data as { error?: unknown }).error : null;
        setMessage(typeof error === "string" ? error.slice(0, 500) : "The complete decision packet could not be verified.");
        return;
      }
      const markdown = await response.text();
      if (!markdown.startsWith("# Foremention · Human Decision")) {
        setMessage("The server returned an unexpected report. No file was saved.");
        return;
      }
      const blob = new Blob([markdown], { type: "text/markdown; charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `foremention-decision-${recordId.slice(0, 8)}.md`;
      document.body.append(link);
      link.click();
      link.remove();
      // Defer revocation so the download remains valid during browser dispatch.
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      setMessage("Decision packet download requested.");
    } catch {
      setMessage("Download is unavailable. No verified report was provided.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="record-decision-download">
    <button type="button" className="button button--outline" disabled={loading} onClick={download}>
      {loading ? "Checking decision evidence…" : "Download decision review (.md)"}
    </button>
    <p role="status" aria-live="polite" className="table-caption">{message}</p>
  </div>;
}
