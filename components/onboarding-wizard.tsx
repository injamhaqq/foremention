"use client";

import { useState } from "react";

const steps = ["Organization", "Category", "Competitors", "Goals", "Prompt approval"];
const initial = {
  companyName: "Northstar HR",
  domain: "https://northstarhr.example",
  market: "North America",
  category: "HR software for distributed teams",
  categoryDescription: "People operations software for remote and distributed companies.",
  competitors: "Deel\nRippling\nHiBob",
  goal: "Earn inclusion in high-influence sources",
  constraint: "Measure observed changes without claiming guaranteed rankings or revenue.",
  prompts: ["Best HR software for remote teams", "Alternatives to Deel for a 200-person company", "Which HR platform is best for cross-border teams?"],
};

export function OnboardingWizard({ demo }: { demo: boolean }) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initial);
  const [approved, setApproved] = useState(initial.prompts);
  const [status, setStatus] = useState<"idle" | "saving" | "complete" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setStatus("saving"); setMessage("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, competitors: values.competitors.split("\n"), prompts: approved, locale: "en-US" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save onboarding.");
      setStatus("complete");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save onboarding."); setStatus("error"); }
  }

  if (status === "complete") return <div className="onboarding-complete" role="status"><span className="eyebrow">Workspace ready</span><h2>Your operating inputs are approved.</h2><p>{demo ? "This was a demo walkthrough; no customer data was saved." : "The organization, project, category, competitors, and approved prompts were saved as one transaction."}</p><a className="button button--ink" href="/app/prompts">Review prompt library →</a></div>;

  return <div className="onboarding-wizard"><ol>{steps.map((label,index) => <li className={step === index ? "is-active" : step > index ? "is-complete" : ""} key={label}><span>{String(index+1).padStart(2,"0")}</span>{label}</li>)}</ol><form onSubmit={(event) => { event.preventDefault(); if (step < steps.length - 1) setStep(step + 1); else void submit(); }}>
    {step === 0 && <fieldset><legend>Define the organization</legend><label>Company name<input value={values.companyName} onChange={(event) => setValues({...values, companyName: event.target.value})} required /></label><label>Company domain<input type="url" value={values.domain} onChange={(event) => setValues({...values, domain: event.target.value})} required /></label><label>Primary market<select value={values.market} onChange={(event) => setValues({...values, market: event.target.value})}><option>North America</option><option>Europe</option><option>Global</option></select></label></fieldset>}
    {step === 1 && <fieldset><legend>Choose the category buyers use</legend><label>Canonical category<input value={values.category} onChange={(event) => setValues({...values, category: event.target.value})} required /></label><label>Category description<textarea value={values.categoryDescription} onChange={(event) => setValues({...values, categoryDescription: event.target.value})} rows={4} required /></label></fieldset>}
    {step === 2 && <fieldset><legend>Map the competitive set</legend><label>Direct competitors<textarea value={values.competitors} onChange={(event) => setValues({...values, competitors: event.target.value})} rows={5} required /></label><p className="field-hint">One company per line. Keep this to the brands buyers genuinely compare.</p></fieldset>}
    {step === 3 && <fieldset><legend>Define the business goal</legend><label>Primary goal<select value={values.goal} onChange={(event) => setValues({...values, goal: event.target.value})}><option>Earn inclusion in high-influence sources</option><option>Establish a measurement baseline</option><option>Defend existing recommendation share</option></select></label><label>Success constraint<textarea value={values.constraint} onChange={(event) => setValues({...values, constraint: event.target.value})} rows={4} /></label></fieldset>}
    {step === 4 && <fieldset><legend>Approve the baseline prompt set</legend><div className="prompt-approval-list">{values.prompts.map((prompt) => <label key={prompt}><input type="checkbox" checked={approved.includes(prompt)} onChange={(event) => setApproved(event.target.checked ? [...approved, prompt] : approved.filter((item) => item !== prompt))} />{prompt}</label>)}</div><p className="field-hint">At least one approved prompt is required. Only approved prompts enter the controlled baseline.</p></fieldset>}
    {message && <p className="auth-message" role="alert">{message}</p>}
    <div className="wizard-actions">{step > 0 && <button type="button" className="button button--outline" onClick={() => setStep(step - 1)} disabled={status === "saving"}>← Back</button>}<button className="button button--ink" type="submit" disabled={status === "saving" || (step === steps.length - 1 && approved.length === 0)}>{status === "saving" ? "Saving…" : step === steps.length - 1 ? "Finish setup" : "Continue"} →</button></div>
  </form></div>;
}
