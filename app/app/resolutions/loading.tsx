import styles from "./resolution-center.module.css";

export default function ResolutionsLoading() {
  return <main className={`workspace ${styles.page}`} aria-busy="true" aria-label="Loading Resolution Center">
    <div className={styles.loadingHeading} />
    <div className={styles.loadingLoop}>{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
    <div className={styles.loadingGrid}>
      <div />
      <div />
    </div>
    <span className={styles.srOnly}>Loading Resolution Center…</span>
  </main>;
}
