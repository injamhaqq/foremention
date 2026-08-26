import type { Metadata } from "next";
import "./globals.css";
import "./product-polish.css";
import "./accessibility-hardening.css";
import "./public-trust-funnel.css";
import "./evidence-standard.css";
import "./evidence-standard-home.css";
import "./evidence-standard-auth.css";
import "./evidence-standard-auth-a11y.css";
import "./canonical-brand.css";
import "./registered-evidence.css";
import { AuthHashRedirect } from "../components/auth-hash-redirect";
import { SentryClient } from "../components/sentry-client";
import { PostHogAnalytics } from "../components/posthog-analytics";
import { PublicActivationAnalytics } from "../components/public-activation-analytics";
import { ContentsquareAnalytics } from "../components/contentsquare-analytics";
import { SITE_URL, SOCIAL_IMAGE } from "../lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Foremention - Recommendation Intelligence", template: "%s - Foremention" },
  description: "Recommendation intelligence for B2B software: inspect observed AI recommendations, returned evidence, review state, and comparable change over time.",
  applicationName: "Foremention",
  authors: [{ name: "Foremention", url: SITE_URL }],
  creator: "Foremention",
  publisher: "Foremention",
  category: "Recommendation intelligence software",
  openGraph: { title: "Foremention - Recommendation intelligence for B2B software", description: "Inspect what AI-mediated buyers were shown, what evidence came back, and what can safely be acted on.", url: SITE_URL, type: "website", siteName: "Foremention", images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "Foremention recommendation intelligence platform" }] },
  twitter: { card: "summary_large_image", title: "Foremention - Recommendation intelligence for B2B software", description: "Inspect observed recommendations, returned evidence, review state, and comparable change.", images: [SOCIAL_IMAGE] },
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
        description: "Recommendation intelligence for B2B software: observed AI recommendations, returned evidence, human review, competitor context, and comparable later measurement.",
      },
    ],
  };
  return <html lang="en" data-scroll-behavior="smooth"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /></head><body><AuthHashRedirect /><SentryClient /><PostHogAnalytics /><PublicActivationAnalytics /><ContentsquareAnalytics />{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
