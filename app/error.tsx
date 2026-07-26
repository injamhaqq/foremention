"use client";

import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main className="state-page"><div><span className="eyebrow">Recoverable error</span><h1>The evidence view did not load.</h1><p>No data has been changed. Retry the request, or return later if the provider is unavailable.</p><button className="button button--ink" type="button" onClick={reset}>Try again →</button></div></main>;
}
