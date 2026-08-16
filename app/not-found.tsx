import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export default function NotFound() {
  return <PublicShell><section className="state-page"><div><span className="eyebrow">404 · source not found</span><h1>This page is outside the map.</h1><p>The link may have changed, or the source is no longer available.</p><div className="hero-actions"><Link className="button button--ink" href="/">Return home <Arrow /></Link><Link className="button button--outline" href="/product">Explore platform</Link></div></div></section></PublicShell>;
}
