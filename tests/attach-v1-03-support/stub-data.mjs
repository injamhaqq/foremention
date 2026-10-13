const stubState = globalThis.__attach03Stub ||= { viewer: null, role: "owner", context: null };
export async function getPrimaryWorkspaceRole() { return stubState.role; }
export async function loadWorkspaceContext() { return stubState.context; }
