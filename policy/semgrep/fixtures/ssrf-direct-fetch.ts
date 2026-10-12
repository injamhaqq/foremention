// Fixture: request-supplied URL fetched directly — must be flagged.
export async function POST(request: Request) {
  const body = await request.json();
  const response = await fetch(body.url);
  return new Response(await response.text());
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("target") || "";
  const response = await fetch(target, { redirect: "follow" });
  return new Response(response.body);
}
