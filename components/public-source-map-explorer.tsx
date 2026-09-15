"use client";

import { useMemo, useState } from "react";
import { StatusDot } from "@/components/brand";
import type { SourceMapEntry } from "@/lib/types";

const filters = ["All", "High influence", "Source gaps", "High feasibility"];
const presenceState = (entry: SourceMapEntry): "present" | "absent" | "unknown" => {
  if (entry.pagePresence) return entry.pagePresence;
  if (entry.reviewedAt) return entry.clientPresent ? "present" : "absent";
  if (entry.clientPresent) return "present";
  return entry.crawlerAccess === "open" || entry.crawlerAccess === "partial" ? "absent" : "unknown";
};

export function PublicSourceMapExplorer({ entries }: { entries: SourceMapEntry[] }) {
  const [filter, setFilter] = useState(filters[0]);
  const rows = useMemo(() => entries.filter((entry) => {
    if (filter === "High influence") return entry.influence === "high";
    if (filter === "Source gaps") return presenceState(entry) === "absent";
    if (filter === "High feasibility") return entry.feasibility === "high";
    return true;
  }), [entries, filter]);

  return (
    <div className="public-explorer">
      <div className="public-explorer__filters" aria-label="Filter sample Source Map">
        {filters.map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)} type="button">{item}</button>)}
      </div>
      <div className="public-explorer__grid">
        {rows.map((entry) => {
          const presence = presenceState(entry);
          return (
            <article key={entry.id}>
              <div className="public-explorer__rank"><span>{String(entry.rank).padStart(2, "0")}</span><b>{entry.influence} influence</b></div>
              <h3>{entry.domain}</h3>
              <p>{entry.title}</p>
              <dl>
                <div><dt>Evidence</dt><dd>{entry.evidenceCount} observations</dd></div>
                <div><dt>Presence</dt><dd><StatusDot tone={presence === "present" ? "green" : presence === "absent" ? "red" : "gray"} />{presence === "present" ? "Present" : presence === "absent" ? "Absent" : "Unknown"}</dd></div>
                <div><dt>Route</dt><dd>{entry.route}</dd></div>
                <div><dt>Feasibility</dt><dd>{entry.feasibility}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
      {!rows.length && <div className="empty-state"><h2>No sources match this filter.</h2><p>Choose another view to continue exploring the sample.</p></div>}
    </div>
  );
}
