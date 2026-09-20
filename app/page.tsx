import type { Metadata } from "next";
import { MissingAnswerExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";

const description =
  "No fake reviews. No hidden promotion. No ranking guarantees. Understand why competitors are being recommended, what your company should change next, and how to verify what happened after the change.";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B Software",
  description,
  path: "/",
});

export default function HomePage() {
  const structuredData = webPageJsonLd({
    name: "Foremention — Recommendation Intelligence for B2B Software",
    description,
    path: "/",
  });

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <MissingAnswerExperience />
    </PublicShell>
  );
}
