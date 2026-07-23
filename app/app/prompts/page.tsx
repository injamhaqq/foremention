import { PromptLibrary } from "@/components/prompt-library";
import { requireViewer } from "@/lib/auth";

export default async function PromptsPage() { await requireViewer("/app/prompts"); return <main className="workspace"><div className="workspace-heading"><div><span className="eyebrow">Controlled measurement</span><h1>Prompt library</h1><p>Approved buyer questions, grouped by intent. Prompt wording remains stable between baseline and follow-up runs.</p></div><a className="button button--ink" href="/app/runs">Review run history →</a></div><section className="panel panel--flush"><PromptLibrary /></section></main>; }
