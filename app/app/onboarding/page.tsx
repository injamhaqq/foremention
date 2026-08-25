import Link from "next/link";
import { ScoreAwareOnboarding } from "@/components/score-aware-onboarding";
import { requireViewer } from "@/lib/auth";
import { getProviderStatuses, loadWorkspaceContext } from "@/lib/data";
import { safePublicScoreId } from "@/lib/score-handoff";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ score_id?: string }> }) {
  const query = await searchParams;
  const scoreId = safePublicScoreId(query.score_id);
  const requestedPath = scoreId ? `/app/onboarding?score_id=${encodeURIComponent(scoreId)}` : "/app/onboarding";
  const viewer = await requireViewer(requestedPath);
  const existing = await loadWorkspaceContext(viewer);
  const configuredProviders = getProviderStatuses().filter((provider) => provider.configured);
  const firstAuditProvider = configuredProviders.find((provider) => provider.supportsCitations) || configuredProviders[0] || null;
  return <main className="workspace workspace--evidence-onboarding">
    <div className="workspace-heading"><div><span className="eyebrow">Measurement record setup</span><h1>Create the boundary for your first evidence record.</h1><p>Start from your company and market, confirm the comparison set and buyer questions, then approve the controlled baseline before the first collection begins.</p></div></div>
    <section className="panel">
      {existing && viewer.mode !== "demo"
        ? <div className="onboarding-complete"><span className="eyebrow">Workspace already created</span><h2>{existing.organizationName}</h2><p>Your active project and category are saved. Continue with buyer questions or start a controlled collection.</p><div className="settings-actions"><Link className="button button--ink" href="/app/prompts">Review questions</Link><Link className="button button--outline" href="/app/runs">Open collection</Link></div></div>
        : <ScoreAwareOnboarding demo={viewer.mode === "demo"} draftKey={`foremention:onboarding:${viewer.id}`} firstAuditProvider={firstAuditProvider ? { id: firstAuditProvider.id, label: firstAuditProvider.label } : null} scoreId={scoreId} />}
    </section>
  </main>;
}
