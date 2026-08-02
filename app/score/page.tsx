import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { VisibilityScoreForm } from "@/components/visibility-score-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Free AI Brand Visibility Score", description: "Run five live category questions and see how often a brand appears in one dated AI-provider collection. No signup required.", path: "/score" });

export default async function ScorePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id = "" } = await searchParams;
  return <PublicShell><section className="page-hero page-hero--mint"><div className="shell narrow-heading"><span className="eyebrow">Free live measurement</span><h1>Does AI put your brand in the category conversation?</h1><p>Foremention asks five fixed buyer questions, records whether your exact brand appears, and gives you a dated score you can inspect and share.</p></div></section><section className="section section--paper"><div className="shell narrow"><VisibilityScoreForm initialId={id} /></div></section></PublicShell>;
}
