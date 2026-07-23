import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Contact", description: "Start a Foremention Source Gap Check, open the product, or contact support." };

export default function ContactPage() {
  return <PublicShell><section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Contact</span><h1>Start in the product. Reach a human when you need one.</h1><p>Run a free Source Gap Check, open the seeded product demo, or email us with an account or platform question.</p></div></section><section className="section section--paper"><div className="shell contact-grid"><article><span>New to Foremention</span><h2>Find your first source gap.</h2><p>Enter your website, category, one buyer question, and the competitors that currently own the shortlist.</p><Link className="button" href="/source-gap">Start the free check <Arrow /></Link></article><article><span>Product and account support</span><h2>Contact Foremention.</h2><p>Email <a href="mailto:hello@foremention.com">hello@foremention.com</a>, or sign in to continue inside your workspace.</p><Link className="button button--outline" href="/login">Open the product <Arrow /></Link></article></div></section></PublicShell>;
}
