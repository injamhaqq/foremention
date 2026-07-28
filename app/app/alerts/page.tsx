import { NotificationCenter } from "@/components/notification-center";
import { requireViewer } from "@/lib/auth";
import { loadNotifications } from "@/lib/data";

export default async function AlertsPage() {
  const viewer = await requireViewer("/app/alerts");
  const items = await loadNotifications(viewer);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Workspace signal</span><h1>Alerts</h1><p>Real operational events from your workspace—not fabricated urgency, predicted traffic, or ranking claims.</p></div></div>
    <NotificationCenter initialItems={items} demo={viewer.mode === "demo"} />
  </main>;
}
