import Link from "next/link";
import { notFound } from "next/navigation";
import { InvitationAccept } from "@/components/invitation-accept";
import { Wordmark } from "@/components/brand";
import { requireViewer } from "@/lib/auth";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) notFound();
  const viewer = await requireViewer(`/invite/${token}`);
  return <main className="invite-page">
    <header><Link href="/"><Wordmark /></Link><span>Signed in as {viewer.email}</span></header>
    <InvitationAccept token={token} />
  </main>;
}
