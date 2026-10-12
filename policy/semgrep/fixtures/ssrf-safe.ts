// Fixture: compliant — must NOT be flagged.
import { inspectSourceUrl } from "@/lib/source-inspection";

export async function POST(request: Request) {
  const body = await request.json();
  const inspection = await inspectSourceUrl(body.url);
  const lookup = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(body.host)}`);
  return Response.json({ inspection, ok: lookup.ok });
}
