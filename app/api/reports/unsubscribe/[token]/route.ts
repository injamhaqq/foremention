import { unsubscribeReportRecipient } from "@/lib/report-recipient";

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

export async function POST(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const unsubscribed = await unsubscribeReportRecipient(token).catch(() => false);
  if (!unsubscribed) return Response.json({ error: "This unsubscribe link is invalid or unavailable." }, { status: 404, headers: HEADERS });
  return Response.json({ data: { unsubscribed: true } }, { headers: HEADERS });
}
