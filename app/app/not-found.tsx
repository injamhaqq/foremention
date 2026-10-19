import type { Metadata } from "next";
import Link from "next/link";
import { SUPPORT_EMAIL, supportMailtoHref } from "@/lib/support-contact";

// Signed-in 404: rendered inside the workspace shell (sidebar and search stay
// available) instead of the public marketing 404 page.
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function WorkspaceNotFound() {
  return <main className="workspace workspace-not-found">
    <section className="panel empty-state" aria-labelledby="workspace-not-found-title">
      <span className="eyebrow">404 · Page not found</span>
      <h1 id="workspace-not-found-title">This workspace page doesn&apos;t exist.</h1>
      <p>The link may be out of date, the record may belong to another project, or you may not have access to it. Nothing in your workspace was changed.</p>
      <div className="settings-actions">
        <Link className="button button--ink" href="/app">Go to Overview &rarr;</Link>
        <Link className="button button--outline" href="/app/runs">Open Records</Link>
        <Link className="button button--outline" href="/app/tools">All tools</Link>
        <Link className="button button--outline" href="/app/search">Search workspace</Link>
      </div>
      <p className="table-caption">If you followed a link from Foremention, tell us at <a className="text-link" href={supportMailtoHref("Broken workspace link")}>{SUPPORT_EMAIL}</a>.</p>
    </section>
  </main>;
}
