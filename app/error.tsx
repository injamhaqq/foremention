"use client";

import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main className="state-page"><div><span className="eyebrow">Recoverable error</span><h1>This page did not load.</h1><p>Your saved workspace data was not changed. Try the request again. If the same step keeps failing, return to Overview and continue from the last completed state.</p><div className="settings-actions"><button className="button button--ink" type="button" onClick={reset}>Try again &rarr;</button><a className="button button--outline" href="/app">Go to Overview</a></div></div></main>;
}
