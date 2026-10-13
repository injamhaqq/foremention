// Minimal NextResponse for route runtime tests (Next's CJS entry does not
// expose named ESM exports to node's loader).
export class NextResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new Response(JSON.stringify(body), { ...init, headers });
  }
  static redirect(url, status = 307) {
    return new Response(null, { status, headers: { location: String(url) } });
  }
}
