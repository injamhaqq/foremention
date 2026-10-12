// Fixture: server component (no "use client") — must NOT be flagged.
export default function Page() {
  const ready = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  return <div>{ready ? "ready" : "not ready"}</div>;
}
