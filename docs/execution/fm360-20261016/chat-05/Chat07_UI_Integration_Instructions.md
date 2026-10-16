# Chat07 prepared auth form replacement (not applied to app)

The adjacent `auth-form.replacement.tsx.txt` is a complete, correctly scoped
replacement for `components/auth-form.tsx` based on GitHub main
`6bf8bfda6ec0573dbbf432b831eff45688f8f47b` and Chat05 PR #597.
It deliberately lives under documentation because Chat 07 owns presentation.

Changes:
- Conditional signup receipts are never interpreted as confirmed delivery.
- Do not fire `signup_completed` for `session:false`.
- Do not echo email in neutral signup success state.
- Show "Request received" and conditional instructions with sign-in/recovery links.
- Preserve the existing login form, input validation, safe redirect, focus, and screen-reader status.

Review against any newer Chat 07 auth-form edits before replacing; do not
overwrite its live branch or claim the UI is deployed. Add browser tests for
new/known account/failed email responses, 320/375px, and screen-reader flow.
