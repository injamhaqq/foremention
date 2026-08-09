"use client";

import Link from "next/link";
import styles from "./resolution-center.module.css";

export default function ResolutionsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className={`workspace ${styles.page}`}>
    <section className={styles.routeError} role="alert">
      <span className="eyebrow">Recoverable error</span>
      <h1>Resolution Center did not load.</h1>
      <p>No customer record was changed. Try the request again, or return to the Intelligence Loop and continue reviewing measured evidence.</p>
      <div className={styles.buttonRow}>
        <button className="button button--ink" type="button" onClick={reset}>Try again</button>
        <Link className="button button--outline" href="/app/intelligence">Open Intelligence Loop</Link>
      </div>
    </section>
  </main>;
}
