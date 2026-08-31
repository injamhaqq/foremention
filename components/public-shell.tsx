import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";
import { ExperienceAnalyticsPreferences } from "@/components/contentsquare-analytics";
import { SiteMotion } from "@/components/site-motion";

const links = [
  ["/product", "Product"],
  ["/recommendation-intelligence", "Category"],
  ["/methodology", "Methodology"],
  ["/insights", "Research"],
  ["/glossary", "Glossary"],
  ["/partners", "Partners"],
] as const;

export function PublicHeader() {
  return <header className="public-header registered-public-header canonical-public-header">
    <div className="shell public-header__inner">
      <span className="registered-header__wordmark"><Wordmark /></span>
      <nav className="public-nav" aria-label="Primary navigation">
        {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <Link className="canonical-header__signin" href="/login">Sign in</Link>
        <Link className="registered-header__demo canonical-header__demo" href="/contact">Request a demo <span aria-hidden="true">→</span></Link>
      </nav>
      <details className="mobile-nav registered-mobile-nav canonical-mobile-nav">
        <summary aria-label="Open navigation"><Arrow /></summary>
        <div className="mobile-nav__panel">
          {links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
          <Link href="/login">Sign in</Link>
          <Link href="/contact">Request a demo</Link>
        </div>
      </details>
    </div>
  </header>;
}

export function PublicFooter() {
  return <footer className="public-footer canonical-public-footer"><div className="shell footer-grid"><div><Wordmark /><p className="footer-note">Recommendation intelligence for B2B software. Inspect what AI-mediated buyers were shown, what evidence came back, and what can safely be acted on.</p><a className="footer-email" href="mailto:hello@foremention.com">hello@foremention.com</a></div><div className="footer-links"><div><span>Product</span><Link href="/product">Product</Link><Link href="/recommendation-record">Recommendation Record</Link><Link href="/recommendation-intelligence">Category</Link><Link href="/methodology">Methodology</Link></div><div><span>Research / Company</span><Link href="/insights">Research</Link><Link href="/glossary">Glossary</Link><Link href="/partners">Partners</Link><Link href="/about">About</Link><Link href="/contact">Request a demo</Link></div><div><span>Trust</span><Link href="/trust">Trust Center</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/subprocessors">Subprocessors</Link><ExperienceAnalyticsPreferences /></div><div><span>Access</span><Link href="/login">Sign in</Link><Link href="/signup">Design-partner workspace</Link><a href="https://www.linkedin.com/company/foremention/" target="_blank" rel="noreferrer">LinkedIn</a></div></div></div><div className="shell footer-bottom"><span>&copy; {new Date().getFullYear()} Foremention</span><span>Register. Prove. Prepare.</span></div></footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className="fm-public-shell registered-evidence-shell canonical-public-shell"><SiteMotion /><a className="skip-link" href="#main-content">Skip to content</a><div className="site-progress" aria-hidden="true"><span className="site-progress__bar" /></div><PublicHeader /><main id="main-content">{children}</main><PublicFooter /></div>;
}
