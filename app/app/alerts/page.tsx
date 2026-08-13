import { NotificationCenter } from "@/components/notification-center";
import { requireViewer } from "@/lib/auth";
import { loadNotifications } from "@/lib/data";
import { productStateLabel, stateForAlerts } from "@/lib/product-state";

export default async function AlertsPage() {
  const viewer = await requireViewer("/app/alerts");
  const items = await loadNotifications(viewer);
  const state = stateForAlerts(items);
  const unread = items.filter((item) => !item.read).length;
  const stateNote = !items.length
    ? "No recorded alert events need attention"
    : unread
      ? `${unread} unread of ${items.length} alert groups`
      : `${items.length} recorded alert groups · all read`;

  return <main className="workspace" data-product-state={state}>
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Workspace signal</span>
        <h1>Alerts</h1>
        <p>Real operational events from your workspace—not fabricated urgency, predicted traffic, or ranking claims.</p>
        <p className="table-caption"><strong>{productStateLabel(state)}</strong> · {stateNote}</p>
      </div>
    </div>
    <NotificationCenter initialItems={items} demo={viewer.mode === "demo"} />
  </main>;
}
