export default function Loading() {
  return <div className="state-page state-page--loading" role="status" aria-live="polite" aria-busy="true"><div className="loading-mark" /><div><span className="eyebrow">Loading evidence</span><p className="state-page__title">Tracing the source chain.</p><p>Preparing the next view without inventing missing results.</p></div></div>;
}
