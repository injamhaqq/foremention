"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html><body><main className="state-page"><div><span>foremention</span><h1>The application hit an unexpected error.</h1><p>The session is intact. Retry before taking any destructive action.</p><button type="button" onClick={reset}>Retry</button></div></main></body></html>;
}
