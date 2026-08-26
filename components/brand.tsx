import Link from "next/link";

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

/**
 * @deprecated Compatibility alias only. The historical implementation used
 * `source-eclipse__orbit` and `source-eclipse__point`; those classes no longer
 * define the active Foremention identity. Use ForementionMark for new code.
 */
export function SourceEclipseMark({ inverse = false }: { inverse?: boolean }) {
  return <ForementionMark inverse={inverse} />;
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
