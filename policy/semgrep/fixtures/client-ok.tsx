"use client";
// Fixture: compliant — must NOT be flagged.
export function Fine() {
  return <div data-site={process.env.NEXT_PUBLIC_SITE_URL} />;
}
