import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://foremention.com"),
  title: { default: "Foremention - Recommendation Intelligence Infrastructure", template: "%s - Foremention" },
  description: "Track the AI answers buyers see, the exact webpages supporting them, the competitors being recommended, and what changes over time.",
  keywords: ["AI visibility", "AI recommendation monitoring", "generative engine optimization", "AI citations", "source intelligence", "brand monitoring"],
  openGraph: { title: "Foremention - Know why AI recommends them", description: "Recommendation intelligence for buyer questions, AI answers, exact sources, competitors, and change.", type: "website", siteName: "Foremention", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Foremention recommendation intelligence platform" }] },
  twitter: { card: "summary_large_image", title: "Foremention - Know why AI recommends them", description: "Track AI answers, exact sources, competitors, and change.", images: ["/og.png"] },
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
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description: "Self-serve recommendation intelligence for AI answer monitoring, exact-source mapping, competitive analytics, and change tracking.",
        offers: [{ "@type": "Offer", name: "Free beta", price: "0", priceCurrency: "USD" }],
      },
    ],
  };
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
