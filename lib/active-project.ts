import { cookies } from "next/headers";

export const ACTIVE_PROJECT_COOKIE = "foremention_active_project";

export function isValidProjectId(value: string | null | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function getRequestedActiveProjectId() {
  const store = await cookies();
  const value = store.get(ACTIVE_PROJECT_COOKIE)?.value || null;
  return isValidProjectId(value) ? value : null;
}

export async function persistActiveProjectId(projectId: string) {
  if (!isValidProjectId(projectId)) throw new Error("A valid project ID is required.");
  const store = await cookies();
  store.set(ACTIVE_PROJECT_COOKIE, projectId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
