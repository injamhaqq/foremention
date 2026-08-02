import { verifyEmailUnsubscribeToken } from "@/lib/email-unsubscribe";

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = String((await searchParams).token || "");
  const valid = Boolean(await verifyEmailUnsubscribeToken(token, process.env.EMAIL_UNSUBSCRIBE_SECRET || ""));
  return <main className="legal-page"><section><span className="eyebrow">Email preferences</span><h1>{valid ? "Stop product alerts." : "This link is invalid or expired."}</h1>{valid ? <><p>This turns off Foremention application alerts and weekly digests for this workspace. Authentication and security email remain separate.</p><form action="/api/email/unsubscribe" method="post"><input type="hidden" name="token" value={token} /><button className="button button--ink" type="submit">Unsubscribe</button></form></> : <p>Open workspace Settings while signed in to update your preferences.</p>}</section></main>;
}
