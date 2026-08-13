import { demoPlacements, demoRuns, sourceMapEntries } from "./demo-data.ts";

export type DemoSearchKind = "Question" | "AI Result" | "Source" | "Competitor" | "Opportunity" | "Action";
export type DemoSearchResult = {
  id: string;
  kind: DemoSearchKind;
  title: string;
  detail: string;
  meta: string;
  href: string;
};

type DemoPrompt = { id: string; cluster: string; text: string; approved: boolean };

function matches(query: string, ...values: Array<string | number | boolean | null | undefined>) {
  const needle = query.toLocaleLowerCase();
  return values.some((value) => String(value ?? "").toLocaleLowerCase().includes(needle));
}

/**
 * Search only fictional in-memory demo records. This module has no Supabase,
 * auth-token, provider, or customer-data dependency by design.
 */
export function buildDemoWorkspaceSearch(query: string, prompts: DemoPrompt[], competitors: string[]): DemoSearchResult[] {
  const questions: DemoSearchResult[] = prompts
    .filter((prompt) => matches(query, prompt.text, prompt.cluster, prompt.approved ? "active approved" : "paused draft"))
    .slice(0, 12)
    .map((prompt) => ({
      id: `demo-question-${prompt.id}`,
      kind: "Question",
      title: prompt.text,
      detail: prompt.approved ? "Active fictional buyer question" : "Paused fictional buyer question",
      meta: `Fictional demo · ${prompt.cluster}`,
      href: "/app/prompts",
    }));

  const runs: DemoSearchResult[] = demoRuns
    .filter((run) => ["complete", "partial"].includes(run.status))
    .filter((run) => matches(query, run.id, run.date, run.status, "collection run ai result answers citations brand presence", run.answers, run.citations, run.presence))
    .slice(0, 12)
    .map((run) => ({
      id: `demo-run-${run.id}`,
      kind: "AI Result",
      title: `Fictional collection ${run.id}`,
      detail: `${run.answers} fictional answers · ${run.citations} returned citations · ${run.presence}% brand presence`,
      meta: `Fictional demo · ${run.date} · ${run.status}`,
      href: "/app/runs",
    }));

  const sources: DemoSearchResult[] = sourceMapEntries
    .filter((source) => matches(query, source.domain, source.title, source.url, source.type, source.route, source.influence, ...source.competitors))
    .slice(0, 12)
    .map((source) => ({
      id: `demo-source-${source.id}`,
      kind: "Source",
      title: source.title,
      detail: source.url,
      meta: `Fictional demo · ${source.type} · ${source.crawlerAccess} crawl access`,
      href: "/app/source-map",
    }));

  const competitorResults: DemoSearchResult[] = Array.from(new Set(competitors))
    .filter((name) => matches(query, name, "competitor tracked brand"))
    .slice(0, 12)
    .map((name, index) => ({
      id: `demo-competitor-${index}-${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      kind: "Competitor",
      title: name,
      detail: "Appears in the fictional Northstar HR Source Map.",
      meta: "Fictional demo · tracked competitor",
      href: "/app/competitors",
    }));

  const opportunities: DemoSearchResult[] = sourceMapEntries
    .filter((source) => !source.clientPresent)
    .filter((source) => matches(query, source.domain, source.title, source.url, source.route, source.feasibility, "source gap opportunity", ...source.competitors))
    .slice(0, 12)
    .map((source) => ({
      id: `demo-opportunity-${source.id}`,
      kind: "Opportunity",
      title: source.title,
      detail: "Fictional source gap where Northstar HR is not shown on this demonstration page.",
      meta: `Fictional demo · ${source.evidenceCount} citation observations · ${source.route}`,
      href: "/app/opportunities",
    }));

  const actions: DemoSearchResult[] = demoPlacements
    .filter((action) => matches(query, action.source, action.page, action.route, action.owner, action.stage, action.updated, "action placement"))
    .slice(0, 12)
    .map((action) => ({
      id: `demo-action-${action.id}`,
      kind: "Action",
      title: action.page,
      detail: `${action.stage} · ${action.route}`,
      meta: `Fictional demo · ${action.owner} · ${action.updated}`,
      href: "/app/placements",
    }));

  return [...questions, ...runs, ...sources, ...competitorResults, ...opportunities, ...actions];
}
