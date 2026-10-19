import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

// A21 (Chat05): missing pages and invalid share/token links must not be indexed.
// Signed-in /app/* URLs use app/app/not-found.tsx inside the workspace shell.
export const metadata: Metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return <PublicShell><section className="state-page" aria-labelledby="not-found-title"><div><span className="eyebrow">404 · Page not found</span><h1 id="not-found-title">This page is outside the map.</h1><p>The link may have changed or the page no longer exists. Try one of these instead.</p><div className="hero-actions"><Link className="button button--ink" href="/">Return home <Arrow /></Link><Link className="button button--outline" href="/product">Explore platform</Link><Link className="button button--outline" href="/contact">Contact us</Link><Link className="button button--outline" href="/login">Sign in</Link></div></div></section></PublicShell>;
}
