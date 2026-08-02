"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SourceCrawlerAccess, SourceInspectionResult } from "@/lib/source-inspection";

const accessLabel: Record<SourceCrawlerAccess, string> = {
  open: "Reachable",
  partial: "Partially inspectable",
  blocked: "Automated access blocked",
  unknown: "Unavailable or unknown",
};

type MonitoredInspection = SourceInspectionResult & { monitoringEvent?: "unreachable" | "content_changed" | null };

export function SourceLiveInspector({ entryId, demo, canInspect }: { entryId: string; demo: boolean; canInspect: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [inspection, setInspection] = useState<MonitoredInspection | null>(null);
  const [message, setMessage] = useState("");

  async function inspect() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/sources/${entryId}/inspect`, { method: "POST" });
      const result = await response.json() as { data?: MonitoredInspection; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "The source could not be inspected.");
      setInspection(result.data);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The source could not be inspected.");
    } finally {
      setBusy(false);
    }
  }

  const disabledReason = demo
    ? "Live fetching is disabled in the fictional demo."
    : !canInspect
      ? "Viewer access is read-only."
      : "";

  return <section className="panel source-inspector" aria-labelledby="source-inspector-title">
    <div>
      <span className="eyebrow">Live page check</span>
      <h2 id="source-inspector-title">Inspect the cited page safely.</h2>
      <p>This bounded check records reachability, response status, content type, redirects, and the page title. It does not execute scripts, store the page body, or claim that a person reviewed its claims.</p>
    </div>
    <div className="source-inspector__action">
      <button className="button button--ink" type="button" onClick={() => void inspect()} disabled={busy || demo || !canInspect}>
        {busy ? "Inspecting…" : "Inspect live page"}
      </button>
      {disabledReason && <small>{disabledReason}</small>}
    </div>
    {inspection && <dl className="source-inspector__result" aria-live="polite">
      <div><dt>Result</dt><dd>{accessLabel[inspection.access]}</dd></div>
      <div><dt>HTTP</dt><dd>{inspection.httpStatus ?? "No response"}</dd></div>
      <div><dt>Content</dt><dd>{inspection.contentType || "Unknown"}</dd></div>
      <div><dt>Redirects</dt><dd>{inspection.redirectCount}</dd></div>
      <div className="source-inspector__wide"><dt>Checked</dt><dd>{new Date(inspection.checkedAt).toLocaleString()}</dd></div>
      <div className="source-inspector__wide"><dt>Inspector note</dt><dd>{inspection.message}</dd></div>
      {inspection.pageTitle && <div className="source-inspector__wide"><dt>Observed title</dt><dd>{inspection.pageTitle}</dd></div>}
      {inspection.monitoringEvent && <div className="source-inspector__wide"><dt>Change alert</dt><dd>{inspection.monitoringEvent === "unreachable" ? "This source became unreachable." : "The bounded page fingerprint changed materially."}</dd></div>}
    </dl>}
    {message && <p className="inline-notice" role="alert">{message}</p>}
  </section>;
}
