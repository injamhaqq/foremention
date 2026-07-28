import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { requireViewer } from "@/lib/auth";
import { loadWorkspaceContext } from "@/lib/data";

export default async function OnboardingPage() {
  const viewer = await requireViewer("/app/onboarding");
  const existing = await loadWorkspaceContext(viewer);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Guided setup</span><h1>Build the evidence boundary.</h1><p>Define the company, market, comparison set, goals, and exact prompts before collecting an answer.</p></div></div>
    <section className="panel">
      {existing && viewer.mode !== "demo"
        ? <div className="onboarding-complete"><span className="eyebrow">Workspace already created</span><h2>{existing.organizationName}</h2><p>Your active project and category are persistent. Continue with buyer questions or start a controlled collection.</p><div className="settings-actions"><Link className="button button--ink" href="/app/prompts">Review questions →</Link><Link className="button button--outline" href="/app/runs">Open collection</Link></div></div>
        : <OnboardingWizard demo={viewer.mode === "demo"} draftKey={`foremention:onboarding:${viewer.id}`} />}
    </section>
  </main>;
}
