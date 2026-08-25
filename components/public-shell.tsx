import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";
import { ExperienceAnalyticsPreferences } from "@/components/contentsquare-analytics";
import { SiteMotion } from "@/components/site-motion";

const links = [
  ["/product", "Product"],
  ["/source-map", "Evidence"],
  ["/methodology", "Method"],
  ["/insights", "Insights"],
] as const;

export function PublicHeader() {
  return <header className="public-header"><div className="shell public-header__inner"><Wordmark /><nav className="public-nav" aria-label="Primary navigation">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/login">Sign in</Link><Link className="button button--small button--ink" href="/signup">Create workspace <Arrow /></Link></nav><details className="mobile-nav"><summary aria-label="Open navigation">Menu</summary><div className="mobile-nav__panel">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}<Link href="/login">Sign in</Link><Link href="/signup">Create workspace</Link></div></details></div></header>;
}

export function PublicFooter() {
  return <footer className="public-footer"><div className="shell footer-grid"><div><Wordmark inverse /><p className="footer-note">Recommendation intelligence for B2B SaaS teams that need to inspect what AI systems recommended, what evidence was returned, and what changed later.</p><a className="footer-email" href="mailto:hello@foremention.com">hello@foremention.com</a></div><div className="footer-links"><div><span>Product</span><Link href="/product">Product</Link><Link href="/source-map">Evidence</Link><Link href="/methodology">Method</Link><Link href="/pricing">Pricing</Link><Link href="/standards">Standards</Link></div><div><span>Company</span><Link href="/about">About</Link><Link href="/insights">Insights</Link><Link href="/contact">Contact</Link></div><div><span>Legal / Trust</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/subprocessors">Subprocessors</Link><ExperienceAnalyticsPreferences /></div><div><span>Follow</span><a href="https://www.linkedin.com/company/foremention/" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://www.instagram.com/forementionhq/" target="_blank" rel="noreferrer">Instagram</a></div></div></div><div className="shell footer-bottom"><span>&copy; {new Date().getFullYear()} Foremention</span><span>Evidence before theatre. Measured records. Clear limits.</span></div></footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="fm-public-shell"><SiteMotion /><a className="skip-link" href="#main-content">Skip to content</a><div className="site-progress" aria-hidden="true"><span className="site-progress__bar" /></div><PublicHeader /><main id="main-content">{children}</main><PublicFooter /></div>;
}
