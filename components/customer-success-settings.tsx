"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Profile = {
  id: string;
  onboarding_plan: { notes?: string } | unknown[];
  success_plan: { notes?: string } | unknown[];
  account_goal: string | null;
  champion_name: string | null;
  champion_role: string | null;
  executive_sponsor_name: string | null;
  executive_sponsor_role: string | null;
  activation_state: "not_started" | "setup" | "baseline_ready" | "active" | "value_review_ready";
  adoption_state: "unknown" | "low" | "developing" | "established";
  adoption_basis: string | null;
  health_score: number | string | null;
  health_score_basis: string | null;
  renewal_risk: "unknown" | "low" | "medium" | "high";
  renewal_risk_basis: string | null;
  next_qbr_at: string | null;
  renewal_at: string | null;
  expansion_opportunity: string | null;
  advocate_readiness: "unknown" | "not_ready" | "candidate" | "ready";
  notification_preferences: Record<string, unknown>;
};
type Review = { id: string; review_type: string; summary: string; economic_value_status: string; health_score_snapshot: number | string | null; renewal_risk_snapshot: string | null; occurred_at: string };
type FormState = {
  onboardingNotes: string; successNotes: string; accountGoal: string; championName: string; championRole: string; executiveSponsorName: string; executiveSponsorRole: string;
  activationState: Profile["activation_state"]; adoptionState: Profile["adoption_state"]; adoptionBasis: string; healthScore: string; healthScoreBasis: string;
  renewalRisk: Profile["renewal_risk"]; renewalRiskBasis: string; nextQbrAt: string; renewalAt: string; expansionOpportunity: string; advocateReadiness: Profile["advocate_readiness"];
  notifyActionDue: boolean; notifyQbr: boolean; notifyRenewal: boolean; notifyMentions: boolean;
};

const empty: FormState = {
  onboardingNotes: "", successNotes: "", accountGoal: "", championName: "", championRole: "", executiveSponsorName: "", executiveSponsorRole: "",
  activationState: "not_started", adoptionState: "unknown", adoptionBasis: "", healthScore: "", healthScoreBasis: "", renewalRisk: "unknown", renewalRiskBasis: "",
  nextQbrAt: "", renewalAt: "", expansionOpportunity: "", advocateReadiness: "unknown", notifyActionDue: true, notifyQbr: true, notifyRenewal: true, notifyMentions: true,
};
const localDate = (value: string | null) => value ? value.slice(0, 16) : "";
const notes = (value: Profile["onboarding_plan"]) => !Array.isArray(value) && value && typeof value === "object" && typeof value.notes === "string" ? value.notes : "";
const fromProfile = (profile: Profile): FormState => ({
  onboardingNotes: notes(profile.onboarding_plan), successNotes: notes(profile.success_plan), accountGoal: profile.account_goal || "", championName: profile.champion_name || "", championRole: profile.champion_role || "", executiveSponsorName: profile.executive_sponsor_name || "", executiveSponsorRole: profile.executive_sponsor_role || "",
  activationState: profile.activation_state, adoptionState: profile.adoption_state, adoptionBasis: profile.adoption_basis || "", healthScore: profile.health_score === null ? "" : String(profile.health_score), healthScoreBasis: profile.health_score_basis || "", renewalRisk: profile.renewal_risk, renewalRiskBasis: profile.renewal_risk_basis || "",
  nextQbrAt: localDate(profile.next_qbr_at), renewalAt: localDate(profile.renewal_at), expansionOpportunity: profile.expansion_opportunity || "", advocateReadiness: profile.advocate_readiness,
  notifyActionDue: profile.notification_preferences.actionDue !== false, notifyQbr: profile.notification_preferences.qbr !== false, notifyRenewal: profile.notification_preferences.renewal !== false, notifyMentions: profile.notification_preferences.mentions !== false,
});

export function CustomerSuccessSettings({ demo }: { demo: boolean }) {
  const [form, setForm] = useState<FormState>(empty);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!demo);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(demo ? "The fictional demo is read-only and does not contain customer-success facts." : "");
  const [reviewType, setReviewType] = useState("success_review");
  const [reviewSummary, setReviewSummary] = useState("");
  const profileReady = useMemo(() => Boolean(form.accountGoal || form.championName || form.onboardingNotes || form.successNotes), [form]);

  const load = async () => {
    if (demo) return;
    setLoading(true);
    try {
      const response = await fetch("/api/customer-success", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load Customer Success.");
      if (body.profile) setForm(fromProfile(body.profile));
      setReviews(Array.isArray(body.reviews) ? body.reviews : []);
      if (body.migrationPending) setMessage("Customer Success is waiting for the workspace database migration. No facts are being estimated in the meantime.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Customer Success.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [demo]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (demo) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/customer-success", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        onboardingPlan: { notes: form.onboardingNotes }, successPlan: { notes: form.successNotes }, accountGoal: form.accountGoal, championName: form.championName, championRole: form.championRole,
        executiveSponsorName: form.executiveSponsorName, executiveSponsorRole: form.executiveSponsorRole, activationState: form.activationState, adoptionState: form.adoptionState, adoptionBasis: form.adoptionBasis,
        healthScore: form.healthScore === "" ? null : Number(form.healthScore), healthScoreBasis: form.healthScoreBasis, renewalRisk: form.renewalRisk, renewalRiskBasis: form.renewalRiskBasis,
        nextQbrAt: form.nextQbrAt || null, renewalAt: form.renewalAt || null, expansionOpportunity: form.expansionOpportunity, advocateReadiness: form.advocateReadiness,
        notificationPreferences: { actionDue: form.notifyActionDue, qbr: form.notifyQbr, renewal: form.notifyRenewal, mentions: form.notifyMentions },
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save the customer-success plan.");
      if (body.profile) setForm(fromProfile(body.profile));
      setMessage("Customer-success plan saved with its evidence basis.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the customer-success plan."); }
    finally { setSaving(false); }
  };

  const addReview = async (event: FormEvent) => {
    event.preventDefault();
    if (demo || !reviewSummary.trim()) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/customer-success", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewType, summary: reviewSummary, operationalValue: { source: "customer_success_review" } }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not add the review.");
      setReviewSummary("");
      setMessage("Review added to immutable customer-success history. Economic ROI remains unclaimed.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add the review."); }
    finally { setSaving(false); }
  };

  if (loading) return <section className="panel"><div className="empty-state"><h2>Loading Customer Success…</h2><p>Reading only this organization’s persisted success plan and review history.</p></div></section>;
  return <>
    {message && <div className="inline-notice" role="status"><p>{message}</p></div>}
    <form className="settings-grid" onSubmit={save}>
      <section className="panel panel--wide"><span className="eyebrow">Success plan</span><h2>Define the customer outcome before scoring health.</h2><div className="form-grid"><label><span>Account goal</span><textarea value={form.accountGoal} onChange={(event) => update("accountGoal", event.target.value)} disabled={demo} placeholder="What measurable business or operating outcome is this account trying to achieve?" /></label><label><span>Onboarding plan</span><textarea value={form.onboardingNotes} onChange={(event) => update("onboardingNotes", event.target.value)} disabled={demo} placeholder="Setup, five approved questions, baseline run, reviewed Source X-Ray…" /></label><label><span>Ongoing success plan</span><textarea value={form.successNotes} onChange={(event) => update("successNotes", event.target.value)} disabled={demo} placeholder="Repeat measurement, decision review, outcome review, executive cadence…" /></label></div></section>
      <section className="panel"><span className="eyebrow">Account people</span><h2>Champion and executive sponsor</h2><div className="form-stack"><label><span>Champion</span><input value={form.championName} onChange={(event) => update("championName", event.target.value)} disabled={demo} /></label><label><span>Champion role</span><input value={form.championRole} onChange={(event) => update("championRole", event.target.value)} disabled={demo} /></label><label><span>Executive sponsor</span><input value={form.executiveSponsorName} onChange={(event) => update("executiveSponsorName", event.target.value)} disabled={demo} /></label><label><span>Executive sponsor role</span><input value={form.executiveSponsorRole} onChange={(event) => update("executiveSponsorRole", event.target.value)} disabled={demo} /></label></div></section>
      <section className="panel"><span className="eyebrow">Activation & adoption</span><h2>State plus evidence basis</h2><div className="form-stack"><label><span>Activation</span><select value={form.activationState} onChange={(event) => update("activationState", event.target.value as FormState["activationState"])} disabled={demo}><option value="not_started">Not started</option><option value="setup">Setup</option><option value="baseline_ready">Baseline ready</option><option value="active">Active</option><option value="value_review_ready">Value review ready</option></select></label><label><span>Adoption</span><select value={form.adoptionState} onChange={(event) => update("adoptionState", event.target.value as FormState["adoptionState"])} disabled={demo}><option value="unknown">Unknown</option><option value="low">Low</option><option value="developing">Developing</option><option value="established">Established</option></select></label><label><span>Adoption evidence basis</span><textarea value={form.adoptionBasis} onChange={(event) => update("adoptionBasis", event.target.value)} disabled={demo} placeholder="Required for any state other than Unknown." /></label></div></section>
      <section className="panel"><span className="eyebrow">Health & renewal</span><h2>No unexplained score.</h2><div className="form-stack"><label><span>Health score (optional)</span><input type="number" min="0" max="100" value={form.healthScore} onChange={(event) => update("healthScore", event.target.value)} disabled={demo} /></label><label><span>Health-score evidence basis</span><textarea value={form.healthScoreBasis} onChange={(event) => update("healthScoreBasis", event.target.value)} disabled={demo} placeholder="Required when a health score is set." /></label><label><span>Renewal risk</span><select value={form.renewalRisk} onChange={(event) => update("renewalRisk", event.target.value as FormState["renewalRisk"])} disabled={demo}><option value="unknown">Unknown</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label><span>Renewal-risk evidence basis</span><textarea value={form.renewalRiskBasis} onChange={(event) => update("renewalRiskBasis", event.target.value)} disabled={demo} placeholder="Required for low, medium, or high risk." /></label></div></section>
      <section className="panel"><span className="eyebrow">Executive cadence</span><h2>QBR, renewal, expansion, advocacy</h2><div className="form-stack"><label><span>Next QBR / value review</span><input type="datetime-local" value={form.nextQbrAt} onChange={(event) => update("nextQbrAt", event.target.value)} disabled={demo} /></label><label><span>Renewal date</span><input type="datetime-local" value={form.renewalAt} onChange={(event) => update("renewalAt", event.target.value)} disabled={demo} /></label><label><span>Expansion opportunity</span><textarea value={form.expansionOpportunity} onChange={(event) => update("expansionOpportunity", event.target.value)} disabled={demo} /></label><label><span>Advocate readiness</span><select value={form.advocateReadiness} onChange={(event) => update("advocateReadiness", event.target.value as FormState["advocateReadiness"])} disabled={demo}><option value="unknown">Unknown</option><option value="not_ready">Not ready</option><option value="candidate">Candidate</option><option value="ready">Ready</option></select></label></div></section>
      <section className="panel"><span className="eyebrow">Notification controls</span><h2>Only outcome-workflow reminders.</h2><div className="form-stack"><label><input type="checkbox" checked={form.notifyActionDue} onChange={(event) => update("notifyActionDue", event.target.checked)} disabled={demo} /> Action due dates</label><label><input type="checkbox" checked={form.notifyQbr} onChange={(event) => update("notifyQbr", event.target.checked)} disabled={demo} /> QBR / value review</label><label><input type="checkbox" checked={form.notifyRenewal} onChange={(event) => update("notifyRenewal", event.target.checked)} disabled={demo} /> Renewal review</label><label><input type="checkbox" checked={form.notifyMentions} onChange={(event) => update("notifyMentions", event.target.checked)} disabled={demo} /> Mentions / review requests</label></div></section>
      <section className="panel panel--wide"><div className="settings-actions"><button className="button button--ink" type="submit" disabled={demo || saving}>{saving ? "Saving…" : "Save customer-success plan"}</button></div><p className="table-caption">Health, adoption, and renewal risk are never auto-filled without a basis. Saving a plan does not create a customer proof claim or economic ROI.</p></section>
    </form>

    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">QBR & business-value review history</span><h2>Append-only customer-success reviews.</h2></div></div>
      <form className="form-stack" onSubmit={addReview}><label><span>Review type</span><select value={reviewType} onChange={(event) => setReviewType(event.target.value)} disabled={demo || !profileReady}><option value="onboarding">Onboarding</option><option value="success_review">Success review</option><option value="qbr">QBR</option><option value="business_value">Business value</option><option value="renewal">Renewal</option><option value="expansion">Expansion</option><option value="advocacy">Advocacy</option></select></label><label><span>Review summary</span><textarea value={reviewSummary} onChange={(event) => setReviewSummary(event.target.value)} disabled={demo || !profileReady} placeholder="Summarize persisted outcomes, decisions, risks, and next steps. Do not infer economic attribution." /></label><button className="button button--outline" type="submit" disabled={demo || saving || !profileReady || !reviewSummary.trim()}>Add historical review</button></form>
      {reviews.length ? <div className="integration-list">{reviews.map((review) => <div key={review.id}><span><strong>{review.review_type.replaceAll("_", " ")}</strong><small>{new Date(review.occurred_at).toLocaleDateString("en-GB")}</small></span><small>{review.summary} · Economic value: {review.economic_value_status.replaceAll("_", " ")}</small></div>)}</div> : <p className="table-caption">No customer-success review has been recorded. Foremention does not create sample QBRs or renewal outcomes.</p>}
    </section>
  </>;
}
