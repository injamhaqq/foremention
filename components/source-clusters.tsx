import type { SourceCluster } from "@/lib/source-clustering";

export function SourceClusters({ clusters }: { clusters: SourceCluster[] }) {
  if (!clusters.length) return null;
  return <section className="source-clusters" aria-labelledby="source-clusters-title">
    <div><span className="eyebrow">Source clusters</span><h2 id="source-clusters-title">Where the category evidence comes from.</h2><p>Deterministic publisher-type groups organize observed citations. They do not imply authority or influence.</p></div>
    <div>{clusters.map((cluster) => <article key={cluster.id}><span>{cluster.label}</span><strong>{cluster.sourceCount} source{cluster.sourceCount === 1 ? "" : "s"}</strong><small>{cluster.observations} citation observation{cluster.observations === 1 ? "" : "s"} · {cluster.domains.length} domain{cluster.domains.length === 1 ? "" : "s"}</small>{cluster.entries[0] && <a href={cluster.entries[0].url} target="_blank" rel="noreferrer">Open cited page ↗</a>}</article>)}</div>
  </section>;
}
