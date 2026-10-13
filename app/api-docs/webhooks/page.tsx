import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Workspace Webhook Documentation",
  description: "How to verify Foremention workspace webhook signatures, handle at-least-once delivery, and deduplicate recorded events.",
  path: "/api-docs/webhooks",
});

export default function WebhookDocsPage() {
  return <PublicShell><div className="legal-page"><span className="eyebrow">Developer docs</span><h1>Workspace webhooks</h1><p>When a workspace webhook is configured and enabled, Foremention can send signed JSON events to its approved public HTTPS endpoint after recorded workspace changes. Delivery is at least once, so consumers must deduplicate by <code>id</code>.</p>
    <h2>Events</h2><ul><li><code>collection.completed</code></li><li><code>source.reviewed</code></li><li><code>action.completed</code></li><li><code>evidence.reviewed</code></li></ul>
    <h2>Verify every request</h2><p>Keep the signing secret shown when the endpoint is created. Compute HMAC-SHA256 over <code>timestamp.body</code>, compare it in constant time with <code>x-foremention-signature</code>, reject stale timestamps, and deduplicate the event ID. Never accept a browser redirect as proof of delivery.</p>
    <h2>Payload</h2><pre>{`{\n  "id": "collection.completed:RUN_ID",\n  "type": "collection.completed",\n  "occurred_at": "2026-08-02T12:00:00.000Z",\n  "organization_id": "...",\n  "data": { "href": "/app/runs/RUN_ID" }\n}`}</pre>
    <p>Configure endpoints from workspace Settings. <Link href="/app/settings">Open Settings</Link>.</p>
  </div></PublicShell>;
}
