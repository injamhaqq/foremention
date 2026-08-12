"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProviderStatus, WorkspacePrompt } from "@/lib/data";
import { captureProductEvent } from "@/lib/product-analytics";

export function RunLauncher({ prompts, providers, demo }: { prompts: WorkspacePrompt[]; providers: ProviderStatus[]; demo: boolean }) {
  const router = useRouter();
  const active = prompts.filter((prompt) => prompt.approved);
  const preferredProvider = providers.find((provider) => provider.configured && provider.supportsCitations && provider.health === "available")
    || providers.find((provider) => provider.configured && provider.health === "available")
    || providers.find((provider) => provider.configured && provider.supportsCitations)
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
      const result = responseText ? JSON.parse(responseText) as { error?: string; note?: string } : {};
      if (!response.ok) throw new Error(result.error || `Could not start collection (HTTP ${response.status}).`);
      setMessage(result.note || "Collection started. Foremention will preserve the answer, citations, and any failures for review.");
      if (!demo) captureProductEvent("collection_started", { question_count: selectedPrompts.length, provider_count: selectedProviders.length, provider: selectedProviders[0] || "unknown" });
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } catch (error) {
      if (!demo) captureProductEvent("collection_queue_failed", { provider: selectedProviders[0] || "unknown" });
      setMessage(error instanceof Error ? error.message : "Could not start collection.");
    } finally { setBusy(false); }
  }

  const selectableProviders = demo ? [{ id: "mock", label: "Safe demo", configured: true, supportsCitations: true, health: "available" as const, latestStatus: "complete", lastTestedAt: null, verifiedAnswers: 0, presencePct: null }] : providers;
  const selectedProvider = selectableProviders.find((provider) => provider.id === selectedProviders[0]);
  const providerLabel = (provider: typeof selectableProviders[number]) => {
    if (!provider.configured) return "Not configured";
    const evidenceNote = provider.supportsCitations ? "" : " · answer comparison only; no returned web citations";
    if (provider.health === "available") return provider.lastTestedAt ? `Proven available · tested ${provider.lastTestedAt}${evidenceNote}` : "Safe fictional adapter";
    if (provider.health === "limited") return `Latest attempt ${provider.latestStatus?.replaceAll("_", " ") || "failed"}${provider.lastTestedAt ? ` · ${provider.lastTestedAt}` : ""}${evidenceNote}`;
    return `Configured · production run not yet proven${evidenceNote}`;
  };

  return <section className="panel run-launcher">
    <div className="panel-heading"><div><span className="eyebrow">New collection</span><h2>Ask the questions you want to monitor.</h2></div><span className="capacity-chip">{selectedPrompts.length} question{selectedPrompts.length === 1 ? "" : "s"}</span></div>
    <div className="run-config-grid">
      <fieldset className="question-picker"><legend>Buyer questions</legend>{active.length ? active.map((prompt) => <label key={prompt.id}><input type="checkbox" checked={selectedPrompts.includes(prompt.id)} onChange={(event) => setSelectedPrompts((current) => event.target.checked ? [...current, prompt.id] : current.filter((id) => id !== prompt.id))} /><span className="question-picker__copy">{prompt.text}</span></label>) : <p>No active questions. Add one in Questions first.</p>}</fieldset>
      <div className="provider-picker">
        <span className="eyebrow">AI system</span>
        {selectedProvider ? <div className="review-action"><div><strong>{selectedProvider.label}</strong><p>{selectedProvider.supportsCitations ? "Can return cited web sources for Source X-Ray." : "Answer comparison only; this system does not return cited web sources."}</p></div><span className={`provider-state provider-state--${selectedProvider.health}`}>{selectedProvider.health === "available" ? "Ready" : selectedProvider.health === "limited" ? "Needs attention" : "Untested"}</span></div> : <div className="empty-state"><h3>No AI system is connected.</h3><p>Connect and prove a collection provider before starting a real run.</p></div>}
        <details>
          <summary>Change AI system</summary>
          <fieldset><legend className="sr-only">Choose one provider</legend>{selectableProviders.map((provider) => <label key={provider.id} className={!provider.configured ? "is-disabled" : provider.health === "limited" ? "is-limited" : ""}><input type="radio" name="collection-provider" disabled={!provider.configured} checked={selectedProviders[0] === provider.id} onChange={() => setSelectedProviders([provider.id])} /><span className="provider-picker__copy"><strong>{provider.label}</strong><small>{providerLabel(provider)}</small></span><b className={`provider-state provider-state--${!provider.configured ? "off" : provider.health}`}>{!provider.configured ? "Unavailable" : provider.health === "available" ? "Ready" : provider.health === "limited" ? "Needs attention" : "Untested"}</b></label>)}</fieldset>
        </details>
      </div>
    </div>
    {message && <p className="inline-notice" role="status">{message}</p>}
    <div className="run-launcher__actions"><p>Foremention keeps the exact AI system, model, time, answer, citations, and failures with every observation. Provider credentials stay server-side.</p><button className="button button--ink" type="button" onClick={() => void run()} disabled={busy || !selectedPrompts.length || selectedProviders.length !== 1}>{busy ? "Starting…" : "Start collection"}</button></div>
  </section>;
}
