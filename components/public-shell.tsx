import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";
import { ExperienceAnalyticsPreferences } from "@/components/contentsquare-analytics";
import { SiteMotion } from "@/components/site-motion";

const links = [
  ["/product", "Product"],
  ["/explore#free-tools", "Free tools"],
  ["/pricing", "Pricing"],
  ["/explore", "Explore"],
  ["/trust", "Trust"],
] as const;

export function PublicHeader() {
  return <header className="public-header registered-public-header canonical-public-header">
    <div className="shell public-header__inner">
      <Link className="public-header__home registered-header__wordmark" href="/" aria-label="Foremention home"><Wordmark /></Link>
      <nav className="public-nav" aria-label="Primary navigation">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <Link className="canonical-header__signin" href="/login">Sign in</Link>
        <Link data-design-partner-cta="header" className="registered-header__demo canonical-header__demo" href="/contact">Apply as Design Partner <span aria-hidden="true">→</span></Link>
      </nav>
      <details className="mobile-nav registered-mobile-nav canonical-mobile-nav">
        <summary aria-label="Open navigation"><Arrow /></summary>
        <div className="mobile-nav__panel">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/methodology">Methodology</Link>
          <Link href="/recommendation-record">Recommendation Record</Link>
          <Link href="/login">Sign in</Link>
          <Link data-design-partner-cta="mobile_header" href="/contact">Apply as Design Partner</Link>
        </div>
      </details>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer canonical-public-footer">
    <div className="shell footer-grid outreach-footer-grid">
      <div className="outreach-footer-brand">
        <Link className="footer-home-link" href="/" aria-label="Foremention home"><Wordmark /></Link>
        <p className="footer-note">Recommendation intelligence for B2B software. Understand why competitors are being recommended, what your company can actually change, and what deserves verification next.</p>
        <a className="footer-email" href="mailto:hello@foremention.com">hello@foremention.com</a>
      </div>
      <div className="footer-links outreach-footer-links">
        <div><span>Explore</span><Link href="/explore">All pages</Link><Link href="/product">Product</Link><Link href="/pricing">Pricing</Link><Link href="/#how-it-works">How it works</Link><Link href="/recommendation-record">Recommendation Record</Link></div>
        <div><span>Free tools</span><Link href="/score">AI Brand Visibility Score</Link><Link href="/prompt-check">Prompt Coverage Check</Link><Link href="/sample-report">Sample report</Link><Link href="/roi">ROI calculator</Link></div>
        <div><span>Company</span><Link href="/about">About</Link><Link href="/insights">Research &amp; evidence</Link><Link href="/partners">Partners</Link><a href="https://www.linkedin.com/company/foremention/" target="_blank" rel="noreferrer">LinkedIn</a></div>
        <div><span>Trust</span><Link href="/methodology">Methodology</Link><Link href="/standards">Standards</Link><Link href="/trust">Trust Center</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <div><span>Action</span><Link data-design-partner-cta="footer" href="/contact">Apply as Design Partner</Link><Link href="/signup">Create account</Link><Link href="/login">Sign in</Link></div>
      </div>
    </div>
    <div className="shell public-footer__utility">
      <Link href="/recommendation-intelligence">Category definition</Link>
      <Link href="/glossary">Terms &amp; definitions</Link>
      <Link href="/subprocessors">Subprocessors</Link>
      <Link href="/api-docs/webhooks">Webhook API docs</Link>
      <span className="sr-only">Analytics settings</span><ExperienceAnalyticsPreferences />
    </div>
    <div className="shell footer-bottom"><span>&copy; {new Date().getFullYear()} Foremention</span><span>Register. Prove. Prepare.</span></div>
  </footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="fm-public-shell registered-evidence-shell canonical-public-shell"><SiteMotion /><a className="skip-link" href="#main-content">Skip to content</a><div className="site-progress" aria-hidden="true"><span className="site-progress__bar" /></div><PublicHeader /><main id="main-content">{children}</main><PublicFooter /></div>;
}
