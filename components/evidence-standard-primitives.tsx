import type { ReactNode } from "react";

export function RunningLabel({ number, label, className = "" }: { number: string; label: string; className?: string }) {
  return <span className={`fm-running-label ${className}`.trim()}><b>{number}</b><span aria-hidden="true"> / </span><span>{label}</span></span>;
}

export function EvidenceReference({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`fm-evidence-reference ${className}`.trim()}>{children}</span>;
}

type HonestyTone = "not-observed" | "not-comparable" | "insufficient";

const honestyCopy: Record<HonestyTone, string> = {
  "not-observed": "— NOT OBSERVED",
  "not-comparable": "≠ NOT COMPARABLE",
  insufficient: "± INSUFFICIENT EVIDENCE",
};

export function HonestyState({ tone }: { tone: HonestyTone }) {
  return <span className={`fm-honesty-state fm-honesty-state--${tone}`}>{honestyCopy[tone]}</span>;
}
