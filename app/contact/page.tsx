import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/brand";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Contact", description: "Contact Foremention about platform access, product questions, or support." };

export default function ContactPage() {
  return <PublicShell><section className="page-hero"><div className="shell narrow-heading"><span className="eyebrow">Contact</span><h1>Start in the platform. Reach a human when you need one.</h1><p>Create a workspace, explore the platform, or email us with an account, product, or partnership question.</p></div></section><section className="section section--paper"><div className="shell contact-grid"><article><span>New to Foremention</span><h2>Build your category record.</h2><p>Start a workspace for the buyer questions, brands, and source evidence that shape your market.</p><Link className="button" href="/signup">Create workspace <Arrow /></Link></article><article><span>Product and account support</span><h2>Contact Foremention.</h2><p>Email <a href="mailto:hello@foremention.com">hello@foremention.com</a>, or sign in to continue inside your workspace.</p><Link className="button button--outline" href="/login">Sign in <Arrow /></Link></article></div></section></PublicShell>;
}
