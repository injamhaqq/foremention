"use client";

import * as Sentry from "@sentry/react";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html><body><main className="state-page"><div><span>foremention</span><h1>The application hit an unexpected error.</h1><p>The session is intact. Retry before taking any destructive action.</p><button type="button" onClick={reset}>Retry</button></div></main></body></html>;
}
