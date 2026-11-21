import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";
import { GOVERNING_LAW, LEGAL_CONTACT_EMAIL, legalValue, sellerSentence } from "@/lib/legal-entity";

export const metadata: Metadata = pageMetadata({
  title: "Data Processing Addendum",
  description:
    "How Foremention processes personal data on behalf of customers: roles, scope, security, subprocessors, international transfers, breach notice, deletion and audits.",
  path: "/dpa",
});

export default function DataProcessingAddendumPage() {
  return <PublicShell>
    <section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Effective October 19, 2026</span><h1>Data Processing Addendum</h1><p>This addendum applies when Foremention processes personal data on a customer&apos;s behalf while providing the service.</p></div></section>
    <article className="legal-copy shell">
      <div className="legal-summary"><strong>Plain-language summary</strong><p>You decide what personal data goes into your workspace and why. We process it only to run Foremention for you, keep it secure, use the providers listed on our Subprocessors page, tell you about a personal-data breach without undue delay, and delete or return it when you leave.</p></div>

      <h2>1. Parties and how this addendum applies</h2>
      <p>{sellerSentence()} This addendum forms part of the <Link href="/terms">Terms of service</Link> (or a signed agreement that refers to it) between us and the customer that uses Foremention (&ldquo;you&rdquo;). If this addendum conflicts with the Terms on personal data, this addendum controls.</p>

      <h2>2. Roles</h2>
      <p>For personal data in your workspace, you are the controller and we are your processor. For account, billing-contact, website and support data we use to run our own business, we are the controller, as described in our <Link href="/privacy">Privacy notice</Link>. Paddle.com, our merchant of record, is an independent controller for payment data it collects at checkout.</p>

      <h2>3. Scope of processing</h2>
      <ul>
        <li><strong>Subject matter and purpose:</strong> providing, securing and supporting Foremention, including storing buyer questions, Recommendation Records, evidence reviews, Change Specifications, workspace members and connected integrations.</li>
        <li><strong>Duration:</strong> while you use the service, plus the deletion period in section 9.</li>
        <li><strong>Data subjects:</strong> your workspace users, and people named in content you add (for example contacts in a connected CRM or names in notes).</li>
        <li><strong>Personal data:</strong> names, work email addresses, roles, account identifiers, activity logs, and any personal data you choose to include in workspace content or integrations.</li>
        <li><strong>Special categories:</strong> none are required. Do not add them, and do not put personal data in buyer questions, which are sent to our web-search and AI providers.</li>
      </ul>

      <h2>4. Our obligations</h2>
      <ul>
        <li>Process personal data only on your documented instructions, which are these terms and your use of the product, unless law requires otherwise. We will tell you if we believe an instruction breaks data-protection law.</li>
        <li>Make sure anyone authorised to process the data is bound by confidentiality.</li>
        <li>Keep appropriate technical and organisational security measures, including encrypted transport, server-side secret handling, role-based workspace access and database row-level access controls. The <Link href="/trust">Trust Center</Link> describes current controls.</li>
        <li>Help you, taking into account the nature of the processing, to respond to data-subject requests and to meet your security, breach-notice and impact-assessment duties.</li>
      </ul>

      <h2>5. Subprocessors</h2>
      <p>You authorise us to use the subprocessors listed on the <Link href="/subprocessors">Subprocessors</Link> page, including Cloudflare, Supabase, Inngest, Resend, Brave Search, Zoho Mail and the AI providers listed there. Each subprocessor processes data under its own data-processing terms with us, and we remain responsible to you for their processing of your data. We will update that page before adding or replacing a subprocessor; you can object on reasonable data-protection grounds by emailing us, and if we cannot address the objection you may stop using the affected part of the service.</p>

      <h2>6. International transfers</h2>
      <p>Our production database is hosted in the Supabase ap-northeast-2 (Seoul) region, and some subprocessors operate in the United States and other countries. Where data-protection law requires a transfer mechanism, such as Standard Contractual Clauses, we will rely on one with the relevant subprocessor or agree one with you on request.</p>

      <h2>7. Personal-data breaches</h2>
      <p>We will notify you without undue delay after becoming aware of a personal-data breach affecting your data, with the information we have about what happened, the likely effect and what we are doing about it, and we will update you as we learn more.</p>

      <h2>8. Audits and information</h2>
      <p>On reasonable written request, and no more than once a year unless a breach or a regulator requires it, we will provide the information needed to show we meet this addendum, such as answers to a security questionnaire. Any further audit must be agreed in advance, at your cost, and under confidentiality.</p>

      <h2>9. Deletion and return</h2>
      <p>When your account ends, you can export your workspace data first. We will then delete workspace personal data within a reasonable period, except where law requires us to keep it. Copies in backups are overwritten on the normal backup cycle.</p>

      <h2>10. Liability and governing law</h2>
      <p>Each party&apos;s liability under this addendum is governed by the Terms. This addendum is governed by {legalValue(GOVERNING_LAW)}, the same law as the Terms.</p>

      <h2>Contact</h2>
      <p>Send DPA questions, signed-copy requests or subprocessor objections to <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.</p>
    </article>
  </PublicShell>;
}
