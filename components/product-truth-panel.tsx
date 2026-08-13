import type { ProductTruthMetric } from "@/lib/product-truth";

export function ProductTruthPanel({ metrics, title = "How these numbers are built" }: { metrics: ProductTruthMetric[]; title?: string }) {
  if (!metrics.length) return null;
  return <details className="evidence-note product-truth" data-product-truth="metric-provenance">
    <summary><strong>{title}</strong> · source, sample, freshness, review, scope, and methodology</summary>
    <div className="product-truth__records">
      {metrics.map((metric) => <article key={metric.id}>
        <strong>{metric.label}</strong>
        <dl>
          <div><dt>Source</dt><dd>{metric.source}</dd></div>
          <div><dt>Sample</dt><dd>{metric.sample}</dd></div>
          <div><dt>Denominator</dt><dd>{metric.denominator}</dd></div>
          <div><dt>Freshness</dt><dd>{metric.freshness}</dd></div>
          <div><dt>Verification</dt><dd>{metric.verification}</dd></div>
          <div><dt>Workspace scope</dt><dd>{metric.scope}</dd></div>
          <div><dt>Methodology</dt><dd>{metric.methodology}</dd></div>
        </dl>
      </article>)}
    </div>
  </details>;
}
