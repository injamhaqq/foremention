import type { OperatorSupportTicket } from "@/lib/agent-os/support";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recorded" : new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function SupportOperatorInbox({ tickets }: { tickets: OperatorSupportTicket[] }) {
  return <section className="agent-plane">
    <header className="agent-plane__header">
      <div>
        <span className="eyebrow">Customer support</span>
        <h2>Open support requests</h2>
        <p>Persisted customer requests remain visible here even when Agent OS reasoning is disabled or unavailable.</p>
      </div>
      <div className="agent-plane__telemetry"><span>Open tickets</span><strong>{tickets.length}</strong></div>
    </header>
    <div className="agent-plane__grid">
      {tickets.slice(0, 12).map((ticket) => <article className="agent-card agent-card--review" key={ticket.id}>
        <div className="agent-card__top"><span>{ticket.category.replaceAll("_", " ")}</span><strong>{ticket.status.replaceAll("_", " ")}</strong></div>
        <h3>{ticket.subject}</h3>
        <p>{ticket.message}</p>
        <div className="agent-card__metrics">
          <div><span>Requester</span><strong>{ticket.requesterEmail}</strong></div>
          <div><span>Received</span><strong>{dateLabel(ticket.createdAt)}</strong></div>
        </div>
      </article>)}
    </div>
    {!tickets.length && <div className="evidence-note"><strong>No open support requests</strong><p>New customer-created tickets will appear here immediately after they are persisted.</p></div>}
  </section>;
}
