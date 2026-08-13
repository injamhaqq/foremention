import { PendingSubmitButton } from "@/components/pending-submit-button";

export function SessionSecurity({ demo, globalError }: { demo: boolean; globalError: boolean }) {
  if (demo) {
    return <div className="empty-state empty-state--compact">
      <p>Session controls are disabled in the fictional demo because there is no real Supabase account session to revoke.</p>
    </div>;
  }

  return <>
    {globalError && <p className="inline-notice" role="status">Foremention could not confirm all-device sign-out. Your current browser session was preserved so you can retry instead of receiving a false success message.</p>}
    <p>Use <strong>Sign out this device</strong> for the browser in front of you. Use <strong>Sign out all devices</strong> if you lost a device or want to revoke every Supabase refresh session for your account.</p>
    <div className="settings-actions">
      <form action="/api/auth/logout" method="post">
        <PendingSubmitButton idle="Sign out this device" pending="Signing out…" />
      </form>
      <form action="/api/auth/logout-all" method="post">
        <PendingSubmitButton className="button button--outline" idle="Sign out all devices" pending="Revoking sessions…" />
      </form>
    </div>
    <p className="table-caption">All-device sign-out revokes affected refresh sessions immediately. Already-issued access-token JWTs on another device can remain valid until their encoded expiry, so Foremention does not describe this control as instant access-token invalidation.</p>
  </>;
}
