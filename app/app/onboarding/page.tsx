import { OnboardingWizard } from "@/components/onboarding-wizard";
import { requireViewer } from "@/lib/auth";

export default async function OnboardingPage() { const viewer = await requireViewer("/app/onboarding"); return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Guided setup</span><h1>Build the evidence boundary.</h1><p>Define the company, market, comparison set, goals, and exact prompts before collecting an answer.</p></div></div><section className="panel"><OnboardingWizard demo={viewer.mode === "demo"} /></section></main>; }
