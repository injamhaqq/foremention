import type { Metadata } from "next";
import "./globals.css";
import "./product-polish.css";
import "./accessibility-hardening.css";
import "./public-trust-funnel.css";
import "./evidence-standard.css";
import "./evidence-standard-home.css";
import "./evidence-standard-auth.css";
import "./evidence-standard-auth-a11y.css";
import { AuthHashRedirect } from "../components/auth-hash-redirect";
import { SentryClient } from "../components/sentry-client";
import { PostHogAnalytics } from "../components/posthog-analytics";
import { PublicActivationAnalytics } from "../components/public-activation-analytics";
import { ContentsquareAnalytics } from "../components/contentsquare-analytics";
import { SITE_URL, SOCIAL_IMAGE } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Foremention - Recommendation Intelligence Infrastructure", template: "%s - Foremention" },
  description: "Record the AI answers buyers see, returned citation URLs when providers supply them, competitor presence, and comparable change over time.",
  applicationName: "Foremention",
  authors: [{ name: "Foremention", url: SITE_URL }],
  creator: "Foremention",
  publisher: "Foremention",
  category: "Recommendation intelligence software",
  openGraph: { title: "Foremention - Evidence behind AI recommendation records", description: "Recommendation intelligence for buyer questions, observed AI answers, returned references, competitor evidence, and comparable change.", url: SITE_URL, type: "website", siteName: "Foremention", images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "Foremention recommendation intelligence platform" }] },
  twitter: { card: "summary_large_image", title: "Foremention - Evidence behind AI recommendation records", description: "Record observed AI answers, returned references, competitor evidence, and comparable change.", images: [SOCIAL_IMAGE] },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Foremention",
        url: "https://foremention.com",
        email: "hello@foremention.com",
        sameAs: [
          "https://www.linkedin.com/company/foremention/",
          "https://www.instagram.com/forementionhq/",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Foremention",
        url: "https://foremention.com/product",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Recommendation intelligence for AI answer monitoring, returned-source records, competitive evidence, and comparable measurement.",
      },
    ],
  };
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /></head><body><AuthHashRedirect /><SentryClient /><PostHogAnalytics /><PublicActivationAnalytics /><ContentsquareAnalytics />{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
