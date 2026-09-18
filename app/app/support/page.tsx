import { SupportCenter } from "@/components/support-center";
import { requireViewer } from "@/lib/auth";

export default async function SupportPage() {
  const viewer = await requireViewer("/app/support");
  return <main className="workspace">
    <div className="workspace-heading">
      <div>
        <span className="eyebrow">Workspace support</span>
        <h1>Support</h1>
        <p>Submit an account or product question with your workspace context attached. Foremention records the request first, then prepares any AI-assisted reply for human review before sending.</p>
      </div>
    </div>
    <SupportCenter demo={viewer.mode === "demo"} />
    <div className="evidence-note"><strong>Support boundary</strong><p>Support diagnostics are operational context, not Recommendation Intelligence evidence. A drafted reply is not sent until an authorized operator approves and separately executes it.</p></div>
  </main>;
}
