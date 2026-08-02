import type { VisibilityRun } from "@/lib/types";

export function RunComparisonSelector({ runs }: { runs: VisibilityRun[] }) {
  const completed = runs.filter((run) => ["complete", "partial"].includes(run.status));
  return <form className="run-comparison-selector" action="/app/runs/compare" method="get">
    <div><span className="eyebrow">Run comparison</span><strong>Compare any two completed collections.</strong></div>
    <label>Earlier run<select name="left" required defaultValue={completed[1]?.id || ""}><option value="" disabled>Select a run</option>{completed.map((run) => <option value={run.id} key={`left-${run.id}`}>{run.date} · {run.id.slice(0, 8)} · {run.status}</option>)}</select></label>
    <label>Later run<select name="right" required defaultValue={completed[0]?.id || ""}><option value="" disabled>Select a run</option>{completed.map((run) => <option value={run.id} key={`right-${run.id}`}>{run.date} · {run.id.slice(0, 8)} · {run.status}</option>)}</select></label>
    <button className="button button--ink" type="submit" disabled={completed.length < 2}>Compare runs</button>
    {completed.length < 2 && <small>Two completed or partial runs are required.</small>}
  </form>;
}
