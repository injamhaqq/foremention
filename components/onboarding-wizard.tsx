"use client";

import { useState } from "react";

const steps = ["Organization", "Category", "Competitors", "Goals", "Buyer questions"];

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

export function OnboardingWizard({ demo }: { demo: boolean }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => initialValues(demo));
  const [status, setStatus] = useState<"idle" | "saving" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");
  const prompts = values.prompts.split("\n").map((value) => value.trim()).filter(Boolean);

  async function submit() {
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
      setStatus("complete");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save onboarding.");
      setStatus("error");
    }
  }

  if (status === "complete") return <div className="onboarding-complete" role="status">
    <span className="eyebrow">Workspace ready</span>
    <h2>Your evidence boundary is saved.</h2>
    <p>{demo ? "This was a demo walkthrough; no customer data was saved." : "Your workspace, category, competitors, and approved buyer questions are now the controlled baseline."}</p>
    <div className="settings-actions"><a className="button button--ink" href="/app/settings#providers">Connect a provider &rarr;</a><a className="button button--outline" href="/app/prompts">Review questions</a></div>
  </div>;

  return <div className="onboarding-wizard">
    <ol>{steps.map((label, index) => <li className={step === index ? "is-active" : step > index ? "is-complete" : ""} key={label}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
    <form onSubmit={(event) => { event.preventDefault(); if (step < steps.length - 1) setStep(step + 1); else void submit(); }}>
      {step === 0 && <fieldset><legend>Define the organization</legend><label>Company name<input value={values.companyName} onChange={(event) => setValues({ ...values, companyName: event.target.value })} required autoComplete="organization" /></label><label>Company website<input type="url" value={values.domain} onChange={(event) => setValues({ ...values, domain: event.target.value })} placeholder="https://yourcompany.com" required /></label><label>Primary market<select value={values.market} onChange={(event) => setValues({ ...values, market: event.target.value })}><option>Global</option><option>North America</option><option>Europe</option><option>Asia Pacific</option><option>Middle East and Africa</option><option>Latin America</option></select></label></fieldset>}
      {step === 1 && <fieldset><legend>Choose the category buyers use</legend><label>Canonical category<input value={values.category} onChange={(event) => setValues({ ...values, category: event.target.value })} placeholder="Example: CRM software for small B2B teams" required /></label><label>Category definition<textarea value={values.categoryDescription} onChange={(event) => setValues({ ...values, categoryDescription: event.target.value })} placeholder="Describe what belongs in this category and who buys it." rows={4} required /></label></fieldset>}
      {step === 2 && <fieldset><legend>Map the comparison set</legend><label>Direct competitors<textarea value={values.competitors} onChange={(event) => setValues({ ...values, competitors: event.target.value })} placeholder={"Competitor one\nCompetitor two\nCompetitor three"} rows={5} required /></label><p className="field-hint">One company per line. Include only brands a real buyer would compare.</p></fieldset>}
      {step === 3 && <fieldset><legend>Define the measurement goal</legend><label>Primary goal<select value={values.goal} onChange={(event) => setValues({ ...values, goal: event.target.value })}><option>Establish a measurement baseline</option><option>Find credible source gaps</option><option>Defend existing recommendation visibility</option></select></label><label>Evidence constraint<textarea value={values.constraint} onChange={(event) => setValues({ ...values, constraint: event.target.value })} rows={4} required /></label></fieldset>}
      {step === 4 && <fieldset><legend>Add the questions buyers ask</legend><label>Buyer questions<textarea value={values.prompts} onChange={(event) => setValues({ ...values, prompts: event.target.value })} placeholder={"What is the best [category] for [buyer]?\nWhich [category] handles [important use case]?\nWhat are credible alternatives to [competitor]?"} rows={8} required /></label><p className="field-hint">One complete question per line. Foremention keeps the wording stable so later runs remain comparable. {prompts.length}/10 questions prepared.</p></fieldset>}
      {message && <p className="auth-message" role="alert">{message}</p>}
      <div className="wizard-actions">{step > 0 && <button type="button" className="button button--outline" onClick={() => setStep(step - 1)} disabled={status === "saving"}>&larr; Back</button>}<button className="button button--ink" type="submit" disabled={status === "saving" || (step === steps.length - 1 && (prompts.length === 0 || prompts.length > 10))}>{status === "saving" ? "Saving..." : step === steps.length - 1 ? "Finish setup" : "Continue"} &rarr;</button></div>
    </form>
  </div>;
}
