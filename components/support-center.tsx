"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  accountHelpHref,
  isWorkspaceSetupRequiredPayload,
  type WorkspaceSetupState,
} from "@/lib/workspace-setup-state";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: "new" | "triaged" | "reply_pending" | "responded" | "closed";
  respondedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

const categoryOptions = [
  ["account", "Account / access"],
  ["collection", "Collection run"],
  ["evidence", "Evidence / Source Map"],
  ["integration", "Integration"],
  ["billing", "Billing / plan"],
  ["other", "Other"],
] as const;

function readableStatus(value: Ticket["status"]) {
  if (value === "new") return "Received";
  if (value === "triaged") return "Under review";
  if (value === "reply_pending") return "Reply under review";
  if (value === "responded") return "Responded";
  return "Closed";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recorded" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function SupportCenter({ demo, setupState }: { demo: boolean; setupState?: WorkspaceSetupState }) {
  // A26: the server-resolved setup state wins; a later explicit API code also
  // switches to it. Generic load errors stay errors (never "empty history").
  const [setupRequired, setSetupRequired] = useState(setupState?.kind === "setup_required");
  const helpHref = setupState?.kind === "setup_required" ? setupState.accountHelpHref : accountHelpHref(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [category, setCategory] = useState("collection");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo && setupState?.kind !== "setup_required");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (demo || setupState?.kind === "setup_required") return;
    try {
      const response = await fetch("/api/support/tickets", { headers: { accept: "application/json" } });
      const payload = await response.json().catch(() => ({})) as { data?: Ticket[]; error?: string; code?: string };
      if (!response.ok && isWorkspaceSetupRequiredPayload(payload)) {
        setSetupRequired(true);
        setError("");
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Support history could not be loaded.");
      setTickets(Array.isArray(payload.data) ? payload.data : []);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Support history could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [demo, setupState?.kind]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (demo || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ category, subject, message }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; code?: string };
      if (!response.ok && isWorkspaceSetupRequiredPayload(payload)) {
        setSetupRequired(true);
        return;
      }
      if (!response.ok) throw new Error(payload.error || "The support request could not be submitted.");
      setSubject("");
      setMessage("");
      setNotice("Support request received. You will see its status here; a reply is sent only after human review.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The support request could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (setupRequired && !demo) {
    return <div className="settings-grid">
      <section className="panel panel--wide" aria-labelledby="support-setup-required">
        <span className="eyebrow">Setup required</span>
        <h2 id="support-setup-required">Your account does not have a workspace yet.</h2>
        <p>In-app support requests attach workspace context, so they become available after workspace setup. You can still get account help now — it does not require a workspace.</p>
        <div className="inline-notice" role="status"><strong>Account help is available.</strong><p>Email <a href={helpHref}>hello@foremention.com</a> from the address you signed in with. Never send passwords, API keys, recovery codes, access tokens, or other secrets.</p></div>
        <p><a className="button button--ink" href={setupState?.kind === "setup_required" ? setupState.setupHref : "/app/onboarding"}>Continue workspace setup</a></p>
      </section>
    </div>;
  }

  return <div className="settings-grid">
    <section className="panel panel--wide">
      <span className="eyebrow">Customer support</span>
      <h2>Tell us what is not working or what you need clarified.</h2>
      <p>Support can inspect your recorded workspace state. Never send passwords, API keys, recovery codes, access tokens, private keys, or other secrets.</p>
      {demo ? <div className="inline-notice"><strong>Demo is read-only.</strong><p>Support requests are not sent from the fictional demo.</p></div> : <form className="intake-form" onSubmit={submit}>
        <label>Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>Subject
          <input value={subject} onChange={(event) => setSubject(event.target.value)} required minLength={3} maxLength={180} placeholder="What do you need help with?" />
        </label>
        <label>Details
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} required minLength={10} maxLength={4000} rows={7} placeholder="Describe what you expected, what happened, and which workspace screen or run is involved." />
        </label>
        {(error || notice) && <p className={error ? "form-error" : "table-caption"} role={error ? "alert" : "status"}>{error || notice}</p>}
        <button className="button button--ink" type="submit" disabled={busy}>{busy ? "Submitting…" : "Send support request"}</button>
      </form>}
    </section>

    <section className="panel panel--wide">
      <span className="eyebrow">Your requests</span>
      <h2>Support history</h2>
      {loading ? <p>Loading support requests…</p> : !tickets.length ? <p className="table-caption">No support requests have been submitted from this account.</p> : <div className="integration-list">
        {tickets.map((ticket) => <div key={ticket.id}>
          <span><strong>{ticket.subject}</strong><small>{ticket.category.replaceAll("_", " ")} · {dateLabel(ticket.createdAt)}</small></span>
          <small>{readableStatus(ticket.status)}{ticket.respondedAt ? ` · replied ${dateLabel(ticket.respondedAt)}` : ""}</small>
        </div>)}
      </div>}
      {!demo && error && !notice && <p className="form-error" role="alert">{error}</p>}
    </section>
  </div>;
}
