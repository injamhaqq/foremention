# Zoho Mail OAuth for acquisition outreach

Foremention supports Zoho Mail as an explicit, fail-closed acquisition transport. Resend remains the default until Zoho is deliberately selected and production safety gates are verified.

## Security boundary

Never commit, paste into issues/PRs, expose to browser code, or place in analytics/logs any of these values:

- `ZOHO_MAIL_CLIENT_SECRET`
- `ZOHO_MAIL_REFRESH_TOKEN`

Store them only in the production server/Cloudflare secret store used by `foremention.com`.

## 1. Identify the Zoho data center

Log in to Zoho Mail and use the domain shown in the browser. Foremention requires the Accounts and Mail endpoints to be from the same data center.

| Data center | Accounts endpoint | Mail endpoint |
| --- | --- | --- |
| US | `https://accounts.zoho.com` | `https://mail.zoho.com` |
| EU | `https://accounts.zoho.eu` | `https://mail.zoho.eu` |
| India | `https://accounts.zoho.in` | `https://mail.zoho.in` |
| Australia | `https://accounts.zoho.com.au` | `https://mail.zoho.com.au` |
| Japan | `https://accounts.zoho.jp` | `https://mail.zoho.jp` |
| Canada | `https://accounts.zohocloud.ca` | `https://mail.zohocloud.ca` |
| China | `https://accounts.zoho.com.cn` | `https://mail.zoho.com.cn` |
| UAE | `https://accounts.zoho.ae` | `https://mail.zoho.ae` |
| Saudi Arabia | `https://accounts.zoho.sa` | `https://mail.zoho.sa` |

The application rejects arbitrary hosts and mismatched Accounts/Mail regions.

## 2. Create a Zoho OAuth Self Client

Use the Zoho API Console while signed in as the mailbox owner and create a Self Client for this owner-operated server integration.

Generate authorization for only these scopes:

```text
ZohoMail.accounts.READ,ZohoMail.messages.READ,ZohoMail.messages.CREATE
```

Do not grant organization-admin scopes for this flow.

Exchange the one-time grant using the matching Zoho Accounts data-center endpoint and retain the resulting refresh token in the production secret store. Access tokens are generated at runtime from that refresh token and are never persisted by Foremention.

## 3. Find the Zoho Mail account ID and sender

Using the same OAuth identity, `GET /api/accounts` on the correct Zoho Mail data center returns the authenticated user's account IDs and mailbox/send addresses. Select the account that owns the intended outreach sender.

Before every first-touch mutation Foremention calls the specific account endpoint and refuses to send unless:

- the configured account ID matches Zoho's response;
- the account is enabled for outbound mail; and
- `ACQUISITION_OUTREACH_FROM_EMAIL` is a real mailbox/confirmed alias/send address attached to that account.

## 4. Configure production secrets/variables

Keep send disabled while configuring:

```text
ACQUISITION_OUTREACH_PROVIDER=zoho
ACQUISITION_OUTREACH_SEND_ENABLED=false
ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED=false
ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED=false
ACQUISITION_OUTREACH_FROM_EMAIL=Injam <outreach@foremention.com>
ACQUISITION_OUTREACH_REPLY_TO_EMAIL=<monitored Zoho mailbox>
ZOHO_MAIL_CLIENT_ID=<server secret/config>
ZOHO_MAIL_CLIENT_SECRET=<server secret>
ZOHO_MAIL_REFRESH_TOKEN=<server secret>
ZOHO_MAIL_ACCOUNT_ID=<Zoho account ID>
ZOHO_MAIL_ACCOUNTS_BASE_URL=<matching Accounts endpoint>
ZOHO_MAIL_API_BASE_URL=<matching Mail endpoint>
```

`EMAIL_UNSUBSCRIBE_SECRET` and the production site URL must also remain valid because every first-touch message includes Foremention's signed unsubscribe route.

## 5. Production verification before enabling sends

Do not set the verification flags merely because configuration exists. Verify all of the following with production evidence:

1. OAuth refresh succeeds without exposing the token.
2. The configured account and sender/alias resolve exactly.
3. SPF, DKIM and DMARC are configured for the sending domain.
4. A controlled delivery test reaches the intended mailbox.
5. The 15-minute Zoho reply poll retrieves a controlled reply and correlates it to the provider `Message-ID`.
6. The controlled reply creates one first-party reply event and stops future sequence activity.
7. An ambiguous Zoho send result is left stopped for manual reconciliation rather than retried.

Only after those checks should `ACQUISITION_OUTREACH_DELIVERABILITY_VERIFIED` and `ACQUISITION_OUTREACH_ZOHO_REPLY_POLLING_VERIFIED` be enabled. First-touch sending still separately requires `ACQUISITION_OUTREACH_SEND_ENABLED=true` and an explicitly approved draft.

## Provider behavior

Zoho Mail does not provide the same documented idempotency header used by the Resend transport. Foremention therefore treats network errors, provider 5xx responses, or a success response without stable message identifiers as an uncertain mutation: the enrollment is stopped and is not automatically retried.

The reply poll is read-only. It uses `ZohoMail.messages.READ`, correlates replies using `In-Reply-To`/`References`, checks the sender against the stored commercial contact, and feeds only correlated replies into the existing Foremention reply/suppression evidence path.
