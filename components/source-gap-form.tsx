"use client";

import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export function SourceGapForm() {
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setState("submitting");
    setMessage("");
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/leads/source-gap", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not submit the check.");
      setState("success");
      setMessage(data.message || "Your request is in the queue.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not submit the check.");
    }
  }

  if (state === "success") {
    return (
      <div className="form-success" role="status">
        <span>Request received</span>
        <h2>We’ll map the category before we make a claim.</h2>
        <p>{message}</p>
        <button className="text-button" type="button" onClick={() => setState("idle")}>Submit another company →</button>
      </div>
    );
  }

  return (
    <form className="intake-form" action={submit}>
      <div className="form-row">
        <label>Work email<input type="email" name="email" placeholder="you@company.com" required /></label>
        <label>Your name<input type="text" name="name" placeholder="Maya Chen" required /></label>
      </div>
      <label>Company website<input type="url" name="website" placeholder="https://company.com" required /></label>
      <label>What category should a buyer compare you in?<input type="text" name="category" placeholder="e.g. HR software for distributed teams" required /></label>
      <label>Two competitors buyers consider<textarea name="competitors" placeholder="One per line" rows={3} required /></label>
      <label>One buyer question you need to show up for<textarea name="buyer_question" placeholder="What is the best HR platform for a 200-person remote company?" rows={3} required /></label>
      <label className="check-row"><input type="checkbox" name="consent" value="yes" required /><span>I’m asking foremention to analyze public AI answers and third-party web sources for this company.</span></label>
      {message && <p className="form-error" role="alert">{message}</p>}
      <button className="button button--ink button--large" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Submitting…" : "Request the free check →"}
      </button>
      <p className="form-fineprint">No card. We do not claim a citation before we observe one.</p>
    </form>
  );
}
