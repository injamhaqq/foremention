"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderStatus, WorkspacePrompt } from "@/lib/data";

export function RunLauncher({ prompts, providers, demo }: { prompts: WorkspacePrompt[]; providers: ProviderStatus[]; demo: boolean }) {
  const router = useRouter();
  const active = prompts.filter((prompt) => prompt.approved);
  const [selectedPrompts, setSelectedPrompts] = useState(active.slice(0, 1).map((prompt) => prompt.id));
  const [selectedProviders, setSelectedProviders] = useState<string[]>(demo ? ["mock"] : providers.filter((provider) => provider.configured).slice(0, 1).map((provider) => provider.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const idempotencyKey = useRef(crypto.randomUUID());

  async function run() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": idempotencyKey.current },
        body: JSON.stringify({ promptIds: selectedPrompts, providers: selectedProviders }),
      });
      const result = (await response.json()) as { error?: string; note?: string };
      if (!response.ok) throw new Error(result.error || "Could not start collection.");
      setMessage(result.note || "Collection queued. Results will move to review when providers finish.");
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start collection."); }
    finally { setBusy(false); }
  }

  const selectableProviders = demo ? [{ id: "mock", label: "Safe demo", configured: true }] : providers;
  return <section className="panel run-launcher">
    <div className="panel-heading"><div><span className="eyebrow">New collection</span><h2>Run an approved evidence set.</h2></div><span className="capacity-chip">{selectedPrompts.length * selectedProviders.length} observations</span></div>
    <div className="run-config-grid">
      <fieldset><legend>Buyer questions</legend>{active.length ? active.map((prompt) => <label key={prompt.id}><input type="checkbox" checked={selectedPrompts.includes(prompt.id)} onChange={(event) => setSelectedPrompts((current) => event.target.checked ? [...current, prompt.id] : current.filter((id) => id !== prompt.id))} /><span>{prompt.text}</span></label>) : <p>No active questions. Add one in Buyer Questions first.</p>}</fieldset>
      <fieldset><legend>Provider · choose one</legend>{selectableProviders.map((provider) => <label key={provider.id} className={!provider.configured ? "is-disabled" : ""}><input type="radio" name="collection-provider" disabled={!provider.configured} checked={selectedProviders[0] === provider.id} onChange={() => setSelectedProviders([provider.id])} /><span><strong>{provider.label}</strong><small>{provider.configured ? "Connected" : "Not connected"}</small></span></label>)}</fieldset>
    </div>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="run-launcher__actions"><p>Provider credentials remain server-side. Each run uses one provider, strict quotas and a hard cost ceiling. Failures remain visible.</p><button className="button button--ink" type="button" onClick={() => void run()} disabled={busy || !selectedPrompts.length || selectedProviders.length !== 1}>{busy ? "Queuing…" : "Start collection"}</button></div>
  </section>;
}
