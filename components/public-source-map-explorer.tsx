"use client";

import { useMemo, useState } from "react";
import { StatusDot } from "@/components/brand";
import type { SourceMapEntry } from "@/lib/types";

const filters = ["All", "High influence", "Source gaps", "High feasibility"];

export function PublicSourceMapExplorer({ entries }: { entries: SourceMapEntry[] }) {
  const [filter, setFilter] = useState(filters[0]);
  const rows = useMemo(() => entries.filter((entry) => {
    if (filter === "High influence") return entry.influence === "high";
    if (filter === "Source gaps") return !entry.clientPresent;
    if (filter === "High feasibility") return entry.feasibility === "high";
    return true;
  }), [entries, filter]);

  return (
    <div className="public-explorer">
      <div className="public-explorer__filters" aria-label="Filter sample Source Map">
        {filters.map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)} type="button">{item}</button>)}
      </div>
      <div className="public-explorer__grid">
        {rows.map((entry) => (
          <article key={entry.id}>
            <div className="public-explorer__rank"><span>{String(entry.rank).padStart(2, "0")}</span><b>{entry.influence} influence</b></div>
            <h3>{entry.domain}</h3>
            <p>{entry.title}</p>
            <dl>
              <div><dt>Evidence</dt><dd>{entry.evidenceCount} observations</dd></div>
              <div><dt>Presence</dt><dd><StatusDot tone={entry.clientPresent ? "green" : "red"} />{entry.clientPresent ? "Present" : "Absent"}</dd></div>
              <div><dt>Route</dt><dd>{entry.route}</dd></div>
              <div><dt>Feasibility</dt><dd>{entry.feasibility}</dd></div>
            </dl>
          </article>
        ))}
      </div>
      {!rows.length && <div className="empty-state"><h2>No sources match this filter.</h2><p>Choose another view to continue exploring the sample.</p></div>}
    </div>
  );
}
