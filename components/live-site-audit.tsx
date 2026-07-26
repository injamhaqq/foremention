"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SiteAuditRecord, SiteAuditStatus } from "@/lib/site-audit-data";

const filters: Array<{ label: string; value: "all" | SiteAuditStatus }> = [
  { label: "All evidence", value: "all" },
  { label: "Resolved", value: "resolved" },
  { label: "Passed", value: "passed" },
  { label: "Needs connection", value: "connect" },
];

const statusLabels: Record<SiteAuditStatus, string> = {
  resolved: "Resolved in this release",
  passed: "Verified pass",
  connect: "Needs live connection",
};

export function LiveSiteAudit({ records }: { records: SiteAuditRecord[] }) {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const visible = useMemo(
    () => records.filter((record) => filter === "all" || record.status === filter),
    [filter, records],
  );

  return (
    <div className="site-audit">
      <div className="site-audit__filters" aria-label="Filter live website audit">
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            className={filter === item.value ? "is-active" : ""}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="site-audit__records" aria-live="polite">
        {visible.map((record, index) => (
          <article className={`site-audit-card site-audit-card--${record.status}`} key={record.id}>
            <div className="site-audit-card__head">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{statusLabels[record.status]}</b>
            </div>
            <h3>{record.surface}</h3>
            <dl>
              <div>
                <dt>Observed problem</dt>
                <dd>{record.observed}</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>{record.evidence}</dd>
              </div>
              <div>
                <dt>Current resolution</dt>
                <dd>{record.resolution}</dd>
              </div>
            </dl>
            <Link href={record.evidenceUrl}>Inspect the evidence →</Link>
          </article>
        ))}
      </div>
    </div>
  );
}
