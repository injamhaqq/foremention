import { TeamManagement } from "@/components/team-management";
import { requireViewer } from "@/lib/auth";
import { loadTeam } from "@/lib/data";

export default async function TeamPage() {
  const viewer = await requireViewer("/app/team");
  const team = await loadTeam(viewer);
  return <main className="workspace">
    <div className="workspace-heading"><div><span className="eyebrow">Controlled collaboration</span><h1>Team</h1><p>Invite teammates with expiring, single-use links. Roles are enforced on the server and every membership change is auditable.</p></div></div>
    <TeamManagement initialMembers={team.members} initialInvitations={team.invitations} currentRole={team.role} demo={viewer.mode === "demo"} />
    <div className="evidence-note"><strong>Role boundary</strong><p>Owners control roles and removal. Admins can operate the workspace and invite teammates. Analysts can collect and review evidence. Viewers have read-only access.</p></div>
  </main>;
}
