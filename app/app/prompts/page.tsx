import Link from "next/link";
import { PromptLibrary } from "@/components/prompt-library";
import { requireViewer } from "@/lib/auth";
import { loadPrompts, loadWorkspaceContext } from "@/lib/data";
import { loadTruthfulSourceMap } from "@/lib/evidence-integrity-data";
import { buildSourceMapQuestionSuggestions } from "@/lib/question-suggestions";

export default async function PromptsPage() {
  const viewer = await requireViewer("/app/prompts");
  const [prompts, workspace, sourceMap] = await Promise.all([loadPrompts(viewer), loadWorkspaceContext(viewer), loadTruthfulSourceMap(viewer)]);
  const sourceSuggestions = buildSourceMapQuestionSuggestions(workspace?.category || "B2B software", sourceMap);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Controlled measurement</span><h1>Buyer Questions</h1><p>Approved buyer questions, grouped by intent. Wording stays stable between baseline and follow-up runs. Source-informed suggestions distinguish observed citations from facts that have actually passed human review.</p></div><Link className="button button--ink" href="/app/runs">Review AI Results &rarr;</Link></div>
    <section className="panel panel--flush"><PromptLibrary initialPrompts={prompts} demo={viewer.mode === "demo"} company={workspace?.organizationName || "your company"} category={workspace?.category || "your category"} sourceSuggestions={sourceSuggestions} /></section>
  </main>;
}
