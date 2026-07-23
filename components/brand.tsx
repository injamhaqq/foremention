import Link from "next/link";

export function SourceEclipseMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`source-eclipse${inverse ? " source-eclipse--inverse" : ""}`} aria-hidden="true">
      <span className="source-eclipse__orbit" />
      <span className="source-eclipse__point" />
    </span>
  );
}

export function Wordmark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`wordmark${inverse ? " wordmark--inverse" : ""}`} href="/">
      <SourceEclipseMark inverse={inverse} />
      <span className="wordmark__name">foremention</span>
    </Link>
  );
}

export function Arrow({ direction = "right" }: { direction?: "right" | "up" }) {
  return <span aria-hidden="true">{direction === "up" ? "↗" : "→"}</span>;
}

export function StatusDot({ tone = "yellow" }: { tone?: "yellow" | "green" | "gray" | "red" }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}
