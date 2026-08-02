"use client";

import { useEffect, useRef, useState } from "react";
import { captureProductEvent } from "@/lib/product-analytics";

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
  const [status, setStatus] = useState<"idle" | "saving" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");
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
      setValues({
        companyName: result.draft.companyName,
        domain: result.draft.domain,
        market: result.draft.market,
        category: result.draft.category,
        categoryDescription: result.draft.categoryDescription,
        competitors: result.draft.competitors.join("\n"),
        goal: result.draft.goal,
        constraint: result.draft.constraint,
        prompts: result.draft.prompts.join("\n"),
      });
      setAnalysisStatus("complete");
      lastAnalyzedWebsite.current = normalized;
      captureProductEvent("onboarding_website_draft_created", { limited: Boolean(result.evidence?.limited) });
      setAnalysisMessage(result.evidence?.limited
        ? "The site did not expose readable metadata, so Foremention created an editable starter from the domain name. Review the category and competitors before saving."
        : `Draft created from ${result.evidence?.pageTitle || result.evidence?.finalUrl || "public website metadata"}. Review each step before saving.`);
    } catch (error) {
      captureProductEvent("onboarding_website_draft_failed");
      setAnalysisStatus("error");
      setAnalysisMessage(error instanceof Error ? error.message : "Could not create a setup draft.");
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
      setStatus("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save onboarding.");
      setStatus("error");
    } finally {
      submissionLock.current = false;
    }
  }

  if (status === "complete") return <div className="onboarding-complete" role="status">
    <span className="eyebrow">Workspace ready</span>
    <h2>Your evidence boundary is saved.</h2>
    <p>{demo ? "This was a demo walkthrough; no customer data was saved." : "Your workspace, category, competitors, and approved buyer questions are now the controlled baseline."}</p>
    <div className="settings-actions"><a className="button button--ink" href="/app/settings#providers">Connect a provider &rarr;</a><a className="button button--outline" href="/app/prompts">Review questions</a></div>
  </div>;

  if (!hydrated) return <div className="empty-state" role="status"><h2>Restoring your setup…</h2><p>Your saved progress stays on this device until the workspace is created.</p></div>;

  return <div className="onboarding-wizard">
    <ol aria-label="Workspace setup progress">{steps.map((label, index) => <li className={step === index ? "is-active" : step > index ? "is-complete" : ""} key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
    <form onSubmit={(event) => { event.preventDefault(); if (step < steps.length - 1) setStep(step + 1); else void submit(); }} aria-busy={status === "saving"}>
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
        </div>}
        {demo && <label>Company website<input type="url" value={values.domain} onChange={(event) => setValues({ ...values, domain: event.target.value })} required /></label>}
        <label>Company name<input value={values.companyName} onChange={(event) => setValues({ ...values, companyName: event.target.value })} required autoComplete="organization" /></label>
        <label>Primary market<select value={values.market} onChange={(event) => setValues({ ...values, market: event.target.value })}><option>Global</option><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Middle East and Africa</option><option>Latin America</option></select></label>
      </fieldset>}
      {step === 1 && <fieldset><legend>Choose the category buyers use</legend><label>Canonical category<input value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} placeholder="Example: CRM software for small B2B teams" required /></label><label>Category definition<textarea value={values.categoryDescription} onChange={(event) => setValues({ ...values, categoryDescription: event.target.value })} placeholder="Describe what belongs in this category and who buys it." rows={4} required /></label></fieldset>}
      {step === 2 && <fieldset><legend>Map the comparison set</legend><label>Direct competitors<textarea value={values.competitors} onChange={(event) => setValues({ ...values, competitors: event.target.value })} placeholder={"Competitor one\nCompetitor two\nCompetitor three"} rows={5} required /></label><p className="field-hint">One company per line. Include only brands a real buyer would compare.</p></fieldset>}
      {step === 3 && <fieldset><legend>Define the measurement goal</legend><label>Primary goal<select value={values.goal} onChange={(event) => setValues({ ...values, goal: event.target.value })}><option>Establish a measurement baseline</option><option>Find credible source gaps</option><option>Defend existing recommendation visibility</option></select></label><label>Evidence constraint<textarea value={values.constraint} onChange={(event) => setValues({ ...values, constraint: event.target.value })} rows={4} required /></label></fieldset>}
      {step === 4 && <fieldset><legend>Add the questions buyers ask</legend><label>Buyer questions<textarea value={values.prompts} onChange={(event) => setValues({ ...values, prompts: event.target.value })} placeholder={"What is the best [category] for [buyer]?\nWhich [category] handles [important use case]?\nWhat are credible alternatives to [competitor]?"} rows={8} required /></label><p className="field-hint">One complete question per line. Foremention keeps the wording stable so later runs remain comparable. {prompts.length}/10 questions prepared.</p></fieldset>}
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
      <div className="wizard-actions">{step > 0 && <button type="button" className="button button--outline" onClick={() => setStep(step - 1)} disabled={status === "saving"}>&larr; Back</button>}<button className="button button--ink" type="submit" disabled={status === "saving" || (step >= 4 && (prompts.length === 0 || prompts.length > 10))}>{status === "saving" ? "Creating secure workspace..." : step === steps.length - 1 ? "Create my workspace" : "Continue"} &rarr;</button></div>
    </form>
  </div>;
}
