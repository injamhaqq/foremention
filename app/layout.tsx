import type { Metadata } from "next";
import "./globals.css";
import "./product-polish.css";
import "./accessibility-hardening.css";
import "./public-trust-funnel.css";
import "./evidence-standard.css";
import "./evidence-standard-home.css";
import { AuthHashRedirect } from "../components/auth-hash-redirect";
import { SentryClient } from "../components/sentry-client";
import { PostHogAnalytics } from "../components/posthog-analytics";
import { PublicActivationAnalytics } from "../components/public-activation-analytics";
import { ContentsquareAnalytics } from "../components/contentsquare-analytics";
import { SITE_URL, SOCIAL_IMAGE } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Foremention - Recommendation Intelligence Infrastructure", template: "%s - Foremention" },
  description: "Track the AI answers buyers see, the exact webpages supporting them, the competitors being recommended, and what changes over time.",
  applicationName: "Foremention",
  authors: [{ name: "Foremention", url: SITE_URL }],
  creator: "Foremention",
  publisher: "Foremention",
  category: "AI visibility and recommendation intelligence software",
  openGraph: { title: "Foremention - Know why AI recommends them", description: "Recommendation intelligence for buyer questions, AI answers, exact sources, competitors, and change.", url: SITE_URL, type: "website", siteName: "Foremention", images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "Foremention recommendation intelligence platform" }] },
  twitter: { card: "summary_large_image", title: "Foremention - Know why AI recommends them", description: "Track AI answers, exact sources, competitors, and change.", images: [SOCIAL_IMAGE] },
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
        description: "Self-serve recommendation intelligence for AI answer monitoring, exact-source mapping, competitive analytics, and change tracking.",
      },
    ],
  };
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /></head><body><AuthHashRedirect /><SentryClient /><PostHogAnalytics /><PublicActivationAnalytics /><ContentsquareAnalytics />{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
