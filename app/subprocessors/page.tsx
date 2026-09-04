import type { Metadata } from "next";
import { PublicShell } from "@/components/public-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Service Providers & Subprocessors",
  description: "Operational transparency about the infrastructure, email, orchestration, analytics, and AI services Foremention may use to run the product.",
  path: "/subprocessors",
});

const providers = [
  {
    name: "Cloudflare",
    status: "Core",
    purpose: "Application hosting, edge delivery, runtime execution, network protection, production request handling, and Cloudflare Web Analytics browser performance measurement.",
    boundary: "Receives the network and request metadata needed to serve Foremention and browser performance data used for real-user measurement. Cloudflare documents that its Web Analytics RUM beacon does not use cookies or browser storage. Product secrets remain server-side bindings.",
  },
  {
    name: "Supabase",
    status: "Core",
    purpose: "Authentication, PostgreSQL database services, row-level access controls, and application data persistence.",
    boundary: "Stores account identifiers and workspace records required by the product. Tenant access is enforced separately from demo data.",
  },
  {
    name: "Inngest",
    status: "Core",
    purpose: "Background workflow orchestration for controlled collection and runtime service probes.",
    boundary: "Receives the bounded job/event metadata needed to execute registered workflows. Runtime probes contain no customer data.",
  },
  {
    name: "Resend",
    status: "Core when application email is enabled",
    purpose: "Application email such as welcome messages and the service-only production operator alert channel.",
    boundary: "Receives the recipient address and bounded email content required for the requested delivery. Operator probes contain no customer evidence.",
  },
  {
    name: "Groq",
    status: "AI provider when selected/configured",
    purpose: "AI-provider collection for buyer-question observations when the workspace and production configuration explicitly use Groq.",
    boundary: "Receives the buyer question and request context required for that provider call. Foremention stores the returned provider/model label, answer, citations, and evidence boundary separately.",
  },
  {
    name: "PostHog (US cloud)",
    status: "Limited product analytics",
    purpose: "Route and selected product-milestone measurement used to find broken journeys and improve reliability.",
    boundary: "Configured without session replay, automatic form capture, provider answers, citations, or customer evidence. Identified events, when used, rely on internal IDs rather than names or email addresses.",
  },
  {
    name: "Microsoft Clarity",
    status: "Optional after browser consent",
    purpose: "Experience analytics used to identify usability problems when a visitor explicitly accepts optional analytics.",
    boundary: "Not used to analyze passwords, form content, AI-provider answers, or customer evidence.",
  },
  {
    name: "Contentsquare",
    status: "Optional after browser consent",
    purpose: "Experience analytics used to identify usability problems when a visitor explicitly accepts optional analytics.",
    boundary: "Not used to analyze passwords, form content, AI-provider answers, or customer evidence.",
  },
] as const;

export default function SubprocessorsPage() {
  return <PublicShell>
    <section className="page-hero">
      <div className="shell narrow-heading">
        <span className="eyebrow">Operational transparency</span>
        <h1>Service providers &amp; subprocessors</h1>
        <p>Foremention uses a small set of external services to operate the product. A listed service is not automatically active for every workspace, and not every service receives every data category.</p>
      </div>
    </section>
    <section className="section section--paper">
      <div className="shell legal-copy">
        <div className="legal-summary">
          <strong>Current boundary</strong>
          <p>This is the product&apos;s operational transparency list for the controlled private beta. It is not a representation that a particular DPA, transfer mechanism, data location, certification, or enterprise contract has been agreed for every customer.</p>
        </div>
        {providers.map((provider) => <section key={provider.name}>
          <h2>{provider.name}</h2>
          <p><strong>{provider.status}.</strong> {provider.purpose}</p>
          <p>{provider.boundary}</p>
        </section>)}
        <h2>Configuration-dependent services</h2>
        <p>Authentication email is delivered through the email relay configured for Supabase Auth. The connected control plane does not expose enough information to name that underlying relay reliably here, so Foremention does not invent a vendor identity. Enterprise customers can request the then-current contractual processor list before paid activation.</p>
        <h2>Error monitoring</h2>
        <p>Sentry SDK code exists in the application, but Foremention does not represent Sentry as an active production processor until its production configuration and delivery are independently verified. The currently proven operator-alert control is the service-only application-email alert path.</p>
        <h2>AI provider changes</h2>
        <p>Additional AI providers may be supported by the product, but a provider should be treated as active for a customer only when it is configured and actually used for that workspace. Provider and model labels shown in Foremention come from the recorded collection boundary rather than a generic marketing claim.</p>
        <h2>Questions or enterprise review</h2>
        <p>For a customer-specific processor list, DPA discussion, or material provider question, contact <a href="mailto:hello@foremention.com">hello@foremention.com</a> before paid activation.</p>
      </div>
    </section>
  </PublicShell>;
}
