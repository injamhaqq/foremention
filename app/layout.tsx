import type { Metadata } from "next";
import "./globals.css";
import { AuthHashRedirect } from "../components/auth-hash-redirect";
import { SentryClient } from "../components/sentry-client";
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
          "https://x.com/forementionhq",
          "https://www.instagram.com/forementionhq/",
          "https://www.facebook.com/foremention/",
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: "Foremention",
        url: "https://foremention.com/product",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Self-serve recommendation intelligence for AI answer monitoring, exact-source mapping, competitive analytics, and change tracking.",
        offers: [
          { "@type": "Offer", name: "Foremention Core", price: "149", priceCurrency: "USD", url: "https://foremention.com/pricing" },
          { "@type": "Offer", name: "Foremention Signal", price: "499", priceCurrency: "USD", url: "https://foremention.com/pricing" },
        ],
      },
    ],
  };
  return <html lang="en" data-scroll-behavior="smooth"><body><AuthHashRedirect /><SentryClient />{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
