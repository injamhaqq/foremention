import Link from "next/link";
import { Arrow, Wordmark } from "@/components/brand";

export default function NotFound() {
  return <main className="state-page"><Wordmark /><div><span className="eyebrow">404 · source not found</span><h1>This page is outside the map.</h1><p>The link may have changed, or the source is no longer available.</p><Link className="button button--ink" href="/">Return home <Arrow /></Link></div></main>;
}
