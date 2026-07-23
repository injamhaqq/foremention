import { DEMO_COOKIE } from "@/lib/auth";

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": `${DEMO_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  });
}
