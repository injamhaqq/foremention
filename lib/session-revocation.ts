export async function revokeAllSupabaseSessions(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !accessToken) return false;
  const response = await fetch(`${url}/auth/v1/logout?scope=global`, {
    method: "POST",
    headers: { apikey: anonKey, authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return response.ok;
}
