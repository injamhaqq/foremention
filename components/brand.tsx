import Link from "next/link";

/**
 * @deprecated Legacy pre-Evidence-Standard mark kept temporarily for compatibility
 * with historical documentation/tests. Active product branding uses the canonical
 * Foremention vector assets below.
 */
export function SourceEclipseMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`source-eclipse${inverse ? " source-eclipse--inverse" : ""}`} aria-hidden="true">
      <span className="source-eclipse__orbit" />
      <span className="source-eclipse__point" />
    </span>
  );
}

export function ForementionMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <img
      className="foremention-mark"
      src={inverse ? "/brand/foremention-mark-white.svg" : "/brand/foremention-mark.svg"}
      width="23"
      height="23"
      alt=""
      aria-hidden="true"
    />
  );
}

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`wordmark${inverse ? " wordmark--inverse" : ""}`} href="/" aria-label="Foremention home">
      <img
        className="wordmark__art"
        src={inverse ? "/brand/foremention-logo-white.svg" : "/brand/foremention-logo.svg"}
        width="264"
        height="33"
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
