import Link from "next/link";

/**
 * The previously introduced custom Foremention logo/mark identity has been
 * retired. Keep this compatibility component non-visual so older call sites
 * cannot accidentally reintroduce that artwork.
 */
export function ForementionMark() {
  return null;
}

/** @deprecated Compatibility alias only. */
export function SourceEclipseMark() {
  return null;
}

/**
 * Neutral product-name label only. This deliberately does not load, recreate,
 * invert, recolor, or otherwise derive any logo/wordmark artwork.
 */
export function Wordmark({ inverse: _inverse = false }: { inverse?: boolean }) {
  return (
    <Link className="wordmark wordmark--text-only" href="/" aria-label="Foremention home">
      <span className="wordmark__text">Foremention</span>
    </Link>
  );
}

export function Arrow({ direction = "right" }: { direction?: "right" | "up" }) {
  return <span aria-hidden="true">{direction === "up" ? "↗" : "→"}</span>;
}

export function StatusDot({ tone = "yellow" }: { tone?: "yellow" | "green" | "gray" | "red" }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}
