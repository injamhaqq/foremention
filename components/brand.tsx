import Link from "next/link";

/**
 * Canonical Foremention identity. The approved reverse artwork is used across
 * the black/green system so the mark is never replaced by a text fallback.
 */
export function ForementionMark({ inverse: _inverse = true }: { inverse?: boolean }) {
  return (
    <img
      className="foremention-mark"
      src="/brand/foremention-mark-white.svg"
      width="23"
      height="23"
      alt=""
      aria-hidden="true"
    />
  );
}

/** @deprecated Compatibility alias. Use ForementionMark for new code. */
export function SourceEclipseMark({ inverse = true }: { inverse?: boolean }) {
  return <ForementionMark inverse={inverse} />;
}

export function Wordmark({ inverse: _inverse = true }: { inverse?: boolean }) {
  return (
    <Link className="wordmark wordmark--inverse" href="/" aria-label="Foremention home">
      <img
        className="wordmark__art"
        src="/brand/foremention-logo-white.svg"
        width="264.096"
        height="33.24"
        alt="Foremention"
      />
    </Link>
  );
}

export function Arrow({ direction = "right" }: { direction?: "right" | "up" }) {
  return <span aria-hidden="true">{direction === "up" ? "↗" : "→"}</span>;
}

export function StatusDot({ tone = "yellow" }: { tone?: "yellow" | "green" | "gray" | "red" }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}
