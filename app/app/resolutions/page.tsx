import Link from "next/link";
import { ResolutionCenter } from "@/components/resolution-center";
import { requireViewer } from "@/lib/auth";
import { getPrimaryWorkspaceRole } from "@/lib/data";
import styles from "./resolution-center.module.css";

export default async function ResolutionsPage() {
  const viewer = await requireViewer("/app/resolutions");
  const role = await getPrimaryWorkspaceRole(viewer);

  return <main className={`workspace ${styles.page}`}>
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Evidence to action</span>
        <h1>Resolution Center</h1>
        <p>Turn a measured problem into a reviewable solution asset, record where your team applied it, and run a comparable follow-up measurement.</p>
      </div>
      <Link className="button button--outline" href="/app/intelligence">Open Intelligence Loop</Link>
    </div>

    <ResolutionCenter demo={viewer.mode === "demo"} role={role || "viewer"} />

    <aside className={styles.boundary}>
      <strong>Decision boundary</strong>
      <p>Foremention separates observed evidence, proposed changes, customer approval, recorded application, and later measurement. A follow-up change is an observation—not proof that an asset caused an AI provider to change its answer.</p>
    </aside>
  </main>;
}
