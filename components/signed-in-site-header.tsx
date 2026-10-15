import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";

export type SiteHeaderAccount = { name: string; email: string; demo?: boolean };

const links = [
  ["/app", "Overview"],
  ["/app/runs", "Records"],
  ["/pricing", "Pricing"],
  ["/app/settings#billing", "Billing"],
] as const;

/**
 * Header for public pages (pricing, payment) when a session exists. It replaces
 * the marketing "Sign in" / "Request a pilot" actions with the signed-in
 * account and a way back into the workspace.
 */
export function SignedInSiteHeader({ account }: { account: SiteHeaderAccount }) {
  const initial = (account.name || account.email || "?").slice(0, 1).toUpperCase();
  return <header className="public-header registered-public-header canonical-public-header" data-signed-in-header="true">
    <div className="shell public-header__inner">
      <span className="registered-header__wordmark"><Wordmark /></span>
      <nav className="public-nav" aria-label="Signed-in navigation">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <span className="canonical-header__signin" title={account.email} aria-label={`Signed in as ${account.email}`}>
          <span aria-hidden="true">{initial}</span> {account.demo ? "Demo workspace" : account.email}
        </span>
        <Link className="registered-header__demo canonical-header__demo" href="/app">Open workspace <span aria-hidden="true">→</span></Link>
      </nav>
      <details className="mobile-nav registered-mobile-nav canonical-mobile-nav">
        <summary aria-label="Site navigation"><Arrow /></summary>
        <div className="mobile-nav__panel">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/app">Open workspace</Link>
          <span>Signed in as {account.demo ? "Demo workspace" : account.email}</span>
        </div>
      </details>
    </div>
  </header>;
}
