"use client";

import { useCallback, useEffect, useState } from "react";
import { trackProductEvent } from "@/lib/product-analytics";

type Schedule = {
  id: string;
  cadence: "weekly" | "biweekly" | "monthly";
  timezone: string;
  provider_ids?: string[];
  question_ids?: string[];
  locale?: string;
  market?: string;
  enabled: boolean;
  next_run_at: string;
  last_run_at?: string | null;
};

const labelDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value)) : "Not run yet";

export function MeasurementScheduleControl() {
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/schedules", { cache: "no-store" });
    const payload = await response.json().catch(() => ({})) as { data?: Schedule[]; error?: string };
    if (response.ok) { setItems(payload.data || []); setError(null); }
    else setError(payload.error || "Measurement schedules are unavailable.");
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createSchedule() {
    setPending(true); setError(null);
    const response = await fetch("/api/schedules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cadence: "weekly", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(payload.error || "The schedule could not be enabled.");
    else {
      trackProductEvent("measurement_schedule_enabled", { cadence: "weekly", schedule_state: "enabled" });
      await refresh();
    }
    setPending(false);
  }

  async function setEnabled(schedule: Schedule, enabled: boolean) {
    setPending(true); setError(null);
    const response = await fetch("/api/schedules", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: schedule.id, enabled }) });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setError(payload.error || "The schedule could not be updated.");
    else await refresh();
    setPending(false);
  }

  return <section className="retention-panel measurement-schedule" id="measurement-schedule" aria-labelledby="measurement-schedule-title">
    <div className="retention-panel__heading"><div><span className="eyebrow">Recurring measurement</span><h2 id="measurement-schedule-title">Repeat the same evidence contract.</h2></div>{!items.length && !loading && <button className="button button--ink" disabled={pending} onClick={createSchedule}>{pending ? "Enabling…" : "Enable weekly remeasurement"}</button>}</div>
    <p>Foremention reuses approved questions with one connected provider and preserves methodology, locale and market context. Movement is shown only after an exact human-reviewed comparison exists.</p>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {loading ? <p className="table-caption">Loading measurement schedule…</p> : items.length ? <div className="schedule-list">{items.map((schedule) => <article key={schedule.id}>
      <div><strong>{schedule.cadence === "biweekly" ? "Every 2 weeks" : schedule.cadence === "monthly" ? "Monthly" : "Weekly"}</strong><small>{schedule.timezone} · {schedule.locale || "en-US"} · {schedule.market || "global"}</small></div>
      <div><span>Next eligible run</span><strong>{labelDate(schedule.next_run_at)}</strong><small>Last run: {labelDate(schedule.last_run_at)}</small></div>
      <button className="button button--outline" disabled={pending} onClick={() => void setEnabled(schedule, !schedule.enabled)}>{schedule.enabled ? "Pause" : "Resume"}</button>
    </article>)}</div> : <div className="retention-truth-note"><strong>No recurring collection is active.</strong><span>Nothing will run automatically until you enable it.</span></div>}
  </section>;
}
