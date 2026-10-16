# Chat 07 handoff — signup presentation and analytics after account-neutral API

**Source:** Chat 05 PR #597, `app/api/auth/signup/route.ts`, October 16, 2026. **Status:** UI proposal only; Chat 07 owns presentation and telemetry.

The backend now returns identical 200 JSON to eligible-new and already-registered signup attempts: `{ "ok": true, "session": false, "message": "If this email can be registered, a confirmation link will be sent. If you already have an account, sign in or reset your password." }`. It deliberately does **not** include an account email, `account_help`, or mail-delivery assertion. A genuine send failure still returns 503; an authenticated disposable mailbox test remains outstanding.

**UI issue to fix in Chat 07:** `components/auth-form.tsx` currently takes any `session:false` as confirmed delivery: it fires `signup_completed`, shows `Confirm your email`, and says `Open the newest email`. For a deliberate neutral/duplicate response, those assertions are false and could imply account enumeration. Replace with a neutral `Request received` state that quotes the conditional message, offers `Sign in` and `Reset password`, does not claim mail actually arrived, and records only `signup_requested` or another approved, non-commercial event if one exists. **Do not mint unapproved analytics events without schema owner.** Separate real confirmed-account activation from request success; `signup_completed` requires server-backed truth.

The helper `signupRequestReceipt()` is used for both GoTrue `alreadyRegistered`, native Supabase obfuscated identities, and eligible registration response. Preserve timing/rate-limit provider safeguards; test browser redirect states and screen-reader alerts after Chat 07 updates.

**Coordination:** Changes to `components/auth-form.tsx` belong to Chat 07; do not overlap writes from Chat 05. Integration remains draft until both sides are reviewed and CI passes at exact SHA.