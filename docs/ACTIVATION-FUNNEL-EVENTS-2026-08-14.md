# Activation funnel event contract — 2026-08-14

Foremention uses the existing privacy-minimized PostHog integration to measure the customer activation loop. This document defines product milestones, not customer evidence.

## Canonical activation sequence

1. `score_viewed` — `/score` was rendered. Property: `shared_result` only.
2. `score_started` — a visitor submitted a new public live score request.
3. `score_completed` — that submitted public score rendered successfully. Property: fixed `question_count` only.
4. `score_monitor_clicked` — the visitor chose **Monitor your category**.
5. `signup_started` — signup began through the email form or Google entry point. Property: bounded `method` (`email` or `google`) only.
6. `signup_completed` — the existing email auth flow accepted account creation; `confirmation_required` distinguishes email-confirmation flow from immediate session creation.
7. `auth_session_established` — a non-demo authenticated session reached the protected workspace. Property: bounded `entry_surface` only. This provides an auth-method-independent downstream success milestone, including OAuth.
8. `onboarding_started` — the authenticated onboarding route was reached.
9. `onboarding_completed` — workspace setup was saved.
10. `collection_started` — a real collection was queued under existing provider, quota, cost, and idempotency controls.
11. `collection_completed` — a collection reached `review`, `complete`, or `partial`; status is preserved as a bounded property.
12. `ai_result_viewed` — a real run detail containing at least one persisted answer was viewed.
13. `citation_result_viewed` — that run detail contained at least one provider-returned citation link.
14. `source_xray_viewed` — an authenticated non-demo source detail was viewed.
15. `evidence_reviewed` — existing run/source human-review milestone.
16. `reviewed_opportunity_created` — the source-review API created a new opportunity; refreshes do not count as first opportunity creation.

Repeat `collection_started` / `collection_completed` events for the same identified user or organization provide the basis for measuring return behavior without inventing a separate retention score.

## Privacy boundary

Analytics must not receive prompts, answers, citations, source page content, raw URLs, email addresses, names, passwords, tokens, secrets, messages, or other customer evidence content. `lib/product-analytics.ts` enforces the existing sensitive-property-key denylist. Demo workspaces do not emit authenticated activation milestones.

Route IDs may be used only inside browser-local `sessionStorage` keys for deduplication; they are not sent as event properties.

## Interpretation

These events measure product behavior, not customer outcomes. They do not prove revenue, recommendation lift, causation, or business impact. Funnel conversion or retention claims require real observed event data after deployment.
