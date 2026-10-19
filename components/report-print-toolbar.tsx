"use client";

import Link from "next/link";

/** Screen-only controls above a printable report; hidden by @media print. */
export function ReportPrintToolbar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return <div className="print-record__toolbar" data-print="hide">
    <Link className="button button--outline" href={backHref}>&larr; {backLabel}</Link>
    <button className="button button--ink" type="button" onClick={() => window.print()}>Print or save as PDF</button>
  </div>;
}
