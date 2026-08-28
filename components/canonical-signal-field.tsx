export function CanonicalSignalField({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`canonical-signal canonical-signal--reference${compact ? " canonical-signal--compact" : ""}`} aria-hidden="true">
      <img
        className="canonical-signal__reference-art"
        src="/brand/foremention-hero-signal.jpg"
        alt=""
        width="760"
        height="773"
        draggable={false}
      />
    </div>
  );
}
