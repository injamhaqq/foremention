import type { Metadata } from "next";
import { MissingAnswerExperience } from "@/components/goat-home-experience";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Recommendation Intelligence for B2B Software",
  description:
    "Understand why competitors are being recommended, what your company can actually change, and how to verify what happened after the change.",
  path: "/",
});

export default function HomePage() {
  return <PublicShell><MissingAnswerExperience /></PublicShell>;
}
