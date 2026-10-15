"use client";

import { useEffect, useState } from "react";
import { WORKSPACE_CREATED_EVENT, workspaceStatusLabel, type WorkspaceSetupState } from "@/lib/workspace-setup-status";

/**
 * The shell is rendered before onboarding saves the workspace, and the
 * onboarding page stays mounted through the first evidence check. Listening
 * for the onboarding success event keeps the badge from claiming
 * "Setup required" after setup is already done.
 */
export function WorkspaceStatusBadge({ state, demo }: { state: WorkspaceSetupState; demo: boolean }) {
  const [current, setCurrent] = useState(state);
  useEffect(() => {
    const onCreated = () => setCurrent("ready");
    window.addEventListener(WORKSPACE_CREATED_EVENT, onCreated);
    return () => window.removeEventListener(WORKSPACE_CREATED_EVENT, onCreated);
  }, []);
  return <span className="demo-badge">{workspaceStatusLabel(current, demo)}</span>;
}
