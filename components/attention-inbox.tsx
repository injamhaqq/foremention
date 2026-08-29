import Link from "next/link";
import type { AttentionItem } from "@/lib/retention-loop";

export function AttentionInbox({ items }: { items: AttentionItem[] }) {
  return <section className="retention-panel attention-inbox" aria-labelledby="attention-inbox-title">
    <div className="retention-panel__heading">
      <div><span className="eyebrow">Attention</span><h2 id="attention-inbox-title">What needs you now.</h2></div>
      <Link href="/app/alerts">All alerts →</Link>
    </div>
    {items.length ? <div className="attention-inbox__list">{items.slice(0, 8).map((item) => <Link className={`attention-inbox__item attention-inbox__item--${item.priority}`} href={item.href} key={item.id}>
      <span className="attention-inbox__signal" aria-hidden="true" />
      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
      <b>{item.priority === "critical" ? "Now" : item.priority === "high" ? "Review" : "Open"} →</b>
    </Link>)}</div> : <div className="empty-state empty-state--compact"><p>No recorded change or review item needs attention. Foremention does not fabricate urgency when the evidence is quiet.</p></div>}
  </section>;
}
