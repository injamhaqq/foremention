import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { searchWorkspace } from "@/lib/workspace-search";

export default async function WorkspaceSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer("/app/search");
  const { q = "" } = await searchParams;
  const search = await searchWorkspace(viewer, q);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Global search</span><h1>Search Foremention</h1><p>Find buyer questions, reviewed AI results, cited sources, competitors, reviewed opportunities, and actions in this workspace.</p></div></div>
    <form className="panel workspace-search-page" role="search" action="/app/search" method="get">
      <label htmlFor="workspace-search-page">Search this workspace</label>
      <div className="settings-actions"><input id="workspace-search-page" type="search" name="q" defaultValue={search.query} placeholder="Search Foremention…" maxLength={160} autoFocus /><button className="button button--ink" type="submit">Search</button></div>
    </form>
    {search.failedKinds.length > 0 && <p className="inline-notice" role="status">Some result types could not be checked: {search.failedKinds.join(", ")}. Results below are partial; no missing category is being reported as zero.</p>}
    {!search.query ? <section className="panel empty-state"><h2>Search your workspace.</h2><p>Try a buyer question, brand, source domain, answer phrase, opportunity, or action.</p></section>
      : search.results.length ? <section className="panel panel--flush evidence-search"><div className="evidence-search__header"><div><span className="eyebrow">{search.results.length} result{search.results.length === 1 ? "" : "s"}</span><h2>Matches for “{search.query}”</h2></div></div><div className="evidence-search__results">{search.results.map((result) => <Link href={result.href} key={result.id}><span>{result.kind}</span><div><strong>{result.title}</strong><p>{result.detail}</p><small>{result.meta}</small></div><span aria-hidden="true">&rarr;</span></Link>)}</div></section>
        : <section className="panel empty-state"><h2>No matching workspace records.</h2><p>All six product areas were searched unless a partial-search notice appears above. Try fewer or more specific words.</p><Link className="text-link" href="/app">Back to Overview &rarr;</Link></section>}
  </main>;
}
