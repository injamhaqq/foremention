"use client";

import * as Sentry from "@sentry/react";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const pathname = usePathname();
  const reference = error.digest?.slice(0, 32) || null;

  useEffect(() => {
    Sentry.captureException(error, {
      tags: { surface: "workspace-route", route: pathname || "/app" },
      extra: reference ? { errorReference: reference } : undefined,
    });
  }, [error, pathname, reference]);

  return <main className="workspace">
    <section className="panel empty-state" role="alert">
      <span className="eyebrow">This view needs another try</span>
      <h1>We couldn&apos;t load this part of Foremention.</h1>
      <p>Your saved workspace data was not changed. Retry this view safely; the retry does not create a collection or duplicate evidence by itself.</p>
      <div className="settings-actions">
        <button className="button button--ink" type="button" onClick={reset}>Retry this view &rarr;</button>
        <Link className="button button--outline" href="/app">Go to Overview</Link>
      </div>
      {reference && <small>Support reference: {reference}</small>}
    </section>
  </main>;
}
