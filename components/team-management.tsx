"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceInvitation, WorkspaceRole, WorkspaceTeamMember } from "@/lib/data";

type InviteResult = {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  expiresAt: string;
  shareUrl: string;
  emailDelivery: "not_configured";
};

export function TeamManagement({
  initialMembers,
  initialInvitations,
  currentRole,
  demo,
}: {
  initialMembers: WorkspaceTeamMember[];
  initialInvitations: WorkspaceInvitation[];
  currentRole: WorkspaceRole | null;
  demo: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<WorkspaceRole, "owner">>("analyst");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const canInvite = !demo && Boolean(currentRole && ["owner", "admin"].includes(currentRole));
  const canManageRoles = !demo && currentRole === "owner";

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy("invite");
    setMessage("");
    setShareUrl("");
    try {
      const response = await fetch("/api/team/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json() as { data?: InviteResult; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error || "The invitation could not be created.");
      setShareUrl(result.data.shareUrl);
      setEmail("");
      setMessage("Secure invite created. Copy the link and send it only to the named teammate.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be created.");
    } finally {
      setBusy("");
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Invite link copied. It expires in seven days and can be used once.");
    } catch {
      setMessage("Copy the invite link manually from the field below.");
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    setMessage("");
    try {
      const response = await fetch(`/api/team/invitations/${id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The invitation could not be revoked.");
      setMessage("Invitation revoked.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The invitation could not be revoked.");
    } finally {
      setBusy("");
    }
  }

  async function updateMember(userId: string, nextRole: WorkspaceRole) {
    setBusy(userId);
    setMessage("");
    try {
      const response = await fetch(`/api/team/members/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The member role could not be changed.");
      setMessage("Member role updated.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The member role could not be changed.");
    } finally {
      setBusy("");
    }
  }

  async function removeMember(userId: string) {
    setBusy(userId);
    setMessage("");
    try {
      const response = await fetch(`/api/team/members/${userId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The member could not be removed.");
      setMessage("Workspace access removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The member could not be removed.");
    } finally {
      setBusy("");
    }
  }

  return <div className="team-stack">
    <section className="panel">
      <span className="eyebrow">Invite safely</span>
      <h2>Add a teammate with the minimum access they need.</h2>
      <form className="team-invite-form" onSubmit={invite}>
        <label>Work email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" required disabled={!canInvite} /></label>
        <label>Role<select value={role} onChange={(event) => setRole(event.target.value as Exclude<WorkspaceRole, "owner">)} disabled={!canInvite}><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option></select></label>
        <button className="button button--ink" type="submit" disabled={!canInvite || busy === "invite"}>{busy === "invite" ? "Creating…" : "Create secure invite"}</button>
      </form>
      {!canInvite && <p className="table-caption">{demo ? "Team changes are disabled in the fictional demo." : "Only owners and admins can create invitations."}</p>}
      {shareUrl && <div className="invite-link"><label>One-time invite link<input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" onClick={() => void copyInvite()}>Copy link</button><small>Application email delivery is not connected, so Foremention has not emailed this link.</small></div>}
      {message && <p className="inline-notice" role="status">{message}</p>}
    </section>

    <section className="panel panel--flush">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Members</span><h2>{initialMembers.length} workspace member{initialMembers.length === 1 ? "" : "s"}</h2></div></div>
      {initialMembers.length ? <div className="team-list">{initialMembers.map((member) => <article key={member.userId}>
        <div><span>{member.email.slice(0, 1).toUpperCase()}</span><div><strong>{member.email}{member.current ? " · You" : ""}</strong><small>Joined {member.joinedAt}</small></div></div>
        <div className="team-row-actions">
          <select aria-label={`Role for ${member.email}`} value={member.role} disabled={!canManageRoles || member.current || busy === member.userId} onChange={(event) => void updateMember(member.userId, event.target.value as WorkspaceRole)}>
            <option value="owner">Owner</option><option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option>
          </select>
          <button type="button" disabled={!canManageRoles || member.current || busy === member.userId} title={member.current ? "Use the account lifecycle controls to leave or close your own workspace." : undefined} onClick={() => void removeMember(member.userId)}>{member.current ? "Current account" : "Remove"}</button>
        </div>
      </article>)}</div> : <div className="empty-state"><h2>No member records are available.</h2><p>Team access cannot be managed until the current workspace membership is restored.</p><Link className="text-link" href="/app/settings">Check workspace settings →</Link></div>}
    </section>

    <section className="panel panel--flush">
      <div className="panel-heading panel-heading--padded"><div><span className="eyebrow">Pending access</span><h2>Invitations</h2></div></div>
      {initialInvitations.length ? <div className="team-list">{initialInvitations.map((invitation) => <article key={invitation.id}>
        <div><span>{invitation.email.slice(0, 1).toUpperCase()}</span><div><strong>{invitation.email}</strong><small>{invitation.role} · {invitation.status} · expires {invitation.expiresAt}</small></div></div>
        <button type="button" disabled={!canInvite || busy === invitation.id || invitation.status !== "pending"} onClick={() => void revoke(invitation.id)}>Revoke</button>
      </article>)}</div> : <div className="empty-state empty-state--compact"><p>No pending invitations.</p></div>}
    </section>
  </div>;
}
