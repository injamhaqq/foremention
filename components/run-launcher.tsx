"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderStatus, WorkspacePrompt } from "@/lib/data";

export function RunLauncher({ prompts, providers, demo }: { prompts: WorkspacePrompt[]; providers: ProviderStatus[]; demo: boolean }) {
  const router = useRouter();
  const active = prompts.filter((prompt) => prompt.approved);
  const preferredProvider = providers.find((provider) => provider.configured && provider.health === "available")
    || providers.find((provider) => provider.configured);
  const [selectedPrompts, setSelectedPrompts] = useState(active.slice(0, 1).map((prompt) => prompt.id));
  const [selectedProviders, setSelectedProviders] = useState<string[]>(demo ? ["mock"] : preferredProvider ? [preferredProvider.id] : []);
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
      const responseText = await response.text();
      const result = responseText
        ? JSON.parse(responseText) as { error?: string; note?: string }
        : {};
      if (!response.ok) {
        throw new Error(result.error || `Could not start collection (HTTP ${response.status}).`);
      }
      setMessage(result.note || "Collection queued. Results will move to review when providers finish.");
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not start collection."); }
    finally { setBusy(false); }
  }

  const selectableProviders = demo ? [{ id: "mock", label: "Safe demo", configured: true, health: "available" as const, latestStatus: "complete", lastTestedAt: null, verifiedAnswers: 0, presencePct: null }] : providers;
  const providerLabel = (provider: typeof selectableProviders[number]) => {
    if (!provider.configured) return "Not configured";
    if (provider.health === "available") return provider.lastTestedAt ? `Proven available · tested ${provider.lastTestedAt}` : "Safe fictional adapter";
    if (provider.health === "limited") return `Latest attempt ${provider.latestStatus?.replaceAll("_", " ") || "failed"}${provider.lastTestedAt ? ` · ${provider.lastTestedAt}` : ""}`;
    return "Configured · production run not yet proven";
  };
  return <section className="panel run-launcher">
    <div className="panel-heading"><div><span className="eyebrow">New collection</span><h2>Run an approved evidence set.</h2></div><span className="capacity-chip">{selectedPrompts.length * selectedProviders.length} observations</span></div>
    <div className="run-config-grid">
      <fieldset><legend>Buyer questions</legend>{active.length ? active.map((prompt) => <label key={prompt.id}><input type="checkbox" checked={selectedPrompts.includes(prompt.id)} onChange={(event) => setSelectedPrompts((current) => event.target.checked ? [...current, prompt.id] : current.filter((id) => id !== prompt.id))} /><span>{prompt.text}</span></label>) : <p>No active questions. Add one in Buyer Questions first.</p>}</fieldset>
      <fieldset><legend>Provider · choose one</legend>{selectableProviders.map((provider) => <label key={provider.id} className={!provider.configured ? "is-disabled" : provider.health === "limited" ? "is-limited" : ""}><input type="radio" name="collection-provider" disabled={!provider.configured} checked={selectedProviders[0] === provider.id} onChange={() => setSelectedProviders([provider.id])} /><span><strong>{provider.label}</strong><small>{providerLabel(provider)}</small></span></label>)}</fieldset>
    </div>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="run-launcher__actions"><p>Provider credentials remain server-side. Each run uses one provider, strict quotas and a hard cost ceiling. Failures remain visible.</p><button className="button button--ink" type="button" onClick={() => void run()} disabled={busy || !selectedPrompts.length || selectedProviders.length !== 1}>{busy ? "Queuing…" : "Start collection"}</button></div>
  </section>;
}
