import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";
import { ExperienceAnalyticsPreferences } from "@/components/contentsquare-analytics";
import { SiteMotion } from "@/components/site-motion";

const links = [
  ["/product", "Product"],
  ["/use-cases", "Use cases"],
  ["/pricing", "Pricing"],
  ["/insights", "Research"],
  ["/trust", "Trust"],
] as const;

export function PublicHeader() {
  return <header className="public-header registered-public-header canonical-public-header">
    <div className="shell public-header__inner">
      <span className="registered-header__wordmark"><Wordmark /></span>
      <nav className="public-nav" aria-label="Primary navigation">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <Link className="canonical-header__signin" href="/login">Sign in</Link>
        <Link data-design-partner-cta="header" className="registered-header__demo canonical-header__demo" href="/contact">Request a pilot <span aria-hidden="true">→</span></Link>
      </nav>
      <details className="mobile-nav registered-mobile-nav canonical-mobile-nav">
        <summary aria-label="Site navigation"><Arrow /></summary>
        <div className="mobile-nav__panel">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/explore">Explore Foremention</Link>
          <Link href="/login">Sign in</Link>
          <Link data-design-partner-cta="mobile_header" href="/contact">Request a pilot</Link>
        </div>
      </details>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer canonical-public-footer">
    <div className="shell footer-grid outreach-footer-grid">
      <div className="outreach-footer-brand">
        <Wordmark />
        <p className="footer-note">Recommendation intelligence for B2B software. Understand why competitors are being recommended, what your company can actually change, and what deserves verification next.</p>
        <a className="footer-email" href="mailto:hello@foremention.com">hello@foremention.com</a>
      </div>
      <div className="footer-links outreach-footer-links">
        <div><span>Product</span><Link href="/explore">Explore Foremention</Link><Link href="/product">Product</Link><Link href="/use-cases">Use cases</Link><Link href="/#how-it-works">How it works</Link><Link href="/recommendation-record">Recommendation Record</Link><Link href="/methodology">Methodology</Link></div>
        <div><span>Company</span><Link href="/about">About</Link><Link href="/insights">Research &amp; evidence</Link><a href="https://www.linkedin.com/company/foremention/" target="_blank" rel="noreferrer">LinkedIn</a></div>
        <div><span>Trust</span><Link href="/trust">Trust Center</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div>
        <div><span>Action</span><Link data-design-partner-cta="footer" href="/contact">Request a pilot</Link><Link href="/login">Sign in</Link></div>
      </div>
    </div>
    <div className="shell public-footer__utility">
      <Link href="/recommendation-intelligence">Category definition</Link>
      <Link href="/glossary">Glossary</Link>
      <Link href="/subprocessors">Subprocessors</Link>
      <span className="sr-only">Analytics settings</span><ExperienceAnalyticsPreferences />
    </div>
    <div className="shell footer-bottom"><span>&copy; {new Date().getFullYear()} Foremention</span><span>Register. Prove. Prepare.</span></div>
  </footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="fm-public-shell registered-evidence-shell canonical-public-shell"><SiteMotion /><a className="skip-link" href="#main-content">Skip to content</a><div className="site-progress" aria-hidden="true"><span className="site-progress__bar" /></div><PublicHeader /><main id="main-content">{children}</main><PublicFooter /></div>;
}
