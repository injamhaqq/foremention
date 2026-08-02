export type CustomerQuote = { quote: string; person: string; role: string; company: string; evidenceUrl: string; verified: boolean };
export type CustomerLogo = { name: string; imagePath: string; permissionEvidenceUrl: string; verified: boolean };
export type CaseStudy = { title: string; summary: string; href: string; evidenceUrl: string; verified: boolean };

// PLACEHOLDER records are deliberately incomplete and cannot render. Replace
// them only after the customer approves the exact public wording and logo use.
export const customerQuotes: CustomerQuote[] = [
  { quote: "PLACEHOLDER", person: "PLACEHOLDER", role: "PLACEHOLDER", company: "PLACEHOLDER", evidenceUrl: "", verified: false },
  { quote: "PLACEHOLDER", person: "PLACEHOLDER", role: "PLACEHOLDER", company: "PLACEHOLDER", evidenceUrl: "", verified: false },
  { quote: "PLACEHOLDER", person: "PLACEHOLDER", role: "PLACEHOLDER", company: "PLACEHOLDER", evidenceUrl: "", verified: false },
];
export const customerLogos: CustomerLogo[] = [
  { name: "PLACEHOLDER", imagePath: "", permissionEvidenceUrl: "", verified: false },
  { name: "PLACEHOLDER", imagePath: "", permissionEvidenceUrl: "", verified: false },
  { name: "PLACEHOLDER", imagePath: "", permissionEvidenceUrl: "", verified: false },
];
export const caseStudies: CaseStudy[] = [{ title: "PLACEHOLDER", summary: "PLACEHOLDER", href: "", evidenceUrl: "", verified: false }];

export function verifiedSocialProof() {
  const quotes = customerQuotes.filter((item) => item.verified && item.quote !== "PLACEHOLDER" && item.evidenceUrl.startsWith("https://"));
  const logos = customerLogos.filter((item) => item.verified && item.name !== "PLACEHOLDER" && item.imagePath.startsWith("/") && item.permissionEvidenceUrl.startsWith("https://"));
  const studies = caseStudies.filter((item) => item.verified && item.title !== "PLACEHOLDER" && item.href.startsWith("/") && item.evidenceUrl.startsWith("https://"));
  return { quotes, logos, studies, ready: quotes.length >= 3 && logos.length >= 3 && studies.length >= 1 };
}
