import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { searchWorkspace } from "@/lib/workspace-search";

const destinations = [
  ["/app/alerts", "Alerts", "Unread changes and operational notifications"],
  ["/app/competitors", "Competitors", "Tracked and candidate competitors"],
  ["/app/opportunities", "Opportunities", "Reviewed evidence worth acting on"],
  ["/app/placements", "Actions", "Owned follow-through and remeasurement"],
  ["/app/resolutions", "Resolution Center", "Resolve blocked or disputed work"],
  ["/app/outcomes", "Outcome Ledger", "Observed outcomes and attribution boundaries"],
  ["/app/intelligence", "Intelligence Loop", "Reviewed weekly evidence and next action"],
  ["/app/decision-lab", "Decision Lab", "Decision readiness without a composite score"],
  ["/app/evidence", "Evidence Vault", "Verified company evidence"],
  ["/app/passport", "Vendor Passport", "Structured vendor evidence output"],
  ["/app/agents", "Agent Control Plane", "Agent execution telemetry and approvals"],
  ["/app/team", "Team", "Workspace members and access"],
  ["/app/settings#integrations", "Integrations", "Connected workspace systems"],
  ["/app/support", "Support", "Product support and request history"],
] as const;

export default async function WorkspaceSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer("/app/search");
  const { q = "" } = await searchParams;
  const search = await searchWorkspace(viewer, q);
  const destinationQuery = search.query.trim().toLowerCase();
  const matchingDestinations = destinationQuery
    ? destinations.filter(([, title, detail]) => `${title} ${detail}`.toLowerCase().includes(destinationQuery))
    : destinations;

  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Global search</span><h1>Search Foremention</h1><p>Find workspace records or jump directly to a supporting tool without hunting through the product.</p></div></div>
    <form className="panel workspace-search-page" role="search" action="/app/search" method="get">
      <label htmlFor="workspace-search-page">Search this workspace</label>
      <div className="settings-actions"><input id="workspace-search-page" type="search" name="q" defaultValue={search.query} placeholder="Search records or tools…" maxLength={160} autoFocus /><button className="button button--ink" type="submit">Search</button></div>
    </form>

    {matchingDestinations.length > 0 && <section className="panel panel--flush workspace-destination-directory" aria-labelledby="workspace-destination-title">
      <div className="evidence-search__header"><div><span className="eyebrow">Workspace directory</span><h2 id="workspace-destination-title">{destinationQuery ? "Matching tools" : "Jump to a workspace tool"}</h2><p className="table-caption">Core workspace navigation stays focused; supporting tools remain easy to reach here and in All tools.</p></div></div>
      <div className="evidence-search__results">{matchingDestinations.map(([href, title, detail]) => <Link href={href} key={href}><span>Tool</span><div><strong>{title}</strong><p>{detail}</p></div><span aria-hidden="true">&rarr;</span></Link>)}</div>
    </section>}

    {search.failedKinds.length > 0 && <p className="inline-notice" role="status">Some result types could not be checked: {search.failedKinds.join(", ")}. Results below are partial; no missing category is being reported as zero.</p>}
    {!search.query ? <section className="panel empty-state"><h2>Search your workspace records.</h2><p>Try a buyer question, brand, source domain, answer phrase, opportunity, or action. Supporting tools are listed above.</p></section>
      : search.results.length ? <section className="panel panel--flush evidence-search"><div className="evidence-search__header"><div><span className="eyebrow">{search.results.length} result{search.results.length === 1 ? "" : "s"}</span><h2>Record matches for “{search.query}”</h2></div></div><div className="evidence-search__results">{search.results.map((result) => <Link href={result.href} key={result.id}><span>{result.kind}</span><div><strong>{result.title}</strong><p>{result.detail}</p><small>{result.meta}</small></div><span aria-hidden="true">&rarr;</span></Link>)}</div></section>
        : <section className="panel empty-state"><h2>No matching workspace records.</h2><p>The record search returned no matches. Use a matching tool above or try fewer or more specific words.</p><Link className="text-link" href="/app">Back to Overview &rarr;</Link></section>}
  </main>;
}
