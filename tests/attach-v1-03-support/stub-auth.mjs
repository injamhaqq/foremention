export const stubState = globalThis.__attach03Stub ||= { viewer: null, role: "owner", context: null };
export async function requireViewer() { return stubState.viewer; }
export async function getViewer() { return stubState.viewer; }
