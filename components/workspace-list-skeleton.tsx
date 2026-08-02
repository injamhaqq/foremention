export function WorkspaceListSkeleton({ label = "workspace records", rows = 5 }: { label?: string; rows?: number }) {
  return <main className="workspace workspace-skeleton" aria-live="polite" aria-busy="true">
    <div className="workspace-skeleton__heading"><span className="skeleton-line skeleton-line--eyebrow" /><span className="skeleton-line skeleton-line--title" /><span className="skeleton-line skeleton-line--copy" /></div>
    <section className="workspace-skeleton__panel" aria-label={`Loading ${label}`}>
      <div className="workspace-skeleton__tools"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div>
      <div aria-hidden="true">{Array.from({ length: rows }, (_, index) => <div className="workspace-skeleton__row" key={index}><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /></div>)}</div>
      <p className="sr-only">Loading {label}. Real records will replace this placeholder.</p>
    </section>
  </main>;
}
