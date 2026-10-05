"use client";

import { useState } from "react";

export type ProjectSwitcherOption = {
  id: string;
  name: string;
  brand: string;
};

export function ProjectSwitcher({
  projects,
  activeProjectId,
}: {
  projects: ProjectSwitcherOption[];
  activeProjectId: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function switchProject(projectId: string) {
    if (!projectId || projectId === activeProjectId || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/projects/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not switch project.");
      // A full navigation deliberately abandons in-flight requests from the old
      // project before the new authorized scope is rendered.
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not switch project.");
      setBusy(false);
    }
  }

  if (!projects.length) return null;

  return <div className="workspace-project-switcher">
    <label>
      <span>Active project</span>
      <select
        aria-label="Active project"
        disabled={busy || projects.length < 2}
        value={activeProjectId || projects[0].id}
        onChange={(event) => void switchProject(event.target.value)}
      >
        {projects.map((project) => <option value={project.id} key={project.id}>{project.brand || project.name}</option>)}
      </select>
    </label>
    {busy && <small role="status">Switching project…</small>}
    {message && <small role="alert">{message}</small>}
  </div>;
}
