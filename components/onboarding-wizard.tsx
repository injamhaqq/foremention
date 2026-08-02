"use client";

import { useEffect, useRef, useState } from "react";
import { captureProductEvent } from "@/lib/product-analytics";
import { createManualOnboardingDraft, generateBuyerQuestions } from "@/lib/onboarding-profile";

const steps = ["Organization", "Category", "Competitors", "Goals", "Buyer questions", "Review"];

type WebsiteDraftResponse = {
  error?: string;
  draft?: {
    companyName: string;
    domain: string;
    market: string;
    category: string;
    categoryDescription: string;
    competitors: string[];
    goal: string;
    constraint: string;
    prompts: string[];
  };
  evidence?: {
    checkedAt: string;
    finalUrl: string;
    limited?: boolean;
    pageTitle: string | null;
    source: string;
  };
};

function initialValues(demo: boolean) {
  return demo ? {
    companyName: "Northstar HR",
    domain: "https://northstarhr.example",
    market: "North America",
    category: "HR software for distributed teams",
    categoryDescription: "People operations software for remote and distributed companies.",
    competitors: "Deel\nRippling\nHiBob",
    goal: "Establish a measurement baseline",
    constraint: "Measure observed changes without claiming guaranteed rankings or revenue.",
    prompts: "Best HR software for remote teams\nAlternatives to Deel for a 200-person company\nWhich HR platform is best for cross-border teams?",
  } : {
    companyName: "",
    domain: "",
    market: "Global",
    category: "",
    categoryDescription: "",
    competitors: "",
    goal: "Establish a measurement baseline",
    constraint: "Use dated observations and reviewed evidence. Do not claim guaranteed rankings or revenue.",
    prompts: "",
  };
}

export function OnboardingWizard({ demo, draftKey }: { demo: boolean; draftKey: string }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(demo));
  const [hydrated, setHydrated] = useState(demo);
  const [status, setStatus] = useState<"idle" | "saving" | "auditing" | "delayed" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [firstRunId, setFirstRunId] = useState<string | null>(null);
  const [auditStage, setAuditStage] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [manualContextRequired, setManualContextRequired] = useState(false);
  const [manualContext, setManualContext] = useState({ whatYouSell: "", whoBuys: "", competitors: "" });
  const prompts = values.prompts.split("\n").map((value) => value.trim()).filter(Boolean);
  const submissionLock = useRef(false);
  const lastAnalyzedWebsite = useRef("");

  useEffect(() => {
    if (demo) return;
    const restored = (() => {
      try {
        const saved = window.localStorage.getItem(draftKey);
        return saved ? JSON.parse(saved) as { step?: number; values?: ReturnType<typeof initialValues> } : null;
      } catch {
        // A malformed device-local draft should never block onboarding.
        return null;
      }
    })();
    queueMicrotask(() => {
      if (restored?.values) setValues(restored.values);
      if (typeof restored?.step === "number") setStep(Math.max(0, Math.min(steps.length - 1, restored.step)));
      setHydrated(true);
    });
  }, [demo, draftKey]);

  useEffect(() => {
    if (demo || !hydrated || status === "complete") return;
    window.localStorage.setItem(draftKey, JSON.stringify({ step, values }));
  }, [demo, draftKey, hydrated, status, step, values]);

  async function analyzeWebsite(website = values.domain) {
    const normalized = website.trim();
    if (!normalized || analysisStatus === "analyzing" || lastAnalyzedWebsite.current === normalized) return;
    setAnalysisStatus("analyzing");
    setAnalysisMessage("");
    try {
      const response = await fetch("/api/onboarding/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ website: normalized }),
      });
      const result = (await response.json()) as WebsiteDraftResponse;
      if (!response.ok || !result.draft) throw new Error(result.error || "Could not create a setup draft.");
      const limited = Boolean(result.evidence?.limited);
      setManualContextRequired(limited);
      setValues({
        companyName: result.draft.companyName,
        domain: result.draft.domain,
        market: result.draft.market,
        category: limited ? "" : result.draft.category,
        categoryDescription: limited ? "" : result.draft.categoryDescription,
        competitors: limited ? "" : result.draft.competitors.join("\n"),
        goal: result.draft.goal,
        constraint: result.draft.constraint,
        prompts: limited ? "" : result.draft.prompts.join("\n"),
      });
      setAnalysisStatus("complete");
      setAuditStage((current) => Math.max(current, 1));
      lastAnalyzedWebsite.current = normalized;
      captureProductEvent("onboarding_website_draft_created", { limited: Boolean(result.evidence?.limited) });
      setAnalysisMessage(limited
        ? "We could not read enough public website content. Answer the three short questions below and Foremention will create your setup without blocking you."
        : `Draft created from ${result.evidence?.pageTitle || result.evidence?.finalUrl || "public website metadata"}. Review each step before saving.`);
    } catch (error) {
      captureProductEvent("onboarding_website_draft_failed");
      setAnalysisStatus("error");
      setManualContextRequired(true);
      setAnalysisMessage(`${error instanceof Error ? error.message : "Could not read the website."} Answer the three short questions below to continue.`);
    }
  }

  function applyManualContext() {
    try {
      const website = /^(?:https?:\/\/)/i.test(values.domain.trim()) ? values.domain.trim() : `https://${values.domain.trim()}`;
      const draft = createManualOnboardingDraft({
        websiteUrl: website,
        whatYouSell: manualContext.whatYouSell,
        whoBuys: manualContext.whoBuys,
        competitors: manualContext.competitors.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean),
      });
      setValues({
        companyName: values.companyName || draft.companyName,
        domain: draft.domain,
        market: values.market || draft.market,
        category: draft.category,
        categoryDescription: draft.categoryDescription,
        competitors: draft.competitors.join("\n"),
        goal: draft.goal,
        constraint: draft.constraint,
        prompts: draft.prompts.join("\n"),
      });
      setManualContextRequired(false);
      setAnalysisStatus("complete");
      setAuditStage((current) => Math.max(current, 2));
      setAnalysisMessage("Setup created from your answers. Review the category, competitors, and five buyer questions before creating the workspace.");
      captureProductEvent("onboarding_manual_context_created", { competitor_count: draft.competitors.length });
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisMessage(error instanceof Error ? error.message : "Complete the three questions to continue.");
    }
  }

  useEffect(() => {
    if (demo || step !== 0 || !hydrated || !values.domain.trim()) return;
    const candidate = values.domain.trim();
    if (!/^(?:https?:\/\/)?[a-z0-9][a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(candidate)) return;
    const timer = window.setTimeout(() => void analyzeWebsite(candidate), 900);
    return () => window.clearTimeout(timer);
  // Website analysis is intentionally keyed only to the URL and setup state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, hydrated, step, values.domain]);

  useEffect(() => {
    if (!firstRunId || status !== "auditing") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch("/api/runs", { cache: "no-store" });
        const result = await response.json() as { data?: Array<{ id: string; status: string }> };
        const run = result.data?.find((item) => item.id === firstRunId);
        if (!cancelled && run && ["review", "complete", "partial"].includes(run.status)) {
          setAuditStage(5);
          window.setTimeout(() => window.location.assign("/app"), 900);
          return;
        }
        if (!cancelled && run && ["failed", "cancelled"].includes(run.status)) {
          setStatus("delayed");
          return;
        }
      } catch {
        // The durable background run continues even when a browser poll fails.
      }
      if (!cancelled) window.setTimeout(() => void poll(), 3_000);
    };
    void poll();
    return () => { cancelled = true; };
  }, [firstRunId, status]);

  async function startFirstAudit() {
    const promptResponse = await fetch("/api/prompts", { cache: "no-store" });
    const promptResult = await promptResponse.json() as { data?: Array<{ id: string; approved: boolean }>; error?: string };
    if (!promptResponse.ok) throw new Error(promptResult.error || "Your buyer questions could not be loaded.");
    const promptIds = (promptResult.data || []).filter((prompt) => prompt.approved).slice(0, 5).map((prompt) => prompt.id);
    if (promptIds.length !== 5) throw new Error("Your five-question baseline is still being prepared.");
    const runResponse = await fetch("/api/runs", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `onboarding:${crypto.randomUUID()}` },
      body: JSON.stringify({ promptIds, providers: ["groq"] }),
    });
    const runResult = await runResponse.json() as { id?: string; error?: string };
    if (!runResponse.ok || !runResult.id) throw new Error(runResult.error || "Your first audit could not be queued.");
    captureProductEvent("collection_started", { question_count: 5, provider_count: 1, provider: "groq", source: "onboarding" });
    return runResult.id;
  }

  async function submit() {
    if (submissionLock.current) return;
    submissionLock.current = true;
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          competitors: values.competitors.split("\n").map((value) => value.trim()).filter(Boolean),
          prompts,
          locale: "en-US",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save onboarding.");
      if (!demo) window.localStorage.removeItem(draftKey);
      if (!demo) captureProductEvent("onboarding_completed", { question_count: prompts.length, competitor_count: values.competitors.split("\n").filter((value) => value.trim()).length });
      if (demo) setStatus("complete");
      else {
        setAuditStage((current) => Math.max(current, 2));
        setStatus("auditing");
        try {
          const runId = await startFirstAudit();
          setFirstRunId(runId);
          setAuditStage(3);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "The audit could not be queued yet.");
          setStatus("delayed");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save onboarding.");
      setStatus("error");
    } finally {
      submissionLock.current = false;
    }
  }

  if (status === "auditing") return <div className="onboarding-complete onboarding-audit" role="status" aria-live="polite">
    <span className="eyebrow">First audit in progress</span>
    <div className="audit-loader" aria-hidden="true"><i /><i /><i /></div>
    <h2>We&apos;re running your first AI visibility audit — this takes about 2 minutes.</h2>
    <p>Foremention is collecting five real Groq answers, preserving returned citations, and building your first evidence baseline. You can leave this page; the background run will continue safely.</p>
    <ol className="audit-progress-steps" aria-label="First audit progress">
      {["Scraping your website", "Generating questions", "Running AI audit", "Building your Source Map"].map((label, index) => {
        const stage = index + 1;
        const complete = auditStage > stage;
        const active = auditStage === stage;
        return <li className={complete ? "is-complete" : active ? "is-active" : ""} key={label}><span aria-hidden="true">{complete ? "✓" : String(stage).padStart(2, "0")}</span><strong>Step {stage}</strong><small>{label}</small></li>;
      })}
    </ol>
    {firstRunId && <a className="button button--outline" href={`/app/runs/${firstRunId}`}>View live run status &rarr;</a>}
  </div>;

  if (status === "delayed") return <div className="onboarding-complete onboarding-audit" role="alert">
    <span className="eyebrow">Workspace created safely</span>
    <h2>Your audit is taking longer than expected — we&apos;ll notify you when it&apos;s ready.</h2>
    <p>No evidence was invented and your setup is saved. {message || "The provider or background queue needs more time."} You can enter the workspace now and retry from Answer Runs without repeating onboarding.</p>
    <div className="settings-actions"><a className="button button--ink" href="/app">Open workspace &rarr;</a>{firstRunId && <a className="button button--outline" href={`/app/runs/${firstRunId}`}>Inspect run</a>}</div>
  </div>;

  if (status === "complete") return <div className="onboarding-complete" role="status">
    <span className="eyebrow">Workspace ready</span>
    <h2>Your evidence boundary is saved.</h2>
    <p>{demo ? "This was a demo walkthrough; no customer data was saved." : "Your workspace, category, competitors, and approved buyer questions are now the controlled baseline."}</p>
    <div className="settings-actions"><a className="button button--ink" href="/app/settings#providers">Connect a provider &rarr;</a><a className="button button--outline" href="/app/prompts">Review questions</a></div>
  </div>;

  if (!hydrated) return <div className="empty-state" role="status"><h2>Restoring your setup…</h2><p>Your saved progress stays on this device until the workspace is created.</p></div>;

  return <div className="onboarding-wizard">
    <ol aria-label="Workspace setup progress">{steps.map((label, index) => <li className={step === index ? "is-active" : step > index ? "is-complete" : ""} key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (step < steps.length - 1) {
        if (step === 3 && !prompts.length) {
          const competitors = values.competitors.split("\n").map((value) => value.trim()).filter(Boolean);
          const audience = values.market === "Global" ? "a growing global business team" : `a growing team in ${values.market}`;
          setValues({ ...values, prompts: generateBuyerQuestions(values.category || "B2B software", values.companyName || "the company", competitors, audience).join("\n") });
        }
        setStep(step + 1);
      } else void submit();
    }} aria-busy={status === "saving"}>
      <div className="wizard-progress" aria-live="polite">
        <span>Step {step + 1} of {steps.length}</span>
        <div aria-hidden="true"><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </div>
      {!demo && <p className="field-hint">Your draft is saved on this device until you create the workspace.</p>}
      {step === 0 && <fieldset>
        <legend>Start with your website</legend>
        {!demo && <div className="website-draft">
          <div><span className="eyebrow">Fast setup</span><strong>Paste your website to create the first draft.</strong><p>Foremention reads bounded public metadata, then prepares editable category, competitor, goal, and buyer-question suggestions. Nothing is saved until you approve the review.</p></div>
          <label>Company website<input type="url" value={values.domain} onChange={(event) => { setValues({ ...values, domain: event.target.value }); setAnalysisStatus("idle"); setAnalysisMessage(""); }} placeholder="https://yourcompany.com" required /></label>
          <button type="button" className="button button--ink" onClick={() => void analyzeWebsite()} disabled={!values.domain.trim() || analysisStatus === "analyzing"}>{analysisStatus === "analyzing" ? "Reading website…" : analysisStatus === "complete" ? "Refresh website draft" : "Generate my setup"}</button>
          {analysisMessage && <p className={`website-draft__status ${analysisStatus === "error" ? "is-error" : ""}`} role={analysisStatus === "error" ? "alert" : "status"}>{analysisMessage}</p>}
          {manualContextRequired && <div className="website-fallback" aria-label="Manual company context">
            <label>What do you sell?<textarea value={manualContext.whatYouSell} onChange={(event) => setManualContext({ ...manualContext, whatYouSell: event.target.value })} placeholder="Example: AI visibility monitoring software for B2B SaaS" rows={3} required /></label>
            <label>Who buys it?<textarea value={manualContext.whoBuys} onChange={(event) => setManualContext({ ...manualContext, whoBuys: event.target.value })} placeholder="Example: marketing leaders at growing B2B SaaS companies" rows={3} required /></label>
            <label>Who are your main competitors?<textarea value={manualContext.competitors} onChange={(event) => setManualContext({ ...manualContext, competitors: event.target.value })} placeholder={"One competitor per line"} rows={4} required /></label>
            <button type="button" className="button button--outline" onClick={applyManualContext} disabled={!manualContext.whatYouSell.trim() || !manualContext.whoBuys.trim() || !manualContext.competitors.trim()}>Use these answers</button>
          </div>}
        </div>}
        {demo && <label>Company website<input type="url" value={values.domain} onChange={(event) => setValues({ ...values, domain: event.target.value })} required /></label>}
        <label>Company name<input value={values.companyName} onChange={(event) => setValues({ ...values, companyName: event.target.value })} required autoComplete="organization" /></label>
        <label>Primary market<select value={values.market} onChange={(event) => setValues({ ...values, market: event.target.value })}><option>Global</option><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Middle East and Africa</option><option>Latin America</option></select></label>
      </fieldset>}
      {step === 1 && <fieldset><legend>Choose the category buyers use</legend><label>Canonical category<input value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} placeholder="Example: CRM software for small B2B teams" required /></label><label>Category definition<textarea value={values.categoryDescription} onChange={(event) => setValues({ ...values, categoryDescription: event.target.value })} placeholder="Describe what belongs in this category and who buys it." rows={4} required /></label></fieldset>}
      {step === 2 && <fieldset><legend>Map the comparison set</legend><label>Direct competitors<textarea value={values.competitors} onChange={(event) => setValues({ ...values, competitors: event.target.value })} placeholder={"Competitor one\nCompetitor two\nCompetitor three"} rows={5} required /></label><p className="field-hint">One company per line. Include only brands a real buyer would compare.</p></fieldset>}
      {step === 3 && <fieldset><legend>Define the measurement goal</legend><label>Primary goal<select value={values.goal} onChange={(event) => setValues({ ...values, goal: event.target.value })}><option>Establish a measurement baseline</option><option>Find credible source gaps</option><option>Defend existing recommendation visibility</option></select></label><label>Evidence constraint<textarea value={values.constraint} onChange={(event) => setValues({ ...values, constraint: event.target.value })} rows={4} required /></label></fieldset>}
      {step === 4 && <fieldset><legend>Review the questions buyers ask</legend><label>Buyer questions<textarea value={values.prompts} onChange={(event) => setValues({ ...values, prompts: event.target.value })} placeholder={"Questions are generated automatically from your category and market."} rows={8} /></label><p className="field-hint">Foremention creates five questions automatically. Editing is optional; the saved five become the stable baseline for comparable runs. {prompts.length}/5 questions prepared.</p></fieldset>}
      {step === 5 && <fieldset>
        <legend>Review your evidence boundary</legend>
        <p className="field-hint">Review the draft before saving. Collection starts only when you later choose to run it.</p>
        <div className="onboarding-review">
          <div><span>Organization</span><strong>{values.companyName}</strong><small>{values.domain} · {values.market}</small><button type="button" onClick={() => setStep(0)}>Edit</button></div>
          <div><span>Category</span><strong>{values.category}</strong><small>{values.categoryDescription}</small><button type="button" onClick={() => setStep(1)}>Edit</button></div>
          <div><span>Comparison set</span><strong>{values.competitors.split("\n").map((value) => value.trim()).filter(Boolean).length} competitors</strong><small>{values.competitors.split("\n").map((value) => value.trim()).filter(Boolean).join(", ")}</small><button type="button" onClick={() => setStep(2)}>Edit</button></div>
          <div><span>Approved baseline</span><strong>{prompts.length} buyer {prompts.length === 1 ? "question" : "questions"}</strong><small>{values.goal}</small><button type="button" onClick={() => setStep(4)}>Edit</button></div>
        </div>
        <p className="onboarding-security-note"><strong>Your workspace is private.</strong> Only you and teammates you invite can see it. You can edit this setup before any collection begins.</p>
      </fieldset>}
      {message && <p className="auth-message" role="alert">{message}</p>}
      <div className="wizard-actions">{step > 0 && <button type="button" className="button button--outline" onClick={() => setStep(step - 1)} disabled={status === "saving"}>&larr; Back</button>}<button className="button button--ink" type="submit" disabled={status === "saving" || (step >= 4 && prompts.length > 5)}>{status === "saving" ? "Creating secure workspace..." : step === steps.length - 1 ? "Create my workspace" : "Continue"} &rarr;</button></div>
    </form>
  </div>;
}
