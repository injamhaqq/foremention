# Controlled Zoho production canary

This canary proves Foremention production can send one message through its real Zoho Mail OAuth transport and correlate the reply before ordinary acquisition sending is enabled.

## Safety boundary

The canary is fail-closed and separate from customer/commercial evidence:

- `ACQUISITION_OUTREACH_PROVIDER` must be `zoho`.
- `ACQUISITION_OUTREACH_CANARY_ENABLED` must be `true`.
- `ACQUISITION_OUTREACH_CANARY_EMAIL` must be a controlled external mailbox.
- `ACQUISITION_OUTREACH_SEND_ENABLED` must remain `false` while the canary runs.
- the canary recipient must differ from the configured Zoho sender;
- the configured reply mailbox must equal the configured Zoho sender;
- the canary ledger is service-role-only and does not use `commercial_contacts`, `acquisition_reply_events`, or customer evidence tables;
- a Zoho network/5xx/identity-ambiguous send is marked `send_uncertain` and is never retried automatically;
- a canary row is atomically claimed before the provider call so overlapping cron executions cannot send the same canary twice.

## Enable verification mode

Keep ordinary sending disabled and configure:

```text
ACQUISITION_OUTREACH_PROVIDER=zoho
ACQUISITION_OUTREACH_CANARY_ENABLED=true
ACQUISITION_OUTREACH_CANARY_EMAIL=<controlled external mailbox>
ACQUISITION_OUTREACH_SEND_ENABLED=false
ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED=false
ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED=false
```

The existing `poll-acquisition-zoho-replies` Inngest cron runs every 15 minutes. In verification mode it first ensures exactly one canary exists for the deployed release and configured sender/recipient, then searches unread Zoho messages for its reply.

The canary message instructs the recipient to reply with:

```text
FOREMENTION CANARY OK
```

Reply correlation requires both:

1. the inbound sender equals the controlled canary recipient; and
2. `In-Reply-To`/`References` contains the exact Zoho provider Message-ID stored for the canary.

During verification mode, unrelated messages are ignored and cannot enter ordinary acquisition reply/customer evidence tables.

## Evidence required before enabling ordinary sending

Query `acquisition_zoho_mail_canaries` and require one row for the deployed release with:

- `status = 'reply_received'`;
- non-null `provider_message_id`;
- non-null `sent_at`;
- non-null `replied_at`.

Also confirm the release has passed the repository's required CI/security/browser/CodeQL/AI-safety checks and exact production SHA verification.

Only then disable canary mode and enable the independently verified gates:

```text
ACQUISITION_OUTREACH_CANARY_ENABLED=false
ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED=true
ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED=true
ACQUISITION_OUTREACH_SEND_ENABLED=true
```

Enabling the transport does **not** bypass Foremention's existing human approval boundary. Real acquisition drafts still require the operator approval action before the separate send action can execute.
